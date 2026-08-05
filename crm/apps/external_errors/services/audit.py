import logging
from apps.external_errors.models import ExternalErrorRecordAuditLog

logger = logging.getLogger(__name__)

RECORD_AUDIT_TRACKED_FIELDS = [
    "received_date",
    "completed_date",
    "raw_source",
    "raw_device",
    "raw_result",
    "raw_content",
    "raw_cause",
    "raw_solution",
    "clean_source",
    "clean_device",
    "clean_result",
    "clean_content",
    "clean_cause",
    "clean_solution",
    "error_code_id",
    "cause_group_id",
    "normalized_issue",
    "normalized_cause",
    "classification_status",
    "cause_classification_status",
    "need_review",
    "cause_need_review",
]


def snapshot_record_data(record):
    """Snapshot tracked fields of an ExternalErrorRecord instance into a dict."""
    if not record:
        return {}
    data = {}
    for field in RECORD_AUDIT_TRACKED_FIELDS:
        val = getattr(record, field, None)
        if hasattr(val, "isoformat"):
            data[field] = val.isoformat()
        else:
            data[field] = val
    return data


def log_record_audit(
    record,
    action_type,
    user=None,
    old_data=None,
    new_data=None,
    changed_fields=None,
    note=None,
):
    """Create an audit log entry for ExternalErrorRecord changes."""
    if not record or not record.id:
        return None

    try:
        if action_type == ExternalErrorRecordAuditLog.ACTION_UPDATE:
            if changed_fields is None and old_data and new_data:
                diff = {}
                for key in set(old_data.keys()).union(set(new_data.keys())):
                    old_val = old_data.get(key)
                    new_val = new_data.get(key)
                    if old_val != new_val:
                        diff[key] = {"old": old_val, "new": new_val}
                changed_fields = diff

            # Skip logging if update has no changes
            if not changed_fields and not note:
                return None

        actual_user = user if (user and getattr(user, "is_authenticated", False)) else None

        return ExternalErrorRecordAuditLog.objects.create(
            record=record,
            action_type=action_type,
            old_data=old_data,
            new_data=new_data,
            changed_fields=changed_fields,
            changed_by_user=actual_user,
            note=note,
        )
    except Exception as exc:
        logger.warning("Failed to record audit log for ExternalErrorRecord #%s: %s", getattr(record, "id", None), exc)
        return None
