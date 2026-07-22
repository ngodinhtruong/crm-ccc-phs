import math
import re
import unicodedata
from collections.abc import Iterable, Mapping
from typing import Any


EMPTY_VALUES = {
    "",
    "none",
    "null",
    "nan",
    "n/a",
    "na",
    "-",
}


SLANG_DICT = {
    "ko": "không",
    "kg": "không",
    "hông": "không",
    "dc": "được",
    "đc": "được",
    "đx": "được",
    "r": "rồi",
    "lun": "luôn",
    "z": "vậy",
    "j": "gì",
    "vs": "với",
    "tk": "tài khoản",
    "tkck": "tài khoản chứng khoán",
    "stk": "số tài khoản",
    "mtk": "mở tài khoản",
    "mk": "mật khẩu",
    "ttin": "thông tin",
    "sdt": "số điện thoại",
    "đt": "điện thoại",
    "kh": "khách hàng",
    "mg": "môi giới",
    "cn": "chi nhánh",
    "kl": "khối lượng",
    "ps": "phái sinh",
    "mr": "margin",
    "cw": "chứng quyền",
    "ccq": "chứng chỉ quỹ",
    "sd": "sử dụng",
    "bc": "báo cáo",
    "gd": "giao dịch",
}


TECH_DICT = {
    "web trading": "webtrading",
    "web-trading": "webtrading",
    "web_trading": "webtrading",
    "x pro": "xpro",
    "x-pro": "xpro",
    "x_pro": "xpro",
    "mobile app": "app",
    "log in": "đăng nhập",
    "login": "đăng nhập",
    "log out": "đăng xuất",
    "logout": "đăng xuất",
    "loading": "tải",
    "load": "tải",
    "show": "hiển thị",
    "update": "cập nhật",
    "fix": "sửa",
    "lag": "chậm",
    "clear cache": "xóa cache",
    "khách hang": "khách hàng",
}


STOP_PHRASES = [
    "xem giúp",
    "check giúp",
    "kiểm tra giúp",
    "kiểm tra dùm",
    "kiểm tra giùm",
    "hỗ trợ giúp",
    "nhờ hỗ trợ",
    "cám ơn",
    "cảm ơn",
]


STOP_WORDS = {
    "dạ",
    "ạ",
    "ơi",
    "nha",
    "nhé",
    "dear",
    "admin",
    "ad",
    "ace",
    "giúp",
    "dùm",
    "giùm",
    "nhờ",
    "check",
}


DEFAULT_STOCK_TICKERS = [
    "POW",
    "PVS",
    "VND",
    "VNX",
    "TCX",
    "MWG",
    "HAH",
]


SOURCE_ALIASES = {
    "kh": "Khách hàng",
    "khach hang": "Khách hàng",
    "customer": "Khách hàng",
    "client": "Khách hàng",
    "noi bo": "Nội bộ",
    "internal": "Nội bộ",
    "nhan vien": "Nội bộ",
    "staff": "Nội bộ",
    "hotline": "Hotline",
    "tong dai": "Hotline",
    "email": "Email",
    "mail": "Email",
    "zalo": "Zalo",
    "zns": "ZNS",
    "app": "Ứng dụng",
    "mobile app": "Ứng dụng",
    "ung dung": "Ứng dụng",
    "web": "Web",
    "website": "Web",
    "portal": "Portal",
    "brokerportal": "BrokerPortal",
    "broker portal": "BrokerPortal",
}


DEVICE_ALIASES = {
    "app": "Mobile App",
    "mobile app": "Mobile App",
    "mobile_app": "Mobile App",
    "ung dung": "Mobile App",
    "ios": "iOS",
    "iphone": "iOS",
    "ipad": "iOS",
    "android": "Android",
    "web": "Web",
    "website": "Web",
    "web trading": "Web Trading",
    "web_trading": "Web Trading",
    "webtrading": "Web Trading",
    "system": "Hệ thống",
    "he thong": "Hệ thống",
    "ekyc": "eKYC",
    "e kyc": "eKYC",
    "e-kyc": "eKYC",
    "x pro": "XPro",
    "x-pro": "XPro",
    "x_pro": "XPro",
    "xpro": "XPro",
    "portal": "Portal",
    "brokerportal": "BrokerPortal",
    "broker portal": "BrokerPortal",
    "home": "Home",
}


RESULT_ALIASES = {
    "da khac phuc": "Đã khắc phục",
    "da duoc khac phuc": "Đã khắc phục",
    "da xu ly": "Đã khắc phục",
    "resolved": "Đã khắc phục",
    "fixed": "Đã khắc phục",
    "done": "Đã khắc phục",
    "dang xu ly": "Đang xử lý",
    "processing": "Đang xử lý",
    "in progress": "Đang xử lý",
    "chua xu ly": "Chưa xử lý",
    "pending": "Chưa xử lý",
    "open": "Chưa xử lý",
    "khong khac phuc duoc": "Không khắc phục được",
    "khong xu ly duoc": "Không khắc phục được",
    "failed": "Không khắc phục được",
}


def is_empty_value(value: Any) -> bool:
    if value is None:
        return True

    if isinstance(value, float) and math.isnan(value):
        return True

    try:
        if value != value:
            return True
    except (TypeError, ValueError):
        pass

    return str(value).strip().lower() in EMPTY_VALUES


def clean_text(value: Any) -> str:
    """Làm sạch khoảng trắng nhưng vẫn giữ ranh giới dòng."""
    if is_empty_value(value):
        return ""

    text = (
        unicodedata.normalize("NFC", str(value))
        .replace("\u200b", " ")
        .replace("\xa0", " ")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .strip()
    )

    lines = []
    for line in text.split("\n"):
        cleaned_line = re.sub(r"[ \t]+", " ", line).strip()
        if cleaned_line:
            lines.append(cleaned_line)

    return "\n".join(lines)


def normalize_lookup_key(value: Any) -> str:
    text = clean_text(value).lower()
    if not text:
        return ""

    text = unicodedata.normalize("NFD", text)
    text = "".join(
        character
        for character in text
        if unicodedata.category(character) != "Mn"
    )
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def replace_dictionary(
    text: str,
    mapping: Mapping[str, str],
) -> str:
    """Thay từ/cụm từ, kể cả khi đứng cạnh dấu câu."""
    for source in sorted(mapping, key=len, reverse=True):
        pattern = (
            r"(?<!\w)"
            + re.escape(source).replace(r"\ ", r"\s+")
            + r"(?!\w)"
        )
        text = re.sub(
            pattern,
            mapping[source],
            text,
            flags=re.IGNORECASE,
        )

    return text


def mask_stock_tickers(
    text: str,
    tickers: Iterable[str] | None,
) -> str:
    normalized_tickers = [
        str(ticker).strip()
        for ticker in (tickers or [])
        if str(ticker).strip()
    ]
    if not normalized_tickers:
        return text

    tickers_pattern = "|".join(
        re.escape(ticker)
        for ticker in sorted(
            set(normalized_tickers),
            key=len,
            reverse=True,
        )
    )

    return re.sub(
        rf"(?<!\w)(?:{tickers_pattern})(?!\w)",
        " <STOCK> ",
        text,
        flags=re.IGNORECASE,
    )


def normalize_source(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return "Không xác định"

    key = normalize_lookup_key(text)
    return SOURCE_ALIASES.get(key, text.strip())


def normalize_device(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return "Không xác định"

    key = normalize_lookup_key(text)
    return DEVICE_ALIASES.get(key, text.strip())


def normalize_result(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return "Không xác định"

    key = normalize_lookup_key(text)
    return RESULT_ALIASES.get(key, text.strip())


def clean_and_normalize_text(
    value: Any,
    *,
    stock_tickers: Iterable[str] | None = None,
) -> str:
    """
    Chuẩn hóa nội dung cho LLM/ML nhưng không thay đổi raw_content.
    """
    if is_empty_value(value) or not isinstance(value, str):
        return ""

    text = unicodedata.normalize("NFC", value)
    text = (
        text.replace("\u200b", " ")
        .replace("\xa0", " ")
        .lower()
        .strip()
    )

    # URL
    text = re.sub(
        r"\b(?:https?://|www\.)\S+",
        " <URL> ",
        text,
        flags=re.IGNORECASE,
    )

    # Email
    text = re.sub(
        r"\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b",
        " <EMAIL> ",
        text,
        flags=re.IGNORECASE,
    )

    # Số điện thoại Việt Nam
    text = re.sub(
        r"(?<![\w])(?:\+?84|0)(?:[\s.\-]?\d){8,10}(?!\d)",
        " <PHONE> ",
        text,
    )

    # Ngày tháng
    text = re.sub(
        r"\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b",
        " <DATE> ",
        text,
    )

    # Thời gian
    text = re.sub(
        r"\b\d{1,2}\s*(?::|h)\s*\d{0,2}"
        r"(?:\s*p\s*\d{1,2})?\b",
        " <TIME> ",
        text,
        flags=re.IGNORECASE,
    )

    # Tài khoản 022C...
    text = re.sub(
        r"(?<![a-z0-9])022c(?:[._-]?\d){5,12}(?=[^\d]|$)",
        " <ACCOUNT> ",
        text,
        flags=re.IGNORECASE,
    )

    # ID/case/request
    text = re.sub(
        r"\b(?:id|case|request)\s*[:#-]?\s*"
        r"[a-z0-9._-]*\d[a-z0-9._-]{2,19}\b",
        " <CASE_ID> ",
        text,
        flags=re.IGNORECASE,
    )

    # Dãy số sau KH/khách hàng
    text = re.sub(
        r"(\b(?:kh|khách\s+hàng)\s*)\d{4,12}\b",
        r"\1<ACCOUNT>",
        text,
        flags=re.IGNORECASE,
    )

    account_pattern = re.compile(
        r"(\b(?:tkck|tk|tài\s*khoản)\s*[:#-]?\s*)"
        r"(?P<code>"
        r"(?=[a-z0-9._-]{4,20})"
        r"(?=[a-z0-9._-]*\d)"
        r"[a-z0-9](?:[a-z0-9._-]{2,18}[a-z0-9])?"
        r")",
        flags=re.IGNORECASE,
    )
    text = account_pattern.sub(
        lambda match: f"{match.group(1)}<ACCOUNT>",
        text,
    )

    # Mã gồm chữ + số
    text = re.sub(
        r"(?<!\w)"
        r"(?=[a-z0-9._-]{6,20}(?!\w))"
        r"(?=[a-z0-9._-]*[a-z])"
        r"(?=[a-z0-9._-]*\d)"
        r"[a-z0-9._-]+",
        " <CODE> ",
        text,
        flags=re.IGNORECASE,
    )

    # Dãy số dài còn lại
    text = re.sub(
        r"\b\d{6,}\b",
        " <NUMBER> ",
        text,
    )

    text = mask_stock_tickers(
        text,
        stock_tickers or DEFAULT_STOCK_TICKERS,
    )

    # Chuẩn hóa thuật ngữ kỹ thuật
    text = replace_dictionary(text, TECH_DICT)

    negative_followers = (
        r"được|dc|đc|nhận|vào|ra|hiện|thấy|có|"
        r"cho|mua|bán|đăng|tải|load|đặt|hủy|huỷ|"
        r"xuất|làm|xem|tiếp|ghi|cộng|trừ|bấm"
    )
    text = re.sub(
        rf"\bk\b(?=\s+(?:{negative_followers})\b)",
        "không",
        text,
    )

    text = re.sub(
        r"\br\b(?=\s+(?:vẫn|mà|thì|xong|nhưng)\b)",
        "rồi",
        text,
    )

    text = re.sub(
        r"\bvô\b(?=\s+(?:lại|app|web|home|xpro|"
        r"tài khoản|tk|hệ thống|brokerportal)\b)",
        "vào",
        text,
    )

    text = replace_dictionary(text, SLANG_DICT)

    # Xóa cụm từ giao tiếp
    for phrase in sorted(STOP_PHRASES, key=len, reverse=True):
        pattern = (
            r"(?<!\w)"
            + re.escape(phrase).replace(r"\ ", r"\s+")
            + r"(?!\w)"
        )
        text = re.sub(
            pattern,
            " ",
            text,
            flags=re.IGNORECASE,
        )

    stopword_pattern = (
        r"(?<!\w)(?:"
        + "|".join(
            re.escape(word)
            for word in sorted(STOP_WORDS, key=len, reverse=True)
        )
        + r")(?!\w)"
    )
    text = re.sub(
        stopword_pattern,
        " ",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(r"(?<!\w)e(?!\w)", " ", text)

    # Chuẩn hóa cấu trúc
    text = re.sub(r"(?:=>|->|→)", " ; ", text)
    text = re.sub(r"[\r\n]+", " . ", text)
    text = re.sub(
        r"[^\w\s<>]",
        " ",
        text,
        flags=re.UNICODE,
    )

    return re.sub(r"\s+", " ", text).strip()


def normalize_general_text(value: Any) -> str:
    """Alias tương thích với code cũ."""
    return clean_and_normalize_text(value)


def build_rule_based_clean_fields(raw_data: dict) -> dict:
    """
    Sinh clean_* từ raw_*.
    raw_* luôn được giữ nguyên để phục vụ truy vết.
    """
    return {
        "clean_source": normalize_source(raw_data.get("raw_source")),
        "clean_device": normalize_device(raw_data.get("raw_device")),
        "clean_result": normalize_result(raw_data.get("raw_result")),
        "clean_content": clean_and_normalize_text(
            raw_data.get("raw_content")
        ),
        "clean_cause": clean_and_normalize_text(
            raw_data.get("raw_cause")
        ),
        "clean_solution": clean_and_normalize_text(
            raw_data.get("raw_solution")
        ),
    }
