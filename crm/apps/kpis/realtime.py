import logging
from datetime import date

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.kpis.auto_calculation import calculate_auto_kpis_for_user, get_default_kpi_users
from apps.kpis.models import KpiPeriod, KpiProfile
from apps.kpis.summary_calculation import calculate_kpi_summaries

logger = logging.getLogger(__name__)


def _get_user(user_id):
    if not user_id:
        return None

    User = get_user_model()

    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return None


def _get_periods_by_call_date(call_date_value):
    if not call_date_value:
        return KpiPeriod.objects.none()

    return (
        KpiPeriod.objects.filter(
            start_date__lte=call_date_value,
            end_date__gte=call_date_value,
        )
        .exclude(status=KpiPeriod.STATUS_CLOSED)
        .order_by("start_date", "id")
    )


def _get_user_role_codes(user):
    if not user:
        return set()

    return set(
        user.user_roles.select_related("role")
        .values_list("role__role_code", flat=True)
    )


def _resolve_profile_for_user(period, user):
    role_codes = _get_user_role_codes(user)

    sa_sup_codes = {
        KpiProfile.TARGET_ROLE_SA_SUP,
        "SA_SUP",
        "SALE_ADMIN_SUPERVISOR",
    }

    profile_code = (
        KpiProfile.PROFILE_SA_SUP
        if role_codes.intersection(sa_sup_codes)
        else KpiProfile.PROFILE_SA
    )

    return KpiProfile.objects.filter(
        period=period,
        profile_code=profile_code,
        is_active=True,
    ).first()


def _safe_calculate_summary(period, profile, user, changed_by_user):
    """Refresh summary but stay compatible with older summary function signatures."""
    try:
        calculate_kpi_summaries(
            period=period,
            profile=profile,
            user=user,
            calculated_by_user=changed_by_user,
        )
        return
    except TypeError:
        pass

    try:
        calculate_kpi_summaries(
            period=period,
            user=user,
            calculated_by_user=changed_by_user,
        )
    except TypeError:
        calculate_kpi_summaries(period=period, user=user)


def _recalculate_user_kpi(period, user, changed_by_user):
    if not user:
        return

    profile = _resolve_profile_for_user(period, user)

    if not profile:
        logger.info(
            "Skip KPI recalculation: no active KPI profile for user=%s period=%s",
            user.pk,
            period.pk,
        )
        return

    calculate_auto_kpis_for_user(
        period=period,
        user=user,
        profile=profile,
        calculated_by_user=changed_by_user,
    )

    _safe_calculate_summary(
        period=period,
        profile=profile,
        user=user,
        changed_by_user=changed_by_user,
    )


def _get_user_branch_id(user):
    employee = getattr(user, "employee", None)

    if employee and getattr(employee, "branch_id", None):
        return employee.branch_id

    return None


def _recalculate_branch_supervisor_kpi(period, user, changed_by_user):
    """When an SA record changes, refresh SA_SUP KPI for supervisors in that branch."""
    branch_id = _get_user_branch_id(user)

    if not branch_id:
        return

    supervisor_profile = KpiProfile.objects.filter(
        period=period,
        profile_code=KpiProfile.PROFILE_SA_SUP,
        is_active=True,
    ).first()

    if not supervisor_profile:
        return

    supervisors = get_default_kpi_users(
        profile=supervisor_profile,
        branch_id=branch_id,
    )

    for supervisor in supervisors:
        calculate_auto_kpis_for_user(
            period=period,
            user=supervisor,
            profile=supervisor_profile,
            calculated_by_user=changed_by_user,
        )

        _safe_calculate_summary(
            period=period,
            profile=supervisor_profile,
            user=supervisor,
            changed_by_user=changed_by_user,
        )


def recalculate_kpi_for_user_and_date(*, user_id, call_date_value, changed_by_user_id=None):
    user = _get_user(user_id)

    if not user or not call_date_value:
        return

    changed_by_user = _get_user(changed_by_user_id)

    for period in _get_periods_by_call_date(call_date_value):
        try:
            _recalculate_user_kpi(period, user, changed_by_user)
            _recalculate_branch_supervisor_kpi(period, user, changed_by_user)
        except Exception:
            logger.exception(
                "Failed to recalculate KPI after SA Record change. user_id=%s date=%s period_id=%s",
                user_id,
                call_date_value,
                period.pk,
            )


def recalculate_kpi_after_sa_record_change(
    *,
    record_id=None,
    previous_pic_user_id=None,
    previous_call_date=None,
    changed_by_user_id=None,
):
    """
    Recalculate KPI results affected by an SA Record create/update/delete.

    - New/current record updates the current PIC/date KPI.
    - Previous PIC/date is also recalculated when a record is moved to another PIC/date.
    - Branch supervisor KPI is refreshed after each affected SA recalculation.
    """
    affected_pairs = set()

    if previous_pic_user_id and previous_call_date:
        affected_pairs.add((previous_pic_user_id, previous_call_date))

    if record_id:
        from apps.sale_admin.models import SaRecord

        try:
            record = SaRecord.objects.only("id", "pic_user_id", "call_date").get(pk=record_id)
        except SaRecord.DoesNotExist:
            record = None

        if record and record.pic_user_id and record.call_date:
            affected_pairs.add((record.pic_user_id, record.call_date))

    for user_id, call_date_value in affected_pairs:
        recalculate_kpi_for_user_and_date(
            user_id=user_id,
            call_date_value=call_date_value,
            changed_by_user_id=changed_by_user_id,
        )


def schedule_kpi_recalculation_after_sa_record_change(
    *,
    record_id=None,
    previous_pic_user_id=None,
    previous_call_date=None,
    changed_by_user_id=None,
):
    """Run KPI recalculation only after the SA Record transaction is committed."""

    transaction.on_commit(
        lambda: recalculate_kpi_after_sa_record_change(
            record_id=record_id,
            previous_pic_user_id=previous_pic_user_id,
            previous_call_date=previous_call_date,
            changed_by_user_id=changed_by_user_id,
        )
    )
