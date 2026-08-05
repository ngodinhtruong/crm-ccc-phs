"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { externalErrorService } from "@/services/external-error.service";
import {
  ExternalErrorCauseGroup,
  ExternalErrorChartResponse,
  ExternalErrorDashboardOverview,
  ExternalErrorGroup,
  ExternalErrorListParams,
  ExternalErrorRecurringIssue,
  ExternalErrorWidget,
} from "@/types/external-error.type";
import { getYearToCurrentDateRange } from "@/utils/date.util";
import { getErrorMessage } from "@/utils/error.util";

export type ExternalErrorDashboardCharts = {
  byDevice?: ExternalErrorChartResponse;
  bySource?: ExternalErrorChartResponse;
  byErrorType?: ExternalErrorChartResponse;
  trend?: ExternalErrorChartResponse;
  stackedMonthDevice?: ExternalErrorChartResponse;
  stackedDeviceErrorType?: ExternalErrorChartResponse;
  causeDonut?: ExternalErrorChartResponse;
  stackedDeviceCause?: ExternalErrorChartResponse;
};

type DashboardFilterState = {
  dateField: string;
  dateFrom: string;
  dateTo: string;
  source: string;
  device: string;
  errorType: string;
  causeGroup: string;
  status: string;
  needReview: string;
  q: string;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const OVERVIEW_CACHE_TTL_MS = 5 * 60 * 1000;
const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;

const overviewCache = new Map<string, CacheEntry<ExternalErrorDashboardOverview>>();
const overviewRequests = new Map<string, Promise<ExternalErrorDashboardOverview>>();

let catalogCache:
  | CacheEntry<{
      errorGroups: ExternalErrorGroup[];
      causeGroups: ExternalErrorCauseGroup[];
    }>
  | undefined;
let catalogRequest:
  | Promise<{
      errorGroups: ExternalErrorGroup[];
      causeGroups: ExternalErrorCauseGroup[];
    }>
  | undefined;

function createDefaultFilters(): DashboardFilterState {
  const currentYearRange = getYearToCurrentDateRange();
  let savedFrom = "";
  let savedTo = "";
  let savedField = "received_date";
  if (typeof window !== "undefined") {
    savedFrom = sessionStorage.getItem("ext_err_dashboard_dateFrom") || "";
    savedTo = sessionStorage.getItem("ext_err_dashboard_dateTo") || "";
    savedField = sessionStorage.getItem("ext_err_dashboard_dateField") || "received_date";
  }

  return {
    dateField: savedField || "received_date",
    dateFrom: savedFrom || currentYearRange.dateFrom,
    dateTo: savedTo || currentYearRange.dateTo,
    source: "",
    device: "",
    errorType: "",
    causeGroup: "",
    status: "",
    needReview: "",
    q: "",
  };
}

function toApiParams(filters: DashboardFilterState): ExternalErrorListParams {
  return {
    date_field: filters.dateField,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    source: filters.source,
    device: filters.device,
    error_group_code: filters.errorType,
    cause_group_code: filters.causeGroup,
    status: filters.status,
    need_review: filters.needReview,
    q: filters.q.trim(),
  };
}

function buildOverviewCacheKey(params: ExternalErrorListParams): string {
  return JSON.stringify([
    params.date_field ?? "",
    params.date_from ?? "",
    params.date_to ?? "",
    params.source ?? "",
    params.device ?? "",
    params.error_group_code ?? "",
    params.cause_group_code ?? "",
    params.status ?? "",
    params.need_review ?? "",
    params.q ?? "",
  ]);
}

function getValidCacheEntry<T>(
  entry: CacheEntry<T> | undefined
): CacheEntry<T> | undefined {
  if (!entry || entry.expiresAt <= Date.now()) {
    return undefined;
  }
  return entry;
}

async function fetchCatalogs() {
  const cached = getValidCacheEntry(catalogCache);
  if (cached) return cached.value;
  if (catalogRequest) return catalogRequest;

  catalogRequest = Promise.all([
    externalErrorService.getGroups({ is_active: true }).catch(() => []),
    externalErrorService.getCauseGroups({ is_active: true }).catch(() => []),
  ]).then(([errorGroups, causeGroups]) => {
    const value = { errorGroups, causeGroups };
    catalogCache = {
      value,
      expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
    };
    return value;
  });

  try {
    return await catalogRequest;
  } finally {
    catalogRequest = undefined;
  }
}

export type GranularityMode = "MONTH" | "QUARTER" | "YEAR";
export type CompareMode = "NONE" | "YOY" | "QOQ";

function getGranularityDateRange(g: GranularityMode) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  if (g === "MONTH") {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      dateFrom: formatDate(firstDay),
      dateTo: formatDate(lastDay),
    };
  }
  if (g === "QUARTER") {
    const qStartMonth = Math.floor(month / 3) * 3;
    const firstDay = new Date(year, qStartMonth, 1);
    const lastDay = new Date(year, qStartMonth + 3, 0);
    return {
      dateFrom: formatDate(firstDay),
      dateTo: formatDate(lastDay),
    };
  }
  // YEAR
  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);
  return {
    dateFrom: formatDate(firstDay),
    dateTo: formatDate(lastDay),
  };
}

export function useExternalErrorDashboard() {
  const [draftFilters, setDraftFilters] = useState<DashboardFilterState>(
    createDefaultFilters
  );
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterState>(
    createDefaultFilters
  );

  const [granularity, setGranularityState] = useState<GranularityMode>("YEAR");
  const [compareMode, setCompareModeState] = useState<CompareMode>("NONE");

  const [overview, setOverview] =
    useState<ExternalErrorDashboardOverview | null>(null);
  const overviewRef = useRef<ExternalErrorDashboardOverview | null>(null);
  const activeCacheKeyRef = useRef("");
  const [errorGroups, setErrorGroups] = useState<ExternalErrorGroup[]>([]);
  const [causeGroups, setCauseGroups] = useState<ExternalErrorCauseGroup[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    overviewRef.current = overview;
  }, [overview]);

  const params = useMemo<ExternalErrorListParams>(
    () => toApiParams(appliedFilters),
    [
      appliedFilters.causeGroup,
      appliedFilters.dateField,
      appliedFilters.dateFrom,
      appliedFilters.dateTo,
      appliedFilters.device,
      appliedFilters.errorType,
      appliedFilters.needReview,
      appliedFilters.q,
      appliedFilters.source,
      appliedFilters.status,
    ]
  );

  const cacheKey = useMemo(() => buildOverviewCacheKey(params), [params]);

  const loadDashboard = useCallback(
    async (force = false) => {
      setError("");

      if (!force) {
        const cached = getValidCacheEntry(overviewCache.get(cacheKey));
        if (cached) {
          if (activeCacheKeyRef.current === cacheKey) {
            setOverview(cached.value);
            setLoading(false);
            setFetching(false);
          }
          return cached.value;
        }
      }

      if (!overviewRef.current) setLoading(true);
      setFetching(true);

      let request = !force ? overviewRequests.get(cacheKey) : undefined;
      if (!request) {
        request = externalErrorService.getDashboardOverview({
          ...params,
          refresh: force || undefined,
        });
        if (!force) overviewRequests.set(cacheKey, request);
      }

      try {
        const data = await request;
        overviewCache.set(cacheKey, {
          value: data,
          expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS,
        });
        if (activeCacheKeyRef.current === cacheKey) {
          setOverview(data);
        }
        return data;
      } catch (err) {
        if (activeCacheKeyRef.current === cacheKey) {
          setError(getErrorMessage(err, "Không tải được Dashboard lỗi"));
        }
        return null;
      } finally {
        if (!force) overviewRequests.delete(cacheKey);
        if (activeCacheKeyRef.current === cacheKey) {
          setLoading(false);
          setFetching(false);
        }
      }
    },
    [cacheKey, params]
  );

  useEffect(() => {
    activeCacheKeyRef.current = cacheKey;
    void loadDashboard(false);
  }, [cacheKey, loadDashboard]);

  const ensureCatalogs = useCallback(async () => {
    if (catalogsLoaded || catalogsLoading) return;

    setCatalogsLoading(true);
    try {
      const catalogs = await fetchCatalogs();
      setErrorGroups(catalogs.errorGroups);
      setCauseGroups(catalogs.causeGroups);
      setCatalogsLoaded(true);
    } finally {
      setCatalogsLoading(false);
    }
  }, [catalogsLoaded, catalogsLoading]);

  const updateDraftFilter = useCallback(
    (key: keyof DashboardFilterState, value: string) => {
      setDraftFilters((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  const applyFilters = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ext_err_dashboard_dateField", draftFilters.dateField);
      sessionStorage.setItem("ext_err_dashboard_dateFrom", draftFilters.dateFrom);
      sessionStorage.setItem("ext_err_dashboard_dateTo", draftFilters.dateTo);
    }
    setAppliedFilters({ ...draftFilters, q: draftFilters.q.trim() });
  }, [draftFilters]);

  const resetDraftDateRange = useCallback(() => {
    const currentYearRange = getYearToCurrentDateRange();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ext_err_dashboard_dateField");
      sessionStorage.removeItem("ext_err_dashboard_dateFrom");
      sessionStorage.removeItem("ext_err_dashboard_dateTo");
    }

    setDraftFilters((current) => ({
      ...current,
      dateField: "received_date",
      dateFrom: currentYearRange.dateFrom,
      dateTo: currentYearRange.dateTo,
    }));
  }, []);

  const clearFilter = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ext_err_dashboard_dateField");
      sessionStorage.removeItem("ext_err_dashboard_dateFrom");
      sessionStorage.removeItem("ext_err_dashboard_dateTo");
    }
    const currentYearRange = getYearToCurrentDateRange();
    const defaults: DashboardFilterState = {
      dateField: "received_date",
      dateFrom: currentYearRange.dateFrom,
      dateTo: currentYearRange.dateTo,
      source: "",
      device: "",
      errorType: "",
      causeGroup: "",
      status: "",
      needReview: "",
      q: "",
    };
    setGranularityState("YEAR");
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
  }, []);

  const summary = overview?.summary ?? null;

  const charts = useMemo<ExternalErrorDashboardCharts>(() => {
    const data = overview?.charts;
    if (!data) return {};

    return {
      byDevice: data.by_device,
      bySource: data.by_source,
      byErrorType: data.by_error_type,
      trend: data.trend,
      stackedMonthDevice: data.stacked_month_device,
      stackedDeviceErrorType: data.stacked_device_error_type,
      causeDonut: data.cause_donut,
      stackedDeviceCause: data.stacked_device_cause,
    };
  }, [overview?.charts]);

  const recurringIssues = useMemo<ExternalErrorRecurringIssue[]>(
    () => overview?.recurring?.data ?? [],
    [overview?.recurring?.data]
  );

  const sourceOptions = useMemo(
    () =>
      (summary?.by_source || []).map((item) => ({
        label: item.label,
        value: item.label,
      })),
    [summary?.by_source]
  );

  const deviceOptions = useMemo(
    () =>
      (summary?.by_device || []).map((item) => ({
        label: item.label,
        value: item.label,
      })),
    [summary?.by_device]
  );

  const errorTypeOptions = useMemo(
    () =>
      errorGroups.map((item) => ({
        label: item.group_name,
        value: item.group_code,
      })),
    [errorGroups]
  );

  const causeGroupOptions = useMemo(
    () =>
      causeGroups.map((item) => ({
        label: item.cause_name,
        value: item.cause_code,
      })),
    [causeGroups]
  );

  const appliedFilterCount = useMemo(() => {
    const defaultFilters = createDefaultFilters();
    const hasCustomDateRange =
      appliedFilters.dateField !== defaultFilters.dateField ||
      appliedFilters.dateFrom !== defaultFilters.dateFrom ||
      appliedFilters.dateTo !== defaultFilters.dateTo;

    return (
      [
        appliedFilters.source,
        appliedFilters.device,
        appliedFilters.errorType,
        appliedFilters.causeGroup,
        appliedFilters.status,
        appliedFilters.needReview,
        appliedFilters.q,
      ].filter(Boolean).length + (hasCustomDateRange ? 1 : 0)
    );
  }, [
    appliedFilters.causeGroup,
    appliedFilters.dateField,
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
    appliedFilters.device,
    appliedFilters.errorType,
    appliedFilters.needReview,
    appliedFilters.q,
    appliedFilters.source,
    appliedFilters.status,
  ]);

  const hasPendingFilters = useMemo(
    () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
    [appliedFilters, draftFilters]
  );

  const setGranularity = useCallback((g: GranularityMode) => {
    setGranularityState(g);
    const range = getGranularityDateRange(g);
    setDraftFilters((curr) => ({
      ...curr,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }));
    setAppliedFilters((curr) => ({
      ...curr,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }));
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ext_err_dashboard_dateFrom", range.dateFrom);
      sessionStorage.setItem("ext_err_dashboard_dateTo", range.dateTo);
    }
  }, []);

  const setCompareMode = useCallback((c: CompareMode) => {
    setCompareModeState(c);
  }, []);

  return {
    granularity,
    setGranularity,
    compareMode,
    setCompareMode,
    dateField: draftFilters.dateField,
    setDateField: (value: string) => updateDraftFilter("dateField", value),
    dateFrom: draftFilters.dateFrom,
    setDateFrom: (value: string) => updateDraftFilter("dateFrom", value),
    dateTo: draftFilters.dateTo,
    setDateTo: (value: string) => updateDraftFilter("dateTo", value),
    source: draftFilters.source,
    setSource: (value: string) => updateDraftFilter("source", value),
    device: draftFilters.device,
    setDevice: (value: string) => updateDraftFilter("device", value),
    errorType: draftFilters.errorType,
    setErrorType: (value: string) => updateDraftFilter("errorType", value),
    causeGroup: draftFilters.causeGroup,
    setCauseGroup: (value: string) => updateDraftFilter("causeGroup", value),
    status: draftFilters.status,
    setStatus: (value: string) => updateDraftFilter("status", value),
    needReview: draftFilters.needReview,
    setNeedReview: (value: string) => updateDraftFilter("needReview", value),
    q: draftFilters.q,
    setQ: (value: string) => updateDraftFilter("q", value),
    params,
    summary,
    charts,
    recurringIssues,
    widgets: [] as ExternalErrorWidget[],
    errorGroups,
    causeGroups,
    sourceOptions,
    deviceOptions,
    errorTypeOptions,
    causeGroupOptions,
    catalogsLoading,
    loading,
    fetching,
    error,
    reload: () => loadDashboard(true),
    ensureCatalogs,
    applyFilters,
    resetDraftDateRange,
    clearFilter,
    appliedFilterCount,
    hasPendingFilters,
  };
}
