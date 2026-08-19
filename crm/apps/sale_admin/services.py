from django.utils import timezone

from apps.sale_admin.models import SaRecord, SaRecordAuditLog


def generate_sa_record_code():
    today = timezone.localdate()
    prefix = f"SA{today.strftime('%Y%m%d')}"

    last_record = (
        SaRecord.objects.filter(record_code__startswith=prefix)
        .order_by("-record_code")
        .first()
    )

    if not last_record:
        return f"{prefix}0001"

    last_number = int(last_record.record_code[-4:])
    next_number = last_number + 1

    return f"{prefix}{next_number:04d}"

def serialize_sa_record(record):
    return {
        "id": record.id,
        "record_code": record.record_code,
        "account_no": record.account_no,

        "customer_name_snapshot": record.customer_name_snapshot,
        "branch_name_snapshot": record.branch_name_snapshot,
        "pic_name_snapshot": record.pic_name_snapshot,
        "account_status": record.account_status,
        "vip_classification": record.vip_classification,

        "customer_account_id": record.customer_account_id,
        "customer_id": record.customer_id,
        "company_id": record.company_id,
        "branch_id": record.branch_id,

        "customer_name": record.customer.full_name if record.customer else None,
        "company_name": record.company.company_name if record.company else None,
        "branch_name": record.branch.branch_name if record.branch else None,

        "pic_user_name": (
            getattr(getattr(record.pic_user, "employee", None), "full_name", None)
            or (record.pic_user.get_full_name().strip() if record.pic_user and record.pic_user.get_full_name() else None)
            or (record.pic_user.username if record.pic_user else None)
        ),
        "pic_employee_name": (
            getattr(record.pic_employee, "full_name", None)
            or getattr(getattr(record.pic_user, "employee", None), "full_name", None)
            if record.pic_employee or record.pic_user
            else None
        ),

        "call_date": record.call_date.isoformat() if record.call_date else None,
        "follow_no": record.follow_no,

        "call_result_id": record.call_result_id,
        "call_result_name": (
            record.call_result.result_name if record.call_result else None
        ),

        "interest_level_id": record.interest_level_id,
        "interest_level_name": (
            record.interest_level.level_name if record.interest_level else None
        ),

        "icp_group_id": record.icp_group_id,
        "icp_group_code": record.icp_group.icp_code if record.icp_group else None,
        "icp_group_name": record.icp_group.icp_name if record.icp_group else None,
        "icp_group_type": record.icp_group.icp_type if record.icp_group else None,

        "reactivation": record.reactivation,
        "reactivation_confirmed_at": (
            record.reactivation_confirmed_at.isoformat()
            if record.reactivation_confirmed_at
            else None
        ),

        "introduced_product": record.introduced_product,
        "support_info": record.support_info,
        "referred_rm": record.referred_rm,

        "handover_to_broker": record.handover_to_broker,
        "broker_user_id": record.broker_user_id,
        "broker_employee_id": record.broker_employee_id,
        "broker_user_name": (
            record.broker_user.get_full_name()
            or record.broker_user.username
            or record.broker_user.email
            if record.broker_user
            else None
        ),
        "broker_employee_name": (
            getattr(record.broker_employee, "full_name", None)
            if record.broker_employee
            else None
        ),
        "broker_handover_at": (
            record.broker_handover_at.isoformat()
            if record.broker_handover_at
            else None
        ),
        "broker_handover_note": record.broker_handover_note,

        "transaction_fee_snapshot": str(record.transaction_fee_snapshot),
        "transaction_value_snapshot": str(record.transaction_value_snapshot),

        "note": record.note,
        "source_system": record.source_system,
        "source_call_id": record.source_call_id,
        "data_status": record.data_status,
    }


def normalize_audit_value(val):
    if val is None:
        return ""
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).strip()
    try:
        from decimal import Decimal
        d = Decimal(s)
        return str(d.quantize(Decimal("0.01")))
    except Exception:
        pass
    return s


def get_changed_fields(old_data, new_data):
    if not old_data:
        return list(new_data.keys())

    changed = []

    for key, new_value in new_data.items():
        old_value = old_data.get(key)

        if normalize_audit_value(old_value) != normalize_audit_value(new_value):
            changed.append(key)

    return changed


def create_sa_record_audit_log(
    *,
    sa_record,
    action_type,
    changed_by_user,
    old_data=None,
    new_data=None,
    note=None,
):
    changed_fields = get_changed_fields(old_data or {}, new_data or {})

    if action_type == SaRecordAuditLog.ACTION_UPDATE and not changed_fields:
        return None

    return SaRecordAuditLog.objects.create(
        sa_record=sa_record,
        action_type=action_type,
        old_data=old_data,
        new_data=new_data,
        changed_fields=changed_fields,
        changed_by_user=changed_by_user,
        note=note,
    )