"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { ticketService } from "@/services/ticket.service";
import {
  CccDashboardParams,
  CccDashboardResponse,
} from "@/types/ccc-dashboard.type";
import {
  TicketErrorGroupOption,
  TicketErrorTypeOption,
  TicketSourceOption,
  TicketStatusOption,
  TicketSupportCategoryOption,
} from "@/types/ticket.type";
import { getErrorMessage } from "@/utils/error.util";

const DASHBOARD_CACHE_TTL_MS = 180_000;
const MASTER_DATA_CACHE_TTL_MS = 30 * 60_000;

type DashboardCacheEntry = {
  data: CccDashboardResponse;
  expiresAt: number;
};

type MasterData = {
  supportCategories: TicketSupportCategoryOption[];
  statuses: TicketStatusOption[];
  sources: TicketSourceOption[];
  errorGroups: TicketErrorGroupOption[];
  errorTypes: TicketErrorTypeOption[];
};

type MasterDataCacheEntry = {
  data: MasterData;
  expiresAt: number;
};

const dashboardCache = new Map<string, DashboardCacheEntry>();
const dashboardRequests = new Map<string, Promise<CccDashboardResponse>>();

let masterDataCache: MasterDataCacheEntry | null = null;
let masterDataRequest: Promise<MasterData> | null = null;

function getCurrentYearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getCurrentMonthEnd() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

  return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
}

function buildDefaultParams(initialStatus = ""): CccDashboardParams {
  return {
    period: "",
    date_from: getCurrentYearStart(),
    date_to: getCurrentDate(),
    status: initialStatus,
    recent_limit: 10,
  };
}

function withoutRefresh(params: CccDashboardParams): CccDashboardParams {
  const result = { ...params };
  delete result.refresh;
  return result;
}

function getSessionCacheNamespace() {
  if (typeof window === "undefined") return "server";

  const token =
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("refresh_token") ||
    "anonymous";

  return token.slice(-24);
}

function buildDashboardCacheKey(params: CccDashboardParams) {
  const normalizedParams = withoutRefresh(params);
  const sortedEntries = Object.entries(normalizedParams)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right));

  return `${getSessionCacheNamespace()}:${JSON.stringify(sortedEntries)}`;
}

async function getDashboardData(
  params: CccDashboardParams,
  forceRefresh = false
): Promise<CccDashboardResponse> {
  const cacheKey = buildDashboardCacheKey(params);
  const now = Date.now();

  if (!forceRefresh) {
    const cached = dashboardCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  } else {
    dashboardCache.delete(cacheKey);
  }

  const requestKey = `${forceRefresh ? "refresh" : "normal"}:${cacheKey}`;
  const existingRequest = dashboardRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = ticketService
    .getCccDashboard({
      ...withoutRefresh(params),
      ...(forceRefresh ? { refresh: true } : {}),
    })
    .then((response) => {
      dashboardCache.set(cacheKey, {
        data: response,
        expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      });
      return response;
    })
    .finally(() => {
      dashboardRequests.delete(requestKey);
    });

  dashboardRequests.set(requestKey, request);
  return request;
}

async function getMasterData(): Promise<MasterData> {
  const now = Date.now();
  if (masterDataCache && masterDataCache.expiresAt > now) {
    return masterDataCache.data;
  }

  if (masterDataRequest) {
    return masterDataRequest;
  }

  masterDataRequest = Promise.all([
    ticketService.getSupportCategories(),
    ticketService.getStatuses(),
    ticketService.getSources(),
    ticketService.getErrorGroups(),
    ticketService.getErrorTypes(),
  ])
    .then(
      ([supportCategories, statuses, sources, errorGroups, errorTypes]) => {
        const data: MasterData = {
          supportCategories,
          statuses,
          sources,
          errorGroups,
          errorTypes,
        };

        masterDataCache = {
          data,
          expiresAt: Date.now() + MASTER_DATA_CACHE_TTL_MS,
        };

        return data;
      }
    )
    .finally(() => {
      masterDataRequest = null;
    });

  return masterDataRequest;
}

export function useCccDashboard(initialStatus: string = "") {
  const router = useRouter();

  const initialParamsRef = useRef<CccDashboardParams>(
    buildDefaultParams(initialStatus)
  );
  const appliedParamsRef = useRef<CccDashboardParams>(initialParamsRef.current);
  const requestSequenceRef = useRef(0);
  const dataRef = useRef<CccDashboardResponse | null>(null);

  const [data, setData] = useState<CccDashboardResponse | null>(null);
  const [appliedParams, setAppliedParams] = useState<CccDashboardParams>(
    initialParamsRef.current
  );

  const [supportCategories, setSupportCategories] = useState<
    TicketSupportCategoryOption[]
  >([]);
  const [statuses, setStatuses] = useState<TicketStatusOption[]>([]);
  const [sources, setSources] = useState<TicketSourceOption[]>([]);
  const [errorGroups, setErrorGroups] = useState<TicketErrorGroupOption[]>([]);
  const [errorTypes, setErrorTypes] = useState<TicketErrorTypeOption[]>([]);

  const [period, setPeriod] = useState("");
  const [dateFrom, setDateFrom] = useState(getCurrentYearStart());
  const [dateTo, setDateTo] = useState(getCurrentDate());
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [accountLinkStatus, setAccountLinkStatus] = useState("");
  const [vipTier, setVipTier] = useState("");
  const [q, setQ] = useState("");
  const [errorGroup, setErrorGroup] = useState("");
  const [errorType, setErrorType] = useState("");
  const [relatedSystem, setRelatedSystem] = useState("");

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterLoaded, setMasterLoaded] = useState(false);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const filteredErrorTypes = useMemo(() => {
    if (!errorGroup) return errorTypes;

    return errorTypes.filter(
      (item) => String(item.group || "") === errorGroup
    );
  }, [errorGroup, errorTypes]);

  const buildParams = useCallback(
    (override: Partial<CccDashboardParams> = {}): CccDashboardParams => ({
      period: dateFrom || dateTo ? "" : period,
      date_from: dateFrom,
      date_to: dateTo,
      status,
      category,
      source,
      account_link_status: accountLinkStatus,
      vip_tier: vipTier,
      q,
      error_group: errorGroup,
      error_type: errorType,
      related_system: relatedSystem,
      recent_limit: 10,
      ...override,
    }),
    [
      accountLinkStatus,
      category,
      dateFrom,
      dateTo,
      errorGroup,
      errorType,
      period,
      q,
      relatedSystem,
      source,
      status,
      vipTier,
    ]
  );

  const loadDashboard = useCallback(
    async (
      params: CccDashboardParams,
      options: { forceRefresh?: boolean } = {}
    ) => {
      const sequence = ++requestSequenceRef.current;
      const isInitialLoad = dataRef.current === null;

      if (isInitialLoad) {
        setLoading(true);
      } else {
        setFetching(true);
      }
      setError("");

      try {
        const response = await getDashboardData(
          params,
          Boolean(options.forceRefresh)
        );

        if (sequence !== requestSequenceRef.current) return;

        const normalizedParams = withoutRefresh(params);
        dataRef.current = response;
        appliedParamsRef.current = normalizedParams;
        setData(response);
        setAppliedParams(normalizedParams);
      } catch (err) {
        if (sequence !== requestSequenceRef.current) return;
        setError(getErrorMessage(err, "Không tải được Dashboard CCC"));
      } finally {
        if (sequence === requestSequenceRef.current) {
          setLoading(false);
          setFetching(false);
        }
      }
    },
    []
  );

  const ensureMasterData = useCallback(async () => {
    if (masterLoaded) return;

    try {
      setMasterLoading(true);
      setMasterError("");

      const masterData = await getMasterData();
      setSupportCategories(masterData.supportCategories);
      setStatuses(masterData.statuses);
      setSources(masterData.sources);
      setErrorGroups(masterData.errorGroups);
      setErrorTypes(masterData.errorTypes);
      setMasterLoaded(true);
    } catch (err) {
      setMasterError(
        getErrorMessage(err, "Không tải được bộ lọc Dashboard CCC")
      );
    } finally {
      setMasterLoading(false);
    }
  }, [masterLoaded]);

  const search = useCallback(() => {
    void loadDashboard(buildParams());
  }, [buildParams, loadDashboard]);

  const clearFilter = useCallback(() => {
    const params = buildDefaultParams(initialStatus);

    setPeriod("");
    setDateFrom(params.date_from || "");
    setDateTo(params.date_to || "");
    setStatus(initialStatus);
    setCategory("");
    setSource("");
    setAccountLinkStatus("");
    setVipTier("");
    setQ("");
    setErrorGroup("");
    setErrorType("");
    setRelatedSystem("");

    void loadDashboard(params);
  }, [initialStatus, loadDashboard]);

  const reload = useCallback(() => {
    void loadDashboard(appliedParamsRef.current, {
      forceRefresh: true,
    });
  }, [loadDashboard]);

  const setThisMonth = useCallback(() => {
    const start = getCurrentMonthStart();
    const end = getCurrentMonthEnd();
    const params = buildParams({
      period: "",
      date_from: start,
      date_to: end,
    });

    setPeriod("");
    setDateFrom(start);
    setDateTo(end);
    void loadDashboard(params);
  }, [buildParams, loadDashboard]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const params = buildDefaultParams(initialStatus);
    initialParamsRef.current = params;
    appliedParamsRef.current = params;

    setStatus(initialStatus);
    setDateFrom(params.date_from || "");
    setDateTo(params.date_to || "");
    void loadDashboard(params);
  }, [initialStatus, loadDashboard, router]);

  useEffect(() => {
    if (!errorGroup) return;

    const selectedTypeStillValid = errorTypes.some(
      (item) =>
        String(item.id) === errorType &&
        String(item.group || "") === errorGroup
    );

    if (!selectedTypeStillValid) {
      setErrorType("");
    }
  }, [errorGroup, errorType, errorTypes]);

  const activeFilterCount = useMemo(() => {
    const defaultParams = buildDefaultParams(initialStatus);
    let count = 0;

    if (appliedParams.date_from !== defaultParams.date_from) count += 1;
    if (appliedParams.date_to !== defaultParams.date_to) count += 1;

    [
      appliedParams.period,
      appliedParams.status && appliedParams.status !== initialStatus
        ? appliedParams.status
        : "",
      appliedParams.category,
      appliedParams.source,
      appliedParams.account_link_status,
      appliedParams.vip_tier,
      appliedParams.q,
      appliedParams.error_group,
      appliedParams.error_type,
      appliedParams.related_system,
    ].forEach((value) => {
      if (value) count += 1;
    });

    return count;
  }, [appliedParams, initialStatus]);

  return {
    data,
    appliedParams,
    activeFilterCount,
    supportCategories,
    statuses,
    sources,
    errorGroups,
    errorTypes,
    filteredErrorTypes,

    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    status,
    setStatus,
    category,
    setCategory,
    source,
    setSource,
    accountLinkStatus,
    setAccountLinkStatus,
    vipTier,
    setVipTier,
    q,
    setQ,
    errorGroup,
    setErrorGroup,
    errorType,
    setErrorType,
    relatedSystem,
    setRelatedSystem,

    loading,
    fetching,
    masterLoading,
    masterLoaded,
    error,
    masterError,
    ensureMasterData,
    search,
    clearFilter,
    reload,
    setThisMonth,
  };
}

export type CccDashboardController = ReturnType<typeof useCccDashboard>;
