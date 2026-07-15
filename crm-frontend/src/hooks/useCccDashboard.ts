"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as {
    response?: {
      status?: number;
      data?: unknown;
    };
    message?: string;
  };

  const status = error?.response?.status || "unknown";
  const detail = error?.response?.data
    ? JSON.stringify(error.response.data)
    : error?.message;

  return `${fallback}. Status: ${status} - ${detail}`;
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

  const [period, setPeriod] = useState(getCurrentPeriod());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
    const nextPeriod = getCurrentPeriod();

    setPeriod(nextPeriod);
    setDateFrom("");
    setDateTo("");
    setStatus("");
    setCategory("");
    setSource("");
    setAccountLinkStatus("");
    setVipTier("");
    setQ("");
    setErrorGroup("");
    setErrorType("");
    setRelatedSystem("");

    void loadDashboard({ period: nextPeriod, recent_limit: 10 });
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
    void loadDashboard({ period: getCurrentPeriod(), recent_limit: 10 });

    // Chỉ load lần đầu khi vào dashboard, không tự reload theo từng ký tự filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!errorGroup) return;

    const selectedTypeStillValid = errorTypes.some(
      (item) => String(item.id) === errorType && String(item.group || "") === errorGroup
    );

    if (!selectedTypeStillValid) {
      setErrorType("");
    }
  }, [errorGroup, errorType, errorTypes]);

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
  };
}

export type CccDashboardController = ReturnType<typeof useCccDashboard>;
