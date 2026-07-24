import hashlib
import json
import time

from django.conf import settings
from django.core.exceptions import EmptyResultSet
from django.core.cache import cache


CACHE_VERSION_KEY = "tickets:ccc-dashboard:version"
CACHE_PREFIX = "tickets:ccc-dashboard"
DEFAULT_CACHE_TIMEOUT = 180


def _cache_timeout():
    return int(
        getattr(
            settings,
            "TICKET_CCC_DASHBOARD_CACHE_TIMEOUT",
            DEFAULT_CACHE_TIMEOUT,
        )
    )


def _cache_version():
    version = cache.get(CACHE_VERSION_KEY)
    if version is None:
        cache.add(CACHE_VERSION_KEY, 1, timeout=None)
        version = cache.get(CACHE_VERSION_KEY) or 1
    return version


def _normalized_params(query_params):
    pairs = []
    for key in sorted(query_params.keys()):
        if key == "refresh":
            continue
        pairs.append((key, sorted(str(value) for value in query_params.getlist(key))))
    return pairs


def build_queryset_scope_fingerprint(queryset):
    """
    Build a non-reversible fingerprint from the effective queryset SQL.

    The permission scope produced by ``filter_tickets_by_user`` is part of the
    SQL/parameters. Users with the exact same effective scope and filters can
    therefore share a cache entry without exposing data across different
    scopes. Building this fingerprint does not execute the queryset.
    """
    try:
        sql, params = queryset.query.sql_with_params()
        payload = {
            "sql": sql,
            "params": [str(value) for value in params],
        }
    except EmptyResultSet:
        payload = {"empty_queryset": True}
    return hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()


def build_ticket_dashboard_cache_key(
    user,
    query_params,
    *,
    scope_fingerprint=None,
    section=None,
):
    payload = {
        "scope": scope_fingerprint,
        "section": section,
        "params": _normalized_params(query_params),
    }

    # Backward-safe fallback for callers that do not provide an effective
    # queryset scope. Non-superusers must remain isolated in that case.
    if not scope_fingerprint:
        payload.update(
            {
                "user_id": getattr(user, "pk", None),
                "is_superuser": bool(getattr(user, "is_superuser", False)),
            }
        )

    digest = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    return f"{CACHE_PREFIX}:v{_cache_version()}:{digest}"


def get_ticket_dashboard_cache(cache_key):
    return cache.get(cache_key)


def set_ticket_dashboard_cache(cache_key, payload, timeout=None):
    cache.set(
        cache_key,
        payload,
        timeout=_cache_timeout() if timeout is None else timeout,
    )


def invalidate_ticket_dashboard_cache():
    try:
        cache.incr(CACHE_VERSION_KEY)
    except (ValueError, NotImplementedError):
        cache.set(CACHE_VERSION_KEY, time.time_ns(), timeout=None)


def is_dashboard_refresh_requested(query_params):
    return str(query_params.get("refresh") or "").strip().lower() in {
        "1",
        "true",
        "yes",
    }
