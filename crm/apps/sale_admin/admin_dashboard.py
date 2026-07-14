from __future__ import annotations

import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum

from apps.accounts.services import PermissionService
from apps.branches.models import Branch
from apps.kpis.models import TransactionLog
from apps.sale_admin.models import SaIcpGroup, SaRecord

MATCHED_STATUS = "MATCHED"
SA_STAFF_ROLE_CODES = {"SA", "SA_STAFF", "SALE_ADMIN_STAFF"}
ADMIN_ROLE_CODES = {"SYSTEM_ADMIN", "SA_ADMIN", "SA_MANAGER", "ADMIN", "BOM"}
ADMIN_PERMISSION_CODES = {"KPI_DASHBOARD_VIEW_ALL", "SA_DASHBOARD_VIEW"}


@dataclass(frozen=True)
class MonthWindow:
    year: int
    month: int
    start_date: date
    end_date: date
    label: str


def decimal_to_float(value) -> float:
    if value is None:
        return 0.0
    return float(Decimal(str(value)))


def decimal_to_string(value) -> str:
    return str(value or Decimal("0.00"))


def get_month_window(year: int, month: int) -> MonthWindow:
    last_day = calendar.monthrange(year, month)[1]
    return MonthWindow(
        year=year,
        month=month,
        start_date=date(year, month, 1),
        end_date=date(year, month, last_day),
        label=f"Tháng {month:02d}/{year}",
    )


def get_previous_month_window(year: int, month: int) -> MonthWindow:
    if month == 1:
        return get_month_window(year - 1, 12)
    return get_month_window(year, month - 1)


def get_role_codes(user) -> set[str]:
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return ADMIN_ROLE_CODES | SA_STAFF_ROLE_CODES
    return set(PermissionService.get_user_role_codes(user))


def can_view_admin_dashboard(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    role_codes = get_role_codes(user)
    if role_codes & ADMIN_ROLE_CODES:
        return True

    return any(PermissionService.has_permission(user, code) for code in ADMIN_PERMISSION_CODES)



def can_view_all_branches(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    role_codes = get_role_codes(user)
    return bool(role_codes & ADMIN_ROLE_CODES) or PermissionService.has_permission(user, "KPI_DASHBOARD_VIEW_ALL")

def get_accessible_branch_ids(user) -> set[int]:
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return set(Branch.objects.values_list("id", flat=True))

    if can_view_all_branches(user):
        return set(Branch.objects.values_list("id", flat=True))

    return set(PermissionService.get_user_branch_ids(user))


def serialize_branch(branch: Branch) -> dict:
    return {
        "id": branch.id,
        "branch_code": getattr(branch, "branch_code", None) or getattr(branch, "code", None) or str(branch.id),
        "branch_name": getattr(branch, "branch_name", None) or getattr(branch, "name", None) or f"Chi nhánh {branch.id}",
    }


def branch_name(branch: Branch | None, fallback: str = "Không xác định") -> str:
    if not branch:
        return fallback
    return getattr(branch, "branch_name", None) or getattr(branch, "name", None) or fallback


def employee_display_name(user) -> str:
    employee = getattr(user, "employee", None)
    if employee and getattr(employee, "full_name", None):
        return employee.full_name
    full_name = user.get_full_name() if hasattr(user, "get_full_name") else ""
    return full_name or getattr(user, "username", None) or getattr(user, "email", None) or f"User {user.id}"


def apply_branch_filter(queryset, branch_id: int | str | list | set | tuple | None):
    if not branch_id:
        return queryset

    if isinstance(branch_id, (list, set, tuple)):
        branch_ids = [item for item in branch_id if item]
        if not branch_ids:
            return queryset.none()
        return queryset.filter(Q(branch_id__in=branch_ids) | Q(pic_user__employee__branch_id__in=branch_ids)).distinct()

    return queryset.filter(Q(branch_id=branch_id) | Q(pic_user__employee__branch_id=branch_id)).distinct()


def get_records_for_window(window: MonthWindow, branch_id: int | str | None = None):
    queryset = (
        SaRecord.objects.select_related(
            "branch",
            "pic_user",
            "pic_user__employee",
            "pic_user__employee__branch",
            "pic_employee",
            "call_result",
            "interest_level",
            "icp_group",
        )
        .filter(call_date__gte=window.start_date, call_date__lte=window.end_date)
        .distinct()
    )
    return apply_branch_filter(queryset, branch_id)


def distinct_account_nos(records_queryset) -> list[str]:
    return list(
        records_queryset.exclude(account_no__isnull=True)
        .exclude(account_no="")
        .values_list("account_no", flat=True)
        .distinct()
    )


def get_reactivated_account_nos(records_queryset) -> list[str]:
    return distinct_account_nos(records_queryset.filter(reactivation=True))


def get_matched_transactions(window: MonthWindow, account_nos: Iterable[str]):
    account_nos = list(account_nos)
    if not account_nos:
        return TransactionLog.objects.none()

    return TransactionLog.objects.filter(
        account_no__in=account_nos,
        transaction_date__gte=window.start_date,
        transaction_date__lte=window.end_date,
        order_status__iexact=MATCHED_STATUS,
    )


def get_active_account_nos(window: MonthWindow, account_nos: Iterable[str]) -> list[str]:
    return list(
        get_matched_transactions(window, account_nos)
        .exclude(account_no__isnull=True)
        .exclude(account_no="")
        .values_list("account_no", flat=True)
        .distinct()
    )


def aggregate_transaction_amounts(window: MonthWindow, account_nos: Iterable[str]) -> dict:
    aggregate = get_matched_transactions(window, account_nos).aggregate(
        transaction_value=Sum("transaction_value"),
        transaction_fee=Sum("transaction_fee"),
    )
    return {
        "transaction_value": aggregate["transaction_value"] or Decimal("0.00"),
        "transaction_fee": aggregate["transaction_fee"] or Decimal("0.00"),
    }


def growth_percent(current_value, previous_value) -> float | None:
    current = Decimal(str(current_value or 0))
    previous = Decimal(str(previous_value or 0))

    if previous == 0:
        if current == 0:
            return 0.0
        return 100.0

    return float(((current - previous) / previous) * Decimal("100"))


def build_metric_card(key: str, label: str, current_value, previous_value, unit: str) -> dict:
    return {
        "key": key,
        "label": label,
        "value": decimal_to_string(current_value),
        "previous_value": decimal_to_string(previous_value),
        "growth_percent": growth_percent(current_value, previous_value),
        "unit": unit,
    }


def calculate_scope(window: MonthWindow, branch_id: int | str | None = None) -> dict:
    records = get_records_for_window(window, branch_id)
    reactivated_account_nos = get_reactivated_account_nos(records)
    active_account_nos = get_active_account_nos(window, reactivated_account_nos)
    amounts = aggregate_transaction_amounts(window, active_account_nos)

    return {
        "records": records,
        "total_calls": records.count(),
        "reactivated_account_nos": reactivated_account_nos,
        "reactivated_accounts": len(reactivated_account_nos),
        "potential_active_account_nos": active_account_nos,
        "potential_active_accounts": len(active_account_nos),
        "transaction_value": amounts["transaction_value"],
        "transaction_fee": amounts["transaction_fee"],
    }


def build_overview(current_scope: dict, previous_scope: dict) -> list[dict]:
    return [
        build_metric_card(
            "total_calls",
            "Tổng cuộc gọi",
            current_scope["total_calls"],
            previous_scope["total_calls"],
            "COUNT",
        ),
        build_metric_card(
            "reactivated_accounts",
            "TK kích hoạt",
            current_scope["reactivated_accounts"],
            previous_scope["reactivated_accounts"],
            "COUNT",
        ),
        build_metric_card(
            "transaction_value",
            "Giá trị GD",
            current_scope["transaction_value"],
            previous_scope["transaction_value"],
            "VND",
        ),
        build_metric_card(
            "transaction_fee",
            "Phí GD thực tế",
            current_scope["transaction_fee"],
            previous_scope["transaction_fee"],
            "VND",
        ),
    ]


def get_record_branch(record) -> Branch | None:
    if getattr(record, "branch_id", None):
        return record.branch
    employee = getattr(getattr(record, "pic_user", None), "employee", None)
    if employee and getattr(employee, "branch_id", None):
        return employee.branch
    return None


def collect_branch_ids(*record_querysets) -> set[int]:
    branch_ids: set[int] = set()
    for queryset in record_querysets:
        for record in queryset:
            branch = get_record_branch(record)
            if branch:
                branch_ids.add(branch.id)
    return branch_ids


def build_branch_scope(window: MonthWindow, branch_id: int):
    return calculate_scope(window, branch_id=branch_id)


def build_branch_ranking(current_window: MonthWindow, previous_window: MonthWindow, selected_branch_id=None) -> tuple[list[dict], list[dict]]:
    current_records = get_records_for_window(current_window, selected_branch_id)
    previous_records = get_records_for_window(previous_window, selected_branch_id)

    if selected_branch_id:
        branch_ids = {int(selected_branch_id)}
    else:
        branch_ids = collect_branch_ids(current_records, previous_records)

    branches_by_id = {
        branch.id: branch
        for branch in Branch.objects.filter(id__in=branch_ids).order_by("id")
    }

    rows = []
    chart = []

    for branch_id in sorted(branch_ids):
        branch = branches_by_id.get(branch_id)
        current_scope = build_branch_scope(current_window, branch_id)
        previous_scope = build_branch_scope(previous_window, branch_id)

        row = {
            "branch_id": branch_id,
            "branch_name": branch_name(branch, f"Chi nhánh {branch_id}"),
            "total_calls": current_scope["total_calls"],
            "reactivated_accounts": current_scope["reactivated_accounts"],
            "potential_active_accounts": current_scope["potential_active_accounts"],
            "transaction_fee": decimal_to_string(current_scope["transaction_fee"]),
            "previous_transaction_fee": decimal_to_string(previous_scope["transaction_fee"]),
            "mom_growth_percent": growth_percent(current_scope["transaction_fee"], previous_scope["transaction_fee"]),
        }
        rows.append(row)
        chart.append(
            {
                "branch_id": branch_id,
                "branch_name": row["branch_name"],
                "current_fee": row["transaction_fee"],
                "previous_fee": row["previous_transaction_fee"],
            }
        )

    rows.sort(key=lambda item: (-Decimal(str(item["transaction_fee"] or 0)), item["branch_name"]))
    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    chart.sort(key=lambda item: -Decimal(str(item["current_fee"] or 0)))
    return rows, chart


def build_employee_accounts(window: MonthWindow, records_queryset, account_nos: list[str]) -> list[dict]:
    transactions_by_account = {
        item["account_no"]: item
        for item in get_matched_transactions(window, account_nos)
        .values("account_no")
        .annotate(
            transaction_fee=Sum("transaction_fee"),
            transaction_value=Sum("transaction_value"),
            order_count=Count("id"),
        )
    }

    rows = []
    for record in records_queryset.filter(account_no__in=account_nos).order_by("account_no", "-call_date", "-id"):
        if any(row["account_no"] == record.account_no for row in rows):
            continue
        tx = transactions_by_account.get(record.account_no, {})
        rows.append(
            {
                "account_no": record.account_no,
                "customer_name": record.customer_name_snapshot or getattr(record.customer, "full_name", None) or "-",
                "branch_name": branch_name(get_record_branch(record)),
                "transaction_fee": decimal_to_string(tx.get("transaction_fee") or Decimal("0.00")),
                "transaction_value": decimal_to_string(tx.get("transaction_value") or Decimal("0.00")),
                "order_count": tx.get("order_count") or 0,
                "call_date": str(record.call_date) if record.call_date else None,
            }
        )

    rows.sort(key=lambda item: -Decimal(str(item["transaction_fee"] or 0)))
    return rows[:100]


def build_top_employees(current_window: MonthWindow, selected_branch_id=None) -> list[dict]:
    records = get_records_for_window(current_window, selected_branch_id)
    user_ids = list(records.exclude(pic_user__isnull=True).values_list("pic_user_id", flat=True).distinct())
    User = get_user_model()
    users = User.objects.select_related("employee", "employee__branch").filter(id__in=user_ids)

    rows = []
    for user in users:
        user_records = records.filter(pic_user=user)
        reactivated_account_nos = get_reactivated_account_nos(user_records)
        active_account_nos = get_active_account_nos(current_window, reactivated_account_nos)
        amounts = aggregate_transaction_amounts(current_window, active_account_nos)
        branch = getattr(getattr(user, "employee", None), "branch", None)

        rows.append(
            {
                "user_id": user.id,
                "employee_id": getattr(getattr(user, "employee", None), "id", None),
                "employee_name": employee_display_name(user),
                "username": user.username,
                "email": user.email,
                "branch_id": getattr(branch, "id", None),
                "branch_name": branch_name(branch),
                "reactivated_accounts": len(active_account_nos),
                "raw_reactivated_accounts": len(reactivated_account_nos),
                "total_calls": user_records.count(),
                "transaction_fee": decimal_to_string(amounts["transaction_fee"]),
                "transaction_value": decimal_to_string(amounts["transaction_value"]),
                "accounts": build_employee_accounts(current_window, user_records, active_account_nos),
            }
        )

    rows.sort(key=lambda item: (-item["reactivated_accounts"], -item["total_calls"], item["employee_name"]))
    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    return rows[:20]


def build_top_accounts(current_window: MonthWindow, current_scope: dict, selected_branch_id=None) -> list[dict]:
    records = current_scope["records"]
    account_nos = current_scope["potential_active_account_nos"]
    tx_rows = list(
        get_matched_transactions(current_window, account_nos)
        .values("account_no")
        .annotate(
            transaction_fee=Sum("transaction_fee"),
            transaction_value=Sum("transaction_value"),
            order_count=Count("id"),
        )
        .order_by("-transaction_fee")[:20]
    )

    result = []
    for item in tx_rows:
        record = records.filter(account_no=item["account_no"]).order_by("-call_date", "-id").first()
        pic_user = getattr(record, "pic_user", None) if record else None
        result.append(
            {
                "account_no": item["account_no"],
                "customer_name": getattr(record, "customer_name_snapshot", None) or getattr(getattr(record, "customer", None), "full_name", None) or "-",
                "branch_name": branch_name(get_record_branch(record)) if record else "-",
                "transaction_fee": decimal_to_string(item["transaction_fee"] or Decimal("0.00")),
                "transaction_value": decimal_to_string(item["transaction_value"] or Decimal("0.00")),
                "order_count": item["order_count"],
                "pic_user_id": getattr(pic_user, "id", None),
                "pic_name": employee_display_name(pic_user) if pic_user else "-",
            }
        )
    return result


def build_product_fee_chart(current_window: MonthWindow, active_account_nos: list[str]) -> list[dict]:
    rows = list(
        get_matched_transactions(current_window, active_account_nos)
        .values("product_code")
        .annotate(
            transaction_fee=Sum("transaction_fee"),
            transaction_value=Sum("transaction_value"),
            order_count=Count("id"),
        )
        .order_by("-transaction_fee")
    )

    return [
        {
            "product_code": row["product_code"] or "UNKNOWN",
            "product_name": row["product_code"] or "Chưa phân loại",
            "transaction_fee": decimal_to_string(row["transaction_fee"] or Decimal("0.00")),
            "transaction_value": decimal_to_string(row["transaction_value"] or Decimal("0.00")),
            "order_count": row["order_count"],
        }
        for row in rows[:12]
    ]


def normalize_icp_label(icp_type: str | None, code: str | None, name: str | None) -> str:
    if icp_type == SaIcpGroup.TYPE_POTENTIAL:
        return f"Tiềm năng {code or ''}".strip()
    if icp_type == SaIcpGroup.TYPE_NURTURE:
        return f"Nuôi dưỡng {code or ''}".strip()
    if icp_type == SaIcpGroup.TYPE_NON_POTENTIAL:
        return f"Không TN {code or ''}".strip()
    if icp_type == SaIcpGroup.TYPE_INVALID:
        return f"Ảo/Không liên lạc {code or ''}".strip()
    return name or code or "Chưa phân nhóm"


def build_icp_distribution(records_queryset) -> list[dict]:
    rows = list(
        records_queryset.values(
            "icp_group__icp_type",
            "icp_group__icp_code",
            "icp_group__icp_name",
        )
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    total = sum(row["count"] for row in rows) or 0
    result = []
    for row in rows:
        count = row["count"]
        result.append(
            {
                "icp_type": row["icp_group__icp_type"] or "UNKNOWN",
                "icp_code": row["icp_group__icp_code"],
                "icp_name": row["icp_group__icp_name"],
                "label": normalize_icp_label(row["icp_group__icp_type"], row["icp_group__icp_code"], row["icp_group__icp_name"]),
                "count": count,
                "percent": float((Decimal(count) / Decimal(total) * Decimal("100")) if total else Decimal("0")),
            }
        )
    return result


def get_branch_options_for_user(user) -> list[dict]:
    branch_ids = get_accessible_branch_ids(user)

    if not can_view_all_branches(user) and not branch_ids:
        return []

    queryset = Branch.objects.all().order_by("id")
    if branch_ids:
        queryset = queryset.filter(id__in=branch_ids)
    return [serialize_branch(branch) for branch in queryset]


def build_sale_admin_dashboard_payload(*, user, year: int, month: int, branch_id=None) -> dict:
    current_window = get_month_window(year, month)
    previous_window = get_previous_month_window(year, month)

    accessible_branch_ids = get_accessible_branch_ids(user)
    all_branch_access = can_view_all_branches(user)

    if branch_id:
        if not all_branch_access and int(branch_id) not in accessible_branch_ids:
            raise PermissionError("Bạn không có quyền xem chi nhánh này.")
        scope_branch_filter = branch_id
    else:
        scope_branch_filter = None if all_branch_access else list(accessible_branch_ids)

    current_scope = calculate_scope(current_window, branch_id=scope_branch_filter)
    previous_scope = calculate_scope(previous_window, branch_id=scope_branch_filter)
    branch_ranking, branch_fee_chart = build_branch_ranking(current_window, previous_window, selected_branch_id=scope_branch_filter)
    top_employees = build_top_employees(current_window, selected_branch_id=scope_branch_filter)

    return {
        "period": {
            "year": current_window.year,
            "month": current_window.month,
            "label": current_window.label,
            "start_date": current_window.start_date.isoformat(),
            "end_date": current_window.end_date.isoformat(),
            "previous_label": previous_window.label,
            "previous_start_date": previous_window.start_date.isoformat(),
            "previous_end_date": previous_window.end_date.isoformat(),
        },
        "filters": {
            "branch": str(branch_id or ""),
            "branch_options": get_branch_options_for_user(user),
        },
        "overview": build_overview(current_scope, previous_scope),
        "branch_ranking": branch_ranking,
        "branch_fee_chart": branch_fee_chart,
        "top_employees": top_employees,
        "top_employee_chart": top_employees[:7],
        "top_accounts": build_top_accounts(current_window, current_scope, selected_branch_id=branch_id),
        "product_fee_chart": build_product_fee_chart(current_window, current_scope["potential_active_account_nos"]),
        "icp_distribution": build_icp_distribution(current_scope["records"]),
        "meta": {
            "data_sources": ["sa_records", "transaction_logs", "users/employees/roles"],
            "matched_status": MATCHED_STATUS,
            "potential_account_rule": "reactivation=true và có ít nhất một transaction_log order_status=MATCHED trong tháng đang xem.",
        },
    }
