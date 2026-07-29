import hashlib
import json
from collections.abc import Callable, Mapping
from typing import Any

from django.conf import settings
from django.core.cache import cache


CACHE_NAMESPACE = "external-errors-dashboard"
CACHE_VERSION_KEY = f"{CACHE_NAMESPACE}:version"
DEFAULT_CACHE_TIMEOUT = 300


def get_dashboard_cache_timeout() -> int:
    value = getattr(
        settings,
        "EXTERNAL_ERROR_DASHBOARD_CACHE_TIMEOUT",
        DEFAULT_CACHE_TIMEOUT,
    )
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return DEFAULT_CACHE_TIMEOUT


def _normalise_params(params: Mapping[str, Any]) -> dict[str, Any]:
    """Chuyển QueryDict/dict thành dữ liệu ổn định để tạo cache key."""
    if hasattr(params, "lists"):
        raw_items = params.lists()
    else:
        raw_items = params.items()

    result: dict[str, Any] = {}
    for key, value in raw_items:
        if key in {"refresh", "_"}:
            continue

        if isinstance(value, (list, tuple)):
            normalised_value = [str(item) for item in value]
            result[str(key)] = (
                normalised_value[0]
                if len(normalised_value) == 1
                else normalised_value
            )
        else:
            result[str(key)] = str(value)

    return dict(sorted(result.items()))


def _get_cache_version() -> int:
    version = cache.get(CACHE_VERSION_KEY)
    if isinstance(version, int):
        return version

    cache.add(CACHE_VERSION_KEY, 1, timeout=None)
    version = cache.get(CACHE_VERSION_KEY)
    return version if isinstance(version, int) else 1


def build_dashboard_cache_key(
    endpoint: str,
    params: Mapping[str, Any],
) -> str:
    payload = {
        "endpoint": endpoint,
        "params": _normalise_params(params),
        "version": _get_cache_version(),
    }
    digest = hashlib.sha256(
        json.dumps(
            payload,
            ensure_ascii=True,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    return f"{CACHE_NAMESPACE}:{endpoint}:{digest}"


def get_cached_dashboard_payload(
    endpoint: str,
    params: Mapping[str, Any],
    builder: Callable[[], Any],
    *,
    force_refresh: bool = False,
) -> Any:
    timeout = get_dashboard_cache_timeout()
    if timeout <= 0 or force_refresh:
        payload = builder()
        if timeout > 0:
            cache.set(
                build_dashboard_cache_key(endpoint, params),
                payload,
                timeout=timeout,
            )
        return payload

    cache_key = build_dashboard_cache_key(endpoint, params)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    payload = builder()
    cache.set(cache_key, payload, timeout=timeout)
    return payload


def invalidate_external_error_dashboard_cache() -> int:
    """
    Tăng version thay vì quét/xóa toàn bộ key.

    Cách này hoạt động với RedisCache và cả cache backend mặc định của Django.
    Khi dùng nhiều process, nên cấu hình Django cache chung bằng Redis DB riêng.
    """
    try:
        return int(cache.incr(CACHE_VERSION_KEY))
    except (ValueError, TypeError, NotImplementedError):
        current = cache.get(CACHE_VERSION_KEY)
        next_version = (
            current + 1
            if isinstance(current, int)
            else 2
        )
        cache.set(CACHE_VERSION_KEY, next_version, timeout=None)
        return next_version

