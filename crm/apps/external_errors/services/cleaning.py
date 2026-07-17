import re
import unicodedata
from datetime import datetime

from django.utils.dateparse import parse_date

DEVICE_PATTERNS = [
    (r"\bmobile\s*app\b|\bapp\b|phs\s*elite|elite", "Mobile App"),
    (r"web\s*trading|webtrading|web", "Web Trading"),
    (r"ekyc|e-kyc|kyc", "EKYC"),
    (r"x\s*pro|xpro", "X pro"),
    (r"system|home|portal|broker", "System"),
]

SOURCE_PATTERNS = [
    (r"khách\s*hàng|khach\s*hang|customer|kh\b", "Khách hàng"),
    (r"nội\s*bộ|noi\s*bo|internal|nv|nhân\s*viên", "Nội bộ"),
]

RESULT_PATTERNS = [
    (r"hoàn\s*thành|xong|đã\s*xử\s*lý|done|closed", "Đã xử lý"),
    (r"hủy|huỷ|cancel", "Đã hủy"),
]


def normalize_text(value):
    if value is None:
        return ""

    text = str(value)
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_by_patterns(value, patterns, fallback=None):
    text = normalize_text(value)
    if not text:
        return fallback or ""

    lowered = text.lower()
    for pattern, label in patterns:
        if re.search(pattern, lowered, flags=re.IGNORECASE):
            return label

    return text


def normalize_device(value):
    return normalize_by_patterns(value, DEVICE_PATTERNS, fallback="Không xác định")


def normalize_source(value):
    return normalize_by_patterns(value, SOURCE_PATTERNS, fallback="Không xác định")


def normalize_result(value):
    return normalize_by_patterns(value, RESULT_PATTERNS, fallback=normalize_text(value) or "Đã xử lý")


def parse_flexible_date(value):
    text = normalize_text(value)
    if not text:
        return None

    parsed = parse_date(text)
    if parsed:
        return parsed

    for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%y", "%d-%m-%y"]:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue

    return None


def clean_error_payload(row):
    return {
        "received_date": parse_flexible_date(row.get("received_date") or row.get("Ngày nhận")),
        "completed_date": parse_flexible_date(row.get("completed_date") or row.get("Ngày hoàn thành")),
        "raw_source": normalize_text(row.get("source") or row.get("Nguồn")),
        "raw_device": normalize_text(row.get("device") or row.get("Thiết bị")),
        "raw_result": normalize_text(row.get("result") or row.get("Kết quả xử lý")),
        "raw_content": normalize_text(row.get("content") or row.get("Nội dung")),
        "raw_cause": normalize_text(row.get("cause") or row.get("Nguyên nhân")),
        "raw_solution": normalize_text(row.get("solution") or row.get("Giải pháp")),
    }


def build_rule_based_clean_fields(raw_payload):
    return {
        "clean_source": normalize_source(raw_payload.get("raw_source")),
        "clean_device": normalize_device(raw_payload.get("raw_device")),
        "clean_result": normalize_result(raw_payload.get("raw_result")),
        "clean_content": normalize_text(raw_payload.get("raw_content")),
        "clean_cause": normalize_text(raw_payload.get("raw_cause")),
        "clean_solution": normalize_text(raw_payload.get("raw_solution")),
    }
