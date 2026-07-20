"use client";
import { getErrorMessage } from "@/utils/error.util";

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

function getCurrentYearStart() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function getCurrentYearEnd() {
  const now = new Date();
  return `${now.getFullYear()}-12-31`;
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
  const nextMonth = new Date(year, now.getMonth() + 1, 0); // Last day of month
  const endDay = String(nextMonth.getDate()).padStart(2, "0");
  return `${year}-${month}-${endDay}`;
}

export function useCccDashboard() {
  const router = useRouter();

  const [data, setData] = useState<CccDashboardResponse | null>(null);

  const [supportCategories, setSupportCategories] = useState<
    TicketSupportCategoryOption[]
  >([]);
  const [statuses, setStatuses] = useState<TicketStatusOption[]>([]);
  const [sources, setSources] = useState<TicketSourceOption[]>([]);
  const [errorGroups, setErrorGroups] = useState<TicketErrorGroupOption[]>([]);
  const [errorTypes, setErrorTypes] = useState<TicketErrorTypeOption[]>([]);

  const [period, setPeriod] = useState("");
  const [dateFrom, setDateFrom] = useState(getCurrentYearStart());
  const [dateTo, setDateTo] = useState(getCurrentYearEnd());
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [accountLinkStatus, setAccountLinkStatus] = useState("");
  const [vipTier, setVipTier] = useState("");
  const [q, setQ] = useState("");
  const [errorGroup, setErrorGroup] = useState("");
  const [errorType, setErrorType] = useState("");
  const [relatedSystem, setRelatedSystem] = useState("");

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const filteredErrorTypes = useMemo(() => {
    if (!errorGroup) return errorTypes;

    return errorTypes.filter((item) => String(item.group || "") === errorGroup);
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
    async (params?: CccDashboardParams) => {
      try {
        setLoading(true);
        setError("");

        const response = await ticketService.getCccDashboard(
          params || buildParams()
        );

        setData(response);
      } catch (err) {
        setError(getErrorMessage(err, "Không tải được Dashboard CCC"));
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  const loadMasterData = useCallback(async () => {
    try {
      setMasterLoading(true);
      setMasterError("");

      const [categoryData, statusData, sourceData, errorGroupData, errorTypeData] =
        await Promise.all([
          ticketService.getSupportCategories(),
          ticketService.getStatuses(),
          ticketService.getSources(),
          ticketService.getErrorGroups(),
          ticketService.getErrorTypes(),
        ]);

      setSupportCategories(categoryData);
      setStatuses(statusData);
      setSources(sourceData);
      setErrorGroups(errorGroupData);
      setErrorTypes(errorTypeData);
    } catch (err) {
      setMasterError(getErrorMessage(err, "Không tải được bộ lọc Dashboard CCC"));
    } finally {
      setMasterLoading(false);
    }
  }, []);

  const search = () => {
    void loadDashboard(buildParams());
  };

  const clearFilter = () => {
    setPeriod("");
    setDateFrom(getCurrentYearStart());
    setDateTo(getCurrentYearEnd());
    setStatus("");
    setCategory("");
    setSource("");
    setAccountLinkStatus("");
    setVipTier("");
    setQ("");
    setErrorGroup("");
    setErrorType("");
    setRelatedSystem("");

    void loadDashboard({ date_from: getCurrentYearStart(), date_to: getCurrentYearEnd(), recent_limit: 10 });
  };

  const reload = () => {
    void loadDashboard(buildParams());
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadMasterData();
    void loadDashboard({ date_from: getCurrentYearStart(), date_to: getCurrentYearEnd(), recent_limit: 10 });

    // Chỉ load lần đầu khi vào dashboard, không tự reload theo từng ký tự filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      void reloadRef.current();
    }, 120000); // 120 seconds

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (!errorGroup) return;

    const selectedTypeStillValid = errorTypes.some(
      (item) => String(item.id) === errorType && String(item.group || "") === errorGroup
    );

    if (!selectedTypeStillValid) {
      setErrorType("");
    }
  }, [errorGroup, errorType, errorTypes]);

  const setThisMonth = useCallback(() => {
    const start = getCurrentMonthStart();
    const end = getCurrentMonthEnd();
    setPeriod("");
    setDateFrom(start);
    setDateTo(end);
    void loadDashboard(
      buildParams({ date_from: start, date_to: end, period: "" })
    );
  }, [buildParams, loadDashboard]);

  return {
    data,
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
    masterLoading,
    error,
    masterError,
    search,
    clearFilter,
    reload,
    setThisMonth,
  };
}

export type CccDashboardController = ReturnType<typeof useCccDashboard>;
