"""Cache theo section để tránh tính lại toàn bộ dashboard trong mỗi request."""

import hashlib
import json

from django.core.cache import cache

from apps.chatbots.dashboard.constants import SECTION_TTLS

CACHE_VERSION_KEY = "chatbot-dashboard:version"
CACHE_KEY_PREFIX = "chatbot-dashboard:section"


def get_chatbot_dashboard_cache_version():
    version = cache.get(CACHE_VERSION_KEY)

    if version is None:
        cache.add(CACHE_VERSION_KEY, 1, timeout=None)
        version = cache.get(CACHE_VERSION_KEY, 1)

    return int(version)


def bump_chatbot_dashboard_cache_version():
    """Làm mất hiệu lực cache sau khi bảng tổng hợp phiên được rebuild."""
    try:
        return cache.incr(CACHE_VERSION_KEY)
    except (ValueError, NotImplementedError):
        version = get_chatbot_dashboard_cache_version() + 1
        cache.set(CACHE_VERSION_KEY, version, timeout=None)
        return version


def make_chatbot_dashboard_cache_key(section, filter_signature):
    payload = json.dumps(
        filter_signature,
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]
    version = get_chatbot_dashboard_cache_version()
    return f"{CACHE_KEY_PREFIX}:{version}:{section}:{digest}"


def get_or_build_dashboard_section(section, filter_signature, builder):
    key = make_chatbot_dashboard_cache_key(section, filter_signature)
    cached = cache.get(key)

    if cached is not None:
        return cached

    value = builder()
    cache.set(key, value, timeout=SECTION_TTLS.get(section, 120))
    return value

