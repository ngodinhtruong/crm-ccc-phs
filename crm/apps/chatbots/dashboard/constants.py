"""Tên section và cấu hình cache của dashboard chatbot."""

SECTION_SUMMARY = "summary"
SECTION_TOPICS = "topics"
SECTION_TRAFFIC = "traffic"
SECTION_OPERATIONS = "operations"
SECTION_COMPARISON = "comparison"
SECTION_QUICK_LISTS = "quick_lists"

ALL_SECTIONS = (
    SECTION_SUMMARY,
    SECTION_TOPICS,
    SECTION_TRAFFIC,
    SECTION_OPERATIONS,
    SECTION_COMPARISON,
    SECTION_QUICK_LISTS,
)

SECTION_TTLS = {
    SECTION_SUMMARY: 120,
    SECTION_TOPICS: 300,
    SECTION_TRAFFIC: 300,
    SECTION_OPERATIONS: 120,
    SECTION_COMPARISON: 300,
    SECTION_QUICK_LISTS: 60,
}

SECTION_ALIASES = {
    "all": ALL_SECTIONS,
    "overview": ALL_SECTIONS,
    "analytics": (
        SECTION_TOPICS,
        SECTION_TRAFFIC,
        SECTION_OPERATIONS,
        SECTION_COMPARISON,
    ),
}


def parse_dashboard_sections(raw_value):
    """
    Trả về ``(sections, is_explicit)``.

    Không truyền ``sections`` vẫn tải toàn bộ để frontend cũ tiếp tục hoạt động.
    Các tên lạ bị bỏ qua; nếu không còn section hợp lệ thì fallback toàn bộ.
    """
    if not raw_value:
        return ALL_SECTIONS, False

    resolved = []

    for raw_item in str(raw_value).split(","):
        item = raw_item.strip().lower()

        if not item:
            continue

        aliases = SECTION_ALIASES.get(item)
        candidates = aliases or ((item,) if item in ALL_SECTIONS else ())

        for candidate in candidates:
            if candidate not in resolved:
                resolved.append(candidate)

    return (tuple(resolved) or ALL_SECTIONS), True
