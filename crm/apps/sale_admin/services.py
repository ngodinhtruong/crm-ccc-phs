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

        "pic_user_id": record.pic_user_id,
        "pic_employee_id": record.pic_employee_id,

        "call_date": record.call_date.isoformat() if record.call_date else None,
        "follow_no": record.follow_no,

        "call_result_id": record.call_result_id,
        "interest_level_id": record.interest_level_id,
        "icp_group_id": record.icp_group_id,

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


def get_changed_fields(old_data, new_data):
    if not old_data:
        return list(new_data.keys())

    changed = []

    for key, new_value in new_data.items():
        old_value = old_data.get(key)

        if old_value != new_value:
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

    return SaRecordAuditLog.objects.create(
        sa_record=sa_record,
        action_type=action_type,
        old_data=old_data,
        new_data=new_data,
        changed_fields=changed_fields,
        changed_by_user=changed_by_user,
        note=note,
    )