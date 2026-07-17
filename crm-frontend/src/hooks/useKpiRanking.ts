"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PermissionCode,
  useCurrentUserPermissions,
} from "@/hooks/useCurrentUserPermissions";
import { useDebounce } from "@/hooks/useDebounce";
import { useTablePagination } from "@/hooks/useTablePagination";
import { kpiRankingService } from "@/services/kpi-ranking.service";
import { KpiPeriodItem } from "@/types/kpi-dashboard.type";
import {
  KpiRankingCategory,
  KpiRankingParams,
  KpiRankingResponse,
  KpiRankingStatus,
} from "@/types/kpi-ranking.type";

const PAGE_SIZE = 20;

export const KPI_RANKING_STATUSES: { value: KpiRankingStatus; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "HAS_DATA", label: "Đã có điểm" },
  { value: "NO_DATA", label: "Chưa có điểm" },
  { value: "GATE_PASSED", label: "Đạt điều kiện cổng" },
  { value: "GATE_FAILED", label: "Không đạt điều kiện cổng" },
];

const DEFAULT_CATEGORIES: { value: KpiRankingCategory; label: string }[] = [
  { value: "TOTAL", label: "Tổng điểm" },
  { value: "MANUAL", label: "Bảng A" },
  { value: "AUTO", label: "Bảng B" },
  { value: "FEE", label: "Phí giao dịch" },
  { value: "REACTIVATED", label: "Tái kích hoạt" },
  { value: "GATE", label: "Điều kiện cổng" },
];

function formatApiErrorData(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(String).join(" ");

  if (typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) => {
        if (typeof value === "string") return key === "detail" ? value : `${key}: ${value}`;
        if (Array.isArray(value)) return `${key}: ${value.map(String).join(" ")}`;
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join(" ");
  }

  return String(data);
}

function getCurrentMonthPeriodDefault(periods: KpiPeriodItem[]) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthPeriod = periods.find(
    (item) => item.year === currentYear && Number(item.month) === currentMonth
  );

  if (currentMonthPeriod) return String(currentMonthPeriod.id);

  const active = periods.find((item) => item.status === "ACTIVE");
  const draft = periods.find((item) => item.status === "DRAFT");

  return String(active?.id || draft?.id || periods[0]?.id || "");
}

export function useKpiRanking() {
  const authz = useCurrentUserPermissions();

  const canView =
    authz.hasPermission(PermissionCode.KPI_DASHBOARD_VIEW_BRANCH) ||
    authz.hasPermission(PermissionCode.KPI_DASHBOARD_VIEW_ALL) ||
    authz.hasPermission(PermissionCode.SA_KPI_VIEW_BRANCH);

  const [periods, setPeriods] = useState<KpiPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [category, setCategory] = useState<KpiRankingCategory>("TOTAL");
  const [status, setStatus] = useState<KpiRankingStatus>("ALL");
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");

  const [data, setData] = useState<KpiRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [error, setError] = useState("");

  const debouncedQ = useDebounce(q, 400);
  const debouncedBranch = useDebounce(branch, 400);

  const pagination = useTablePagination(data?.items.length || 0, PAGE_SIZE);

  const selectedPeriod = useMemo(
    () => periods.find((item) => String(item.id) === selectedPeriodId) || null,
    [periods, selectedPeriodId]
  );

  const params = useMemo<KpiRankingParams>(
    () => ({
      period: selectedPeriodId,
      profile_code: "SA",
      category,
      status,
      q: debouncedQ.trim(),
      branch: debouncedBranch.trim(),
    }),
    [category, debouncedBranch, debouncedQ, selectedPeriodId, status]
  );

  const items = useMemo(() => {
    const allItems = data?.items || [];
    const startIndex = (pagination.page - 1) * pagination.pageSize;

    return allItems.slice(startIndex, startIndex + pagination.pageSize);
  }, [data?.items, pagination.page, pagination.pageSize]);

  const categories = data?.categories?.length ? data.categories : DEFAULT_CATEGORIES;

  const loadPeriods = useCallback(async () => {
    const periodData = await kpiRankingService.getPeriods();
    setPeriods(periodData);
    setSelectedPeriodId((current) => {
      const currentStillExists = current && periodData.some((item) => String(item.id) === current);
      if (currentStillExists) return current;
      return getCurrentMonthPeriodDefault(periodData);
    });
  }, []);

  const loadRanking = useCallback(async () => {
    if (!selectedPeriodId) return;

    try {
      setLoadingRanking(true);
      setError("");
      const rankingData = await kpiRankingService.getRanking(params);
      setData(rankingData);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được bảng xếp hạng KPI"));
    } finally {
      setLoadingRanking(false);
    }
  }, [params, selectedPeriodId]);

  const reloadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await loadPeriods();
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách kỳ KPI"));
    } finally {
      setLoading(false);
    }
  }, [loadPeriods]);

  useEffect(() => {
    if (!authz.loading && canView) {
      void reloadAll();
    }

    if (!authz.loading && !canView) {
      setLoading(false);
    }
  }, [authz.loading, canView, reloadAll]);

  useEffect(() => {
    if (selectedPeriodId) {
      pagination.resetPage();
      void loadRanking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRanking, selectedPeriodId]);

  const search = () => {
    pagination.resetPage();
    void loadRanking();
  };

  const clearFilter = () => {
    setQ("");
    setBranch("");
    setStatus("ALL");
    setCategory("TOTAL");
    pagination.resetPage();
  };

  const previousPage = () => {
    pagination.setSafePage(pagination.page - 1);
  };

  const nextPage = () => {
    pagination.setSafePage(pagination.page + 1);
  };

  return {
    authz,
    canView,

    periods,
    selectedPeriod,
    selectedPeriodId,
    setSelectedPeriodId,

    category,
    setCategory,
    status,
    setStatus,
    q,
    setQ,
    branch,
    setBranch,

    data,
    items,
    allItems: data?.items || [],
    filteredCount: data?.items.length || 0,
    hasSummaryCount: data?.has_summary_count || 0,
    noSummaryCount: data?.no_summary_count || 0,

    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
    fromRecord: pagination.fromRecord,
    toRecord: pagination.toRecord,
    previousPage,
    nextPage,

    categories,
    statuses: KPI_RANKING_STATUSES,

    loading: authz.loading || loading,
    loadingRanking,
    error: error || authz.error,
    params,

    search,
    clearFilter,
    reloadAll,
    loadRanking,
  };
}

export type KpiRankingController = ReturnType<typeof useKpiRanking>;
