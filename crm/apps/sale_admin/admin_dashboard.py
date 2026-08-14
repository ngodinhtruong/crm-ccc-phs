from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db.models import Count, Exists, OuterRef, Q, Sum
from django.utils import timezone

from apps.accounts.scopes import filter_branches_by_user, filter_sa_records_by_user
from apps.branches.models import Branch
from apps.sale_admin.models import SaRecord, SaIcpGroup

from apps.kpis.models import TransactionLog


ZERO = Decimal("0.00")

from apps.common.constants import MATCHED_ORDER_STATUSES


@dataclass(frozen=True)
class PeriodRange:
    year: int
    month: int
    start: date
    end: date
    label: str
    code: str


def _decimal(value: Any) -> Decimal:
    if value is None or value == "":
        return ZERO

    try:
        return Decimal(str(value))
    except Exception:
        return ZERO


def _money(value: Any) -> str:
    return str(_decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _number(value: Any) -> int:
    try:
        return int(value or 0)
    except Exception:
        return 0


def _safe_percent(numerator: Any, denominator: Any) -> Decimal:
    numerator_value = _decimal(numerator)
    denominator_value = _decimal(denominator)

    if denominator_value == 0:
        return ZERO

    return (numerator_value / denominator_value * Decimal("100.00")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def _growth_percent(current: Any, previous: Any) -> float | None:
    current_value = _decimal(current)
    previous_value = _decimal(previous)

    if previous_value == 0:
        if current_value == 0:
            return None
        return 100.0

    value = (current_value - previous_value) / previous_value * Decimal("100.00")
    return float(value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def _range_label(start: date, end_exclusive: date) -> str:
    inclusive_end = end_exclusive - timedelta(days=1)

    is_full_month = (
        start.day == 1
        and start.year == inclusive_end.year
        and start.month == inclusive_end.month
        and inclusive_end.day == (date(start.year + int(start.month == 12), 1 if start.month == 12 else start.month + 1, 1) - timedelta(days=1)).day
    )

    if is_full_month:
        return f"T{start.month}/{start.year}"

    return f"{start.strftime('%d/%m/%Y')} - {inclusive_end.strftime('%d/%m/%Y')}"


def _period(year: int, month: int) -> PeriodRange:
    start = date(year, month, 1)

    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)

    return PeriodRange(
        year=year,
        month=month,
        start=start,
        end=end,
        label=f"T{month}/{year}",
        code=f"{year}-{month:02d}",
    )


def _period_from_range(start: date, inclusive_end: date) -> PeriodRange:
    if inclusive_end < start:
        inclusive_end = start

    end = inclusive_end + timedelta(days=1)

    return PeriodRange(
        year=start.year,
        month=start.month,
        start=start,
        end=end,
        label=_range_label(start, end),
        code=f"{start.isoformat()}_{inclusive_end.isoformat()}",
    )


def _is_full_month(period: PeriodRange) -> bool:
    return period.start.day == 1 and period.end == _period(period.year, period.month).end


def _previous_period(period: PeriodRange) -> PeriodRange:
    if _is_full_month(period):
        if period.month == 1:
            return _period(period.year - 1, 12)
        return _period(period.year, period.month - 1)

    duration = period.end - period.start
    previous_end = period.start
    previous_start = previous_end - duration
    return _period_from_range(previous_start, previous_end - timedelta(days=1))


def _parse_date_param(value: str | None) -> date | None:
    if not value:
        return None

    try:
        return date.fromisoformat(str(value)[:10])
    except Exception:
        return None


def _get_request_period(request) -> PeriodRange:
    today = timezone.localdate()

    date_from = _parse_date_param(request.query_params.get("date_from"))
    date_to = _parse_date_param(request.query_params.get("date_to"))

    if date_from or date_to:
        if not date_from:
            date_from = date_to or today
        if not date_to:
            date_to = date_from
        return _period_from_range(date_from, date_to)

    try:
        year = int(request.query_params.get("year") or today.year)
    except Exception:
        year = today.year

    try:
        month = int(request.query_params.get("month") or today.month)
    except Exception:
        month = today.month

    month = min(12, max(1, month))
    return _period(year, month)


def _branch_name(branch: Branch | None, fallback: str | None = None) -> str:
    if branch:
        return branch.branch_name or branch.branch_code or f"Chi nhánh {branch.id}"

    return fallback or "Không xác định"


def _user_display_name(user=None, employee=None, fallback: str | None = None) -> str:
    if employee:
        return employee.full_name or employee.employee_code or fallback or "-"

    if user:
        user_emp = getattr(user, "employee", None)
        if user_emp and getattr(user_emp, "full_name", None):
            return user_emp.full_name
        full_name = getattr(user, "get_full_name", lambda: "")() or f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip()
        return full_name or fallback or getattr(user, "username", None) or getattr(user, "email", None) or "-"

    return fallback or "-"


def _records_for_period(records_qs, period: PeriodRange):
    return records_qs.filter(call_date__gte=period.start, call_date__lt=period.end)


def _transactions_for_period(account_ids: set[int], period: PeriodRange):
    """Lấy dữ liệu giao dịch đã tổng hợp ngay tại DB.

    TransactionLog không còn account_no/customer trực tiếp. Liên kết chuẩn là:
    TransactionLog -> CustomerAccount -> Customer.
    """
    if not account_ids:
        return []

    return list(
        TransactionLog.objects.filter(
            customer_account_id__in=account_ids,
            transaction_date__gte=period.start,
            transaction_date__lt=period.end,
            order_status__in=MATCHED_ORDER_STATUSES,
        )
        .values(
            "customer_account_id",
            "customer_account__account_number",
            "customer_account__customer__full_name",
            "branch_id",
            "branch__branch_name",
            "branch__branch_code",
        )
        .annotate(
            transaction_value=Sum("transaction_value"),
            transaction_fee=Sum("transaction_fee"),
            order_count=Count("id"),
        )
        .order_by()
    )


def _transaction_totals(transactions) -> dict[str, Decimal]:
    value = ZERO
    fee = ZERO
    order_count = 0

    for row in transactions:
        value += _decimal(row.get("transaction_value"))
        fee += _decimal(row.get("transaction_fee"))
        order_count += _number(row.get("order_count"))

    return {
        "transaction_value": value,
        "transaction_fee": fee,
        "order_count": Decimal(order_count),
    }


def _build_account_transaction_map(transactions) -> dict[str, dict[str, Any]]:
    account_map: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "transaction_value": ZERO,
            "transaction_fee": ZERO,
            "order_count": 0,
            "branch_id": None,
            "branch_name": None,
            "customer_name": None,
        }
    )

    for row in transactions:
        account_no = str(row.get("customer_account__account_number") or "").strip()
        if not account_no:
            continue

        item = account_map[account_no]
        item["transaction_value"] += _decimal(row.get("transaction_value"))
        item["transaction_fee"] += _decimal(row.get("transaction_fee"))
        item["order_count"] += _number(row.get("order_count"))

        if row.get("branch_id") and not item["branch_id"]:
            item["branch_id"] = row["branch_id"]
            item["branch_name"] = (
                row.get("branch__branch_name")
                or row.get("branch__branch_code")
                or f"Chi nhánh {row['branch_id']}"
            )

        if row.get("customer_account__customer__full_name") and not item["customer_name"]:
            item["customer_name"] = row["customer_account__customer__full_name"]

    return account_map


def _record_account_no(record: SaRecord) -> str:
    customer_account = getattr(record, "customer_account", None)
    if customer_account and customer_account.account_number:
        return str(customer_account.account_number).strip()
    return str(record.account_no or "").strip()


def _active_account_numbers(records_qs, period: PeriodRange) -> set[str]:
    """TK tái kích hoạt hợp lệ: cờ reactivation và có lệnh khớp sau ngày gọi."""
    matched_transactions = TransactionLog.objects.filter(
        customer_account_id=OuterRef("customer_account_id"),
        transaction_date__gte=OuterRef("call_date"),
        transaction_date__lt=period.end,
        order_status__in=MATCHED_ORDER_STATUSES,
    )

    return set(
        records_qs.filter(
            reactivation=True,
            customer_account__isnull=False,
        )
        .annotate(has_matched_transaction=Exists(matched_transactions))
        .filter(has_matched_transaction=True)
        .values_list("customer_account__account_number", flat=True)
        .distinct()
    )

def _record_customer_name(record: SaRecord) -> str:
    customer = getattr(record, "customer", None)
    if customer:
        return customer.full_name or record.customer_name_snapshot or "-"

    return record.customer_name_snapshot or "-"


def _record_branch_id(record: SaRecord) -> int | None:
    branch = getattr(record, "branch", None)
    return branch.id if branch else None


def _record_branch_name(record: SaRecord) -> str:
    return _branch_name(getattr(record, "branch", None), getattr(record, "branch_name_snapshot", None))


def _record_pic_name(record: SaRecord) -> str:
    return _user_display_name(
        getattr(record, "pic_user", None),
        getattr(record, "pic_employee", None),
        getattr(record, "pic_name_snapshot", None),
    )


def _latest_records_by_account(records) -> dict[str, SaRecord]:
    account_map: dict[str, SaRecord] = {}

    for record in sorted(records, key=lambda item: (item.call_date, item.id)):
        account_no = _record_account_no(record)
        if account_no:
            account_map[account_no] = record

    return account_map


def _build_branch_options(user, scoped_records):
    branches = filter_branches_by_user(
        Branch.objects.filter(status="ACTIVE").order_by("branch_name", "id"),
        user,
    )

    options = [
        {
            "id": branch.id,
            "branch_code": branch.branch_code,
            "branch_name": _branch_name(branch),
        }
        for branch in branches
    ]

    if options:
        return options

    branch_map: dict[int, str] = {}
    for item in scoped_records:
        if item.branch_id:
            branch_map[item.branch_id] = _record_branch_name(item)

    return [
        {
            "id": branch_id,
            "branch_code": None,
            "branch_name": branch_name,
        }
        for branch_id, branch_name in sorted(branch_map.items(), key=lambda row: row[1])
    ]


def _calculate_sa_broker_splits(records, transactions, period_start, period_end):
    sa_value = ZERO
    sa_fee = ZERO
    broker_value = ZERO
    broker_fee = ZERO

    latest_record_map = _latest_records_by_account(records)
    account_map = _build_account_transaction_map(transactions)

    for account_no, totals in account_map.items():
        value = _decimal(totals["transaction_value"])
        fee = _decimal(totals["transaction_fee"])
        record = latest_record_map.get(account_no)
        if record and (record.handover_to_broker or record.broker_user_id or record.broker_employee_id):
            handover_date = record.broker_handover_at.date() if record.broker_handover_at else record.call_date
            if record.customer_account_id:
                tx_split = TransactionLog.objects.filter(
                    customer_account_id=record.customer_account_id,
                    transaction_date__gte=period_start,
                    transaction_date__lt=period_end,
                    order_status__in=MATCHED_ORDER_STATUSES,
                ).aggregate(
                    broker_v=Sum("transaction_value", filter=Q(transaction_date__gte=handover_date)),
                    broker_f=Sum("transaction_fee", filter=Q(transaction_date__gte=handover_date)),
                    sa_v=Sum("transaction_value", filter=Q(transaction_date__lt=handover_date)),
                    sa_f=Sum("transaction_fee", filter=Q(transaction_date__lt=handover_date)),
                )
                broker_value += _decimal(tx_split.get("broker_v"))
                broker_fee += _decimal(tx_split.get("broker_f"))
                sa_value += _decimal(tx_split.get("sa_v"))
                sa_fee += _decimal(tx_split.get("sa_f"))
            else:
                broker_value += value
                broker_fee += fee
        else:
            sa_value += value
            sa_fee += fee

    return sa_value, broker_value, sa_fee, broker_fee


def _build_overview(period: PeriodRange, previous_period: PeriodRange, current_records, previous_records, current_transactions, previous_transactions, current_active_accounts: set[str], previous_active_accounts: set[str]):
    current_totals = _transaction_totals(current_transactions)
    previous_totals = _transaction_totals(previous_transactions)

    current_calls = len(current_records)
    previous_calls = len(previous_records)

    current_reactivated = len(current_active_accounts)
    previous_reactivated = len(previous_active_accounts)

    cur_sa_v, cur_br_v, cur_sa_f, cur_br_f = _calculate_sa_broker_splits(
        current_records, current_transactions, period.start, period.end
    )
    prev_sa_v, prev_br_v, prev_sa_f, prev_br_f = _calculate_sa_broker_splits(
        previous_records, previous_transactions, previous_period.start, previous_period.end
    )

    return [
        {
            "key": "total_calls",
            "label": "Tổng cuộc gọi",
            "value": current_calls,
            "previous_value": previous_calls,
            "previous_label": f"{previous_period.label}: {previous_calls} cuộc",
            "growth_percent": _growth_percent(current_calls, previous_calls),
            "unit": "COUNT",
        },
        {
            "key": "reactivated_accounts",
            "label": "TK kích hoạt",
            "value": current_reactivated,
            "previous_value": previous_reactivated,
            "previous_label": f"{previous_period.label}: {previous_reactivated} TK",
            "growth_percent": _growth_percent(current_reactivated, previous_reactivated),
            "unit": "COUNT",
        },
        {
            "key": "transaction_value",
            "label": "Giá trị GD",
            "value": _money(current_totals["transaction_value"]),
            "previous_value": _money(previous_totals["transaction_value"]),
            "previous_label": f"{previous_period.label}: {_money(previous_totals['transaction_value'])}",
            "growth_percent": _growth_percent(current_totals["transaction_value"], previous_totals["transaction_value"]),
            "unit": "VND",
            "sa_value": _money(cur_sa_v),
            "previous_sa_value": _money(prev_sa_v),
            "sa_growth_percent": _growth_percent(cur_sa_v, prev_sa_v),
            "broker_value": _money(cur_br_v),
            "previous_broker_value": _money(prev_br_v),
            "broker_growth_percent": _growth_percent(cur_br_v, prev_br_v),
        },
        {
            "key": "transaction_fee",
            "label": "Phí GD thực tế",
            "value": _money(current_totals["transaction_fee"]),
            "previous_value": _money(previous_totals["transaction_fee"]),
            "previous_label": f"{previous_period.label}: {_money(previous_totals['transaction_fee'])}",
            "growth_percent": _growth_percent(current_totals["transaction_fee"], previous_totals["transaction_fee"]),
            "unit": "VND",
            "sa_value": _money(cur_sa_f),
            "previous_sa_value": _money(prev_sa_f),
            "sa_growth_percent": _growth_percent(cur_sa_f, prev_sa_f),
            "broker_value": _money(cur_br_f),
            "previous_broker_value": _money(prev_br_f),
            "broker_growth_percent": _growth_percent(cur_br_f, prev_br_f),
        },
    ]


def _build_branch_ranking(branch_options, current_records, previous_records, current_account_map, previous_account_map, current_active_accounts: set[str], period: PeriodRange | None = None):
    ranking: list[dict[str, Any]] = []

    records_by_branch: dict[int, list[SaRecord]] = defaultdict(list)
    previous_records_by_branch: dict[int, list[SaRecord]] = defaultdict(list)

    for record in current_records:
        if record.branch_id:
            records_by_branch[record.branch_id].append(record)

    for record in previous_records:
        if record.branch_id:
            previous_records_by_branch[record.branch_id].append(record)

    branch_ids = {item["id"] for item in branch_options}
    branch_ids.update(records_by_branch.keys())
    branch_ids.update(previous_records_by_branch.keys())

    branch_name_map = {item["id"]: item["branch_name"] for item in branch_options}

    for branch_id in branch_ids:
        records = records_by_branch.get(branch_id, [])
        previous_branch_records = previous_records_by_branch.get(branch_id, [])

        account_nos = {_record_account_no(record) for record in records if _record_account_no(record)}
        previous_account_nos = {_record_account_no(record) for record in previous_branch_records if _record_account_no(record)}

        reactivation_flag_nos = {
            _record_account_no(record)
            for record in records
            if record.reactivation and _record_account_no(record)
        }
        reactivated_nos = reactivation_flag_nos.intersection(current_active_accounts)
        potential_active_nos = {
            _record_account_no(record)
            for record in records
            if (
                _record_account_no(record) in reactivated_nos
                and record.icp_group
                and record.icp_group.is_potential
            )
        }

        sa_value = ZERO
        sa_fee = ZERO
        broker_value = ZERO
        broker_fee = ZERO
        total_value = ZERO
        total_fee = ZERO

        latest_record_map = _latest_records_by_account(records)

        for account_no in account_nos:
            totals = current_account_map.get(account_no)
            if not totals:
                continue

            value = _decimal(totals["transaction_value"])
            fee = _decimal(totals["transaction_fee"])
            total_value += value
            total_fee += fee

            record = latest_record_map.get(account_no)
            if record and (record.handover_to_broker or record.broker_user_id or record.broker_employee_id):
                handover_date = record.broker_handover_at.date() if record.broker_handover_at else record.call_date
                if record.customer_account_id:
                    tx_split = TransactionLog.objects.filter(
                        customer_account_id=record.customer_account_id,
                        transaction_date__gte=period.start,
                        transaction_date__lt=period.end,
                        order_status__in=MATCHED_ORDER_STATUSES,
                    ).aggregate(
                        broker_v=Sum("transaction_value", filter=Q(transaction_date__gte=handover_date)),
                        broker_f=Sum("transaction_fee", filter=Q(transaction_date__gte=handover_date)),
                        sa_v=Sum("transaction_value", filter=Q(transaction_date__lt=handover_date)),
                        sa_f=Sum("transaction_fee", filter=Q(transaction_date__lt=handover_date)),
                    )
                    broker_value += _decimal(tx_split.get("broker_v"))
                    broker_fee += _decimal(tx_split.get("broker_f"))
                    sa_value += _decimal(tx_split.get("sa_v"))
                    sa_fee += _decimal(tx_split.get("sa_f"))
                else:
                    broker_value += value
                    broker_fee += fee
            else:
                sa_value += value
                sa_fee += fee

        previous_fee = ZERO
        for account_no in previous_account_nos:
            previous_fee += _decimal(previous_account_map.get(account_no, {}).get("transaction_fee", 0))

        branch_name = branch_name_map.get(branch_id)
        if not branch_name and records:
            branch_name = _record_branch_name(records[0])
        if not branch_name and previous_branch_records:
            branch_name = _record_branch_name(previous_branch_records[0])

        ranking.append(
            {
                "branch_id": branch_id,
                "branch_name": branch_name or f"Chi nhánh {branch_id}",
                "rank": 0,
                "total_calls": len(records),
                "reactivated_accounts": len(reactivated_nos),
                "potential_active_accounts": len(potential_active_nos),
                "sa_transaction_value": _money(sa_value),
                "sa_transaction_fee": _money(sa_fee),
                "broker_transaction_value": _money(broker_value),
                "broker_transaction_fee": _money(broker_fee),
                "total_transaction_value": _money(total_value),
                "total_transaction_fee": _money(total_fee),
                "transaction_value": _money(total_value),
                "transaction_fee": _money(total_fee),
                "previous_transaction_fee": _money(previous_fee),
                "mom_growth_percent": _growth_percent(total_fee, previous_fee),
            }
        )

    ranking.sort(key=lambda row: (_decimal(row["total_transaction_fee"]), row["reactivated_accounts"], row["total_calls"]), reverse=True)

    for index, row in enumerate(ranking, start=1):
        row["rank"] = index

    total_row = {
        "branch_id": None,
        "branch_name": "TOTAL",
        "rank": None,
        "total_calls": sum(row["total_calls"] for row in ranking),
        "reactivated_accounts": sum(row["reactivated_accounts"] for row in ranking),
        "potential_active_accounts": sum(row["potential_active_accounts"] for row in ranking),
        "sa_transaction_value": _money(sum((_decimal(row["sa_transaction_value"]) for row in ranking), ZERO)),
        "sa_transaction_fee": _money(sum((_decimal(row["sa_transaction_fee"]) for row in ranking), ZERO)),
        "broker_transaction_value": _money(sum((_decimal(row["broker_transaction_value"]) for row in ranking), ZERO)),
        "broker_transaction_fee": _money(sum((_decimal(row["broker_transaction_fee"]) for row in ranking), ZERO)),
        "total_transaction_value": _money(sum((_decimal(row["total_transaction_value"]) for row in ranking), ZERO)),
        "total_transaction_fee": _money(sum((_decimal(row["total_transaction_fee"]) for row in ranking), ZERO)),
        "transaction_value": _money(sum((_decimal(row["transaction_value"]) for row in ranking), ZERO)),
        "transaction_fee": _money(sum((_decimal(row["transaction_fee"]) for row in ranking), ZERO)),
        "previous_transaction_fee": _money(sum((_decimal(row["previous_transaction_fee"]) for row in ranking), ZERO)),
    }
    total_row["mom_growth_percent"] = _growth_percent(total_row["total_transaction_fee"], total_row["previous_transaction_fee"])

    return ranking, total_row


def _build_fee_by_branch(branch_ranking, previous_period: PeriodRange, period: PeriodRange):
    return [
        {
            "branch_id": row["branch_id"],
            "branch_name": row["branch_name"],
            "previous_fee": row["previous_transaction_fee"],
            "current_fee": row["total_transaction_fee"],
            "previous_label": previous_period.label,
            "current_label": period.label,
        }
        for row in branch_ranking
        if row.get("branch_id") is not None
    ]


def _build_top_accounts(current_records, current_account_map):
    latest_record_map = _latest_records_by_account(current_records)
    rows = []

    for account_no, totals in current_account_map.items():
        record = latest_record_map.get(account_no)
        if not record:
            continue

        rows.append(
            {
                "account_no": account_no,
                "customer_name": _record_customer_name(record),
                "branch_name": totals.get("branch_name") or _record_branch_name(record),
                "transaction_fee": _money(totals["transaction_fee"]),
                "transaction_value": _money(totals["transaction_value"]),
                "order_count": _number(totals["order_count"]),
                "call_date": record.call_date.isoformat() if record.call_date else None,
                "pic_name": _record_pic_name(record),
                "reactivation": bool(record.reactivation),
            }
        )

    rows.sort(key=lambda row: _decimal(row["transaction_fee"]), reverse=True)

    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    return rows[:50]


def _build_top_employees(current_records, current_account_map, current_active_accounts: set[str]):
    rows_by_key: dict[str, dict[str, Any]] = {}

    for record in current_records:
        if record.pic_user_id:
            key = f"user:{record.pic_user_id}"
            user_id = record.pic_user_id
            username = getattr(record.pic_user, "username", None) if record.pic_user else None
            email = getattr(record.pic_user, "email", None) if record.pic_user else None
        elif record.pic_employee_id:
            key = f"employee:{record.pic_employee_id}"
            user_id = None
            username = None
            email = getattr(record.pic_employee, "email", None) if record.pic_employee else None
        else:
            key = f"unknown:{record.pic_name_snapshot or 'unknown'}"
            user_id = None
            username = None
            email = None

        if key not in rows_by_key:
            rows_by_key[key] = {
                "user_id": user_id,
                "username": username,
                "email": email,
                "employee_name": _record_pic_name(record),
                "branch_name": _record_branch_name(record),
                "rank": 0,
                "total_calls": 0,
                "reactivated_accounts": set(),
                "transaction_fee": ZERO,
                "transaction_value": ZERO,
                "accounts": {},
            }

        row = rows_by_key[key]
        row["total_calls"] += 1

        account_no = _record_account_no(record)
        if not account_no:
            continue

        if record.reactivation and account_no in current_active_accounts:
            row["reactivated_accounts"].add(account_no)

        totals = current_account_map.get(account_no)
        if not totals or account_no in row["accounts"]:
            continue

        # Một tài khoản có thể có nhiều lần gọi trong kỳ; chỉ cộng giao dịch một lần.
        row["transaction_fee"] += _decimal(totals["transaction_fee"])
        row["transaction_value"] += _decimal(totals["transaction_value"])
        row["accounts"][account_no] = {
            "account_no": account_no,
            "customer_name": _record_customer_name(record),
            "branch_name": totals.get("branch_name") or _record_branch_name(record),
            "transaction_fee": _money(totals["transaction_fee"]),
            "transaction_value": _money(totals["transaction_value"]),
            "order_count": _number(totals["order_count"]),
            "call_date": record.call_date.isoformat() if record.call_date else None,
        }

    rows = []
    for row in rows_by_key.values():
        accounts = list(row["accounts"].values())
        accounts.sort(key=lambda item: _decimal(item["transaction_fee"]), reverse=True)

        rows.append(
            {
                "user_id": row["user_id"] or 0,
                "username": row["username"],
                "email": row["email"],
                "employee_name": row["employee_name"],
                "branch_name": row["branch_name"],
                "rank": 0,
                "total_calls": row["total_calls"],
                "reactivated_accounts": len(row["reactivated_accounts"]),
                "transaction_fee": _money(row["transaction_fee"]),
                "transaction_value": _money(row["transaction_value"]),
                "accounts": accounts,
            }
        )

    rows.sort(key=lambda item: (item["reactivated_accounts"], _decimal(item["transaction_fee"]), item["total_calls"]), reverse=True)

    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    return rows[:50]


def _build_product_fee(current_account_map):
    product_map: dict[str, Decimal] = defaultdict(Decimal)

    for account_item in current_account_map.values():
        for product_code, fee in account_item["product_fee"].items():
            product_map[product_code] += _decimal(fee)

    rows = [
        {
            "product_code": code,
            "product_name": code,
            "transaction_fee": _money(fee),
        }
        for code, fee in product_map.items()
    ]
    rows.sort(key=lambda item: _decimal(item["transaction_fee"]), reverse=True)
    return rows


def _build_icp_distribution(current_records):
    current_records = list(_latest_records_by_account(current_records).values())
    total = len(current_records)
    type_map: dict[str, dict[str, Any]] = defaultdict(lambda: {"count": 0, "label": "Chưa phân nhóm"})

    label_map = dict(SaIcpGroup.ICP_TYPE_CHOICES)

    for record in current_records:
        icp_group = getattr(record, "icp_group", None)
        icp_type = getattr(icp_group, "icp_type", None) or "UNKNOWN"
        type_map[icp_type]["count"] += 1
        type_map[icp_type]["label"] = label_map.get(icp_type, "Chưa phân nhóm")

    rows = []
    for icp_type, item in type_map.items():
        rows.append(
            {
                "icp_type": icp_type,
                "icp_code": icp_type,
                "label": item["label"],
                "count": item["count"],
                "percent": float(_safe_percent(item["count"], total)),
            }
        )

    rows.sort(key=lambda item: item["count"], reverse=True)
    return rows


def _build_customer_group_distribution(current_records, current_account_map):
    current_records = list(_latest_records_by_account(current_records).values())
    total = len(current_records)
    groups: dict[str, dict[str, Any]] = {}

    for record in current_records:
        icp_group = getattr(record, "icp_group", None)

        if icp_group:
            key = str(icp_group.id)
            code = icp_group.icp_code
            name = icp_group.icp_name
            icp_type = icp_group.icp_type
            description = icp_group.description
        else:
            key = "UNKNOWN"
            code = "-"
            name = "Chưa phân nhóm"
            icp_type = "UNKNOWN"
            description = None

        if key not in groups:
            groups[key] = {
                "group_id": getattr(icp_group, "id", None),
                "icp_code": code,
                "icp_name": name,
                "icp_type": icp_type,
                "description": description,
                "count": 0,
                "percent": 0,
                "transaction_fee": ZERO,
                "transaction_value": ZERO,
                "accounts": [],
            }

        groups[key]["count"] += 1

        account_no = _record_account_no(record)
        totals = current_account_map.get(account_no, {})
        groups[key]["transaction_fee"] += _decimal(totals.get("transaction_fee", 0))
        groups[key]["transaction_value"] += _decimal(totals.get("transaction_value", 0))
        groups[key]["accounts"].append(
            {
                "account_no": account_no,
                "customer_name": _record_customer_name(record),
                "branch_name": _record_branch_name(record),
                "pic_name": _record_pic_name(record),
                "call_date": record.call_date.isoformat() if record.call_date else None,
                "reactivation": bool(record.reactivation),
                "transaction_fee": _money(totals.get("transaction_fee", 0)),
                "transaction_value": _money(totals.get("transaction_value", 0)),
                "order_count": _number(totals.get("order_count", 0)),
            }
        )

    rows = list(groups.values())
    for row in rows:
        row["percent"] = float(_safe_percent(row["count"], total))
        row["transaction_fee"] = _money(row["transaction_fee"])
        row["transaction_value"] = _money(row["transaction_value"])
        row["accounts"].sort(key=lambda item: _decimal(item["transaction_fee"]), reverse=True)
        row["accounts"] = row["accounts"][:50]

    rows.sort(key=lambda item: item["count"], reverse=True)
    return rows


def _build_criteria():
    return {
        "title": "Tiêu chí đánh giá tài khoản Kích Hoạt Tiềm năng",
        "formula": "KH có reactivation = true và có ít nhất một lệnh khớp từ ngày gọi trong transaction_logs.",
        "groups": [
            {"code": "A", "name": "Rất tiềm năng", "description": "Hoạt động thường xuyên, giao dịch đều."},
            {"code": "B", "name": "Tiềm năng", "description": "Có giao dịch nhưng chưa ổn định."},
            {"code": "C", "name": "Nuôi dưỡng", "description": "Ít giao dịch, cần chăm sóc thêm."},
            {"code": "D", "name": "Không tiềm năng", "description": "Không phát sinh giao dịch."},
            {"code": "E-H", "name": "Ảo / Không liên lạc", "description": "Số điện thoại lỗi, tài khoản ảo, không nghe máy."},
        ],
        "note": "Chuẩn phân nhóm lấy từ dữ liệu ICP trên CRM và dữ liệu giao dịch thực tế.",
    }


def get_sale_admin_report_payload(request) -> dict[str, Any]:
    period = _get_request_period(request)
    previous = _previous_period(period)

    branch_param = str(request.query_params.get("branch") or "").strip()
    if branch_param.lower() == "all":
        branch_param = ""

    scoped_records_qs = filter_sa_records_by_user(
        SaRecord.objects.select_related(
            "customer",
            "customer_account",
            "company",
            "branch",
            "pic_user",
            "pic_employee",
            "broker_user",
            "broker_employee",
            "call_result",
            "interest_level",
            "icp_group",
        ),
        request.user,
    )

    if branch_param:
        scoped_records_qs = scoped_records_qs.filter(branch_id=branch_param)

    current_records_qs = _records_for_period(scoped_records_qs, period)
    previous_records_qs = _records_for_period(scoped_records_qs, previous)

    # Exists chạy trong DB, tránh N+1 khi kiểm tra lệnh khớp theo từng SaRecord.
    current_active_accounts = _active_account_numbers(current_records_qs, period)
    previous_active_accounts = _active_account_numbers(previous_records_qs, previous)

    current_records = list(current_records_qs)
    previous_records = list(previous_records_qs)

    branch_options = _build_branch_options(request.user, current_records + previous_records)

    current_account_ids = {
        record.customer_account_id for record in current_records if record.customer_account_id
    }
    previous_account_ids = {
        record.customer_account_id for record in previous_records if record.customer_account_id
    }

    current_transactions = _transactions_for_period(current_account_ids, period)
    previous_transactions = _transactions_for_period(previous_account_ids, previous)

    current_account_map = _build_account_transaction_map(current_transactions)
    previous_account_map = _build_account_transaction_map(previous_transactions)

    overview = _build_overview(
        period,
        previous,
        current_records,
        previous_records,
        current_transactions,
        previous_transactions,
        current_active_accounts,
        previous_active_accounts,
    )

    branch_ranking, branch_total = _build_branch_ranking(
        branch_options,
        current_records,
        previous_records,
        current_account_map,
        previous_account_map,
        current_active_accounts,
        period,
    )

    top_accounts = _build_top_accounts(current_records, current_account_map)
    top_employees = _build_top_employees(current_records, current_account_map, current_active_accounts)

    return {
        "generated_at": timezone.now().isoformat(),
        "period": {
            "year": period.year,
            "month": period.month,
            "label": period.label,
            "code": period.code,
            "date_from": period.start.isoformat(),
            "date_to": (period.end - timedelta(days=1)).isoformat(),
            "previous_year": previous.year,
            "previous_month": previous.month,
            "previous_label": previous.label,
            "previous_code": previous.code,
        },
        "filters": {
            "year": str(period.year),
            "month": str(period.month),
            "date_from": period.start.isoformat(),
            "date_to": (period.end - timedelta(days=1)).isoformat(),
            "branch": branch_param,
            "branch_options": branch_options,
        },
        "overview": overview,
        "summary_cards": overview,
        "branch_ranking": branch_ranking,
        "branch_total": branch_total,
        "fee_by_branch": _build_fee_by_branch(branch_ranking, previous, period),
        "top_employees": top_employees,
        "top_accounts": top_accounts,
        "product_fee": [],
        "icp_distribution": _build_icp_distribution(current_records),
        "customer_group_distribution": _build_customer_group_distribution(current_records, current_account_map),
        "criteria": _build_criteria(),
    }
