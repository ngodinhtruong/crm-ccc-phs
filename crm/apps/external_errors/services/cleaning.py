import re
import unicodedata
from typing import Any


EMPTY_VALUES = {"", "none", "null", "nan", "n/a", "na"}

SOURCE_ALIASES = {
    "hotline": "Hotline",
    "email": "Email",
    "zalo": "Zalo",
    "zns": "ZNS",
    "app": "Ứng dụng",
    "mobile app": "Ứng dụng",
    "web": "Web",
    "portal": "Portal",
    "brokerportal": "BrokerPortal",
    "broker portal": "BrokerPortal",
}

DEVICE_ALIASES = {
    "ios": "iOS",
    "iphone": "iOS",
    "ipad": "iOS",
    "android": "Android",
    "web": "Web",
    "website": "Web",
    "portal": "Portal",
    "brokerportal": "BrokerPortal",
    "broker portal": "BrokerPortal",
}


def clean_text(value: Any) -> str:
    if value is None:
        return ""

    text = str(value).replace("\r\n", "\n").replace("\r", "\n").strip()
    if text.lower() in EMPTY_VALUES:
        return ""

    lines = []
    for line in text.split("\n"):
        cleaned_line = re.sub(r"[ \t]+", " ", line).strip()
        if cleaned_line:
            lines.append(cleaned_line)

    return "\n".join(lines)


def normalize_lookup_key(value: str) -> str:
    text = clean_text(value).lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(
        character
        for character in text
        if unicodedata.category(character) != "Mn"
    )
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_source(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return "Không xác định"

    key = normalize_lookup_key(text)
    return SOURCE_ALIASES.get(key, text)


def normalize_device(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return "Không xác định"

    key = normalize_lookup_key(text)
    return DEVICE_ALIASES.get(key, text)


def normalize_general_text(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def build_rule_based_clean_fields(raw_data: dict) -> dict:
    """
    Sinh các trường clean từ dữ liệu gốc.

    Hàm giữ nguyên interface cũ để importer và Bedrock classifier cùng sử dụng.
    """
    return {
        "clean_source": normalize_source(raw_data.get("raw_source")),
        "clean_device": normalize_device(raw_data.get("raw_device")),
        "clean_result": normalize_general_text(raw_data.get("raw_result")),
        "clean_content": normalize_general_text(raw_data.get("raw_content")),
        "clean_cause": normalize_general_text(raw_data.get("raw_cause")),
        "clean_solution": normalize_general_text(raw_data.get("raw_solution")),
    }
