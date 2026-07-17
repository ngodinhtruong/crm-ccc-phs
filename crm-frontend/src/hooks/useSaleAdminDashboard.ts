"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { saleAdminDashboardService } from "@/services/sale-admin-dashboard.service";
import {
  SaAdminDashboardParams,
  SaAdminDashboardResponse,
} from "@/types/sale-admin-dashboard.type";

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

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end),
  };
}

function monthRangeFromDate(dateFrom: string, offset: number) {
  const base = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end),
  };
}

function yearFromDate(value: string) {
  return String(new Date(`${value}T00:00:00`).getFullYear());
}

function monthFromDate(value: string) {
  return String(new Date(`${value}T00:00:00`).getMonth() + 1);
}

export function useSaleAdminDashboard() {
  const router = useRouter();
  const defaultRange = currentMonthRange();

  const [data, setData] = useState<SaAdminDashboardResponse | null>(null);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [error, setError] = useState("");

  const year = useMemo(() => yearFromDate(dateFrom), [dateFrom]);
  const month = useMemo(() => monthFromDate(dateFrom), [dateFrom]);

  const params = useMemo<SaAdminDashboardParams>(
    () => ({
      year,
      month,
      date_from: dateFrom,
      date_to: dateTo,
      branch,
    }),
    [branch, dateFrom, dateTo, month, year]
  );

  const loadDashboard = async (
    customParams: SaAdminDashboardParams = params,
    options: { background?: boolean } = {}
  ) => {
    try {
      if (options.background) {
        setBackgroundRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const response = await saleAdminDashboardService.getDashboard(customParams);
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được báo cáo Sale Admin"));
    } finally {
      setLoading(false);
      setBackgroundRefreshing(false);
    }
  };

  const search = () => {
    void loadDashboard(params);
  };

  const refresh = () => {
    void loadDashboard(params, { background: true });
  };

  const clearFilter = () => {
    const nextRange = currentMonthRange();
    const nextParams = {
      year: yearFromDate(nextRange.dateFrom),
      month: monthFromDate(nextRange.dateFrom),
      date_from: nextRange.dateFrom,
      date_to: nextRange.dateTo,
      branch: "",
    };

    setDateFrom(nextRange.dateFrom);
    setDateTo(nextRange.dateTo);
    setBranch("");
    void loadDashboard(nextParams);
  };

  const changeMonth = (offset: number) => {
    const nextRange = monthRangeFromDate(dateFrom, offset);
    const nextParams = {
      ...params,
      year: yearFromDate(nextRange.dateFrom),
      month: monthFromDate(nextRange.dateFrom),
      date_from: nextRange.dateFrom,
      date_to: nextRange.dateTo,
    };

    setDateFrom(nextRange.dateFrom);
    setDateTo(nextRange.dateTo);
    void loadDashboard(nextParams, { background: true });
  };

  const previousMonth = () => changeMonth(-1);
  const nextMonth = () => changeMonth(1);

  const setYear = (value: string) => {
    const safeYear = Number(value || new Date().getFullYear());
    const safeMonth = Number(month || 1);
    const start = new Date(safeYear, safeMonth - 1, 1);
    const end = new Date(safeYear, safeMonth, 0);
    setDateFrom(toDateInputValue(start));
    setDateTo(toDateInputValue(end));
  };

  const setMonth = (value: string) => {
    const safeYear = Number(year || new Date().getFullYear());
    const safeMonth = Number(value || 1);
    const start = new Date(safeYear, safeMonth - 1, 1);
    const end = new Date(safeYear, safeMonth, 0);
    setDateFrom(toDateInputValue(start));
    setDateTo(toDateInputValue(end));
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadDashboard(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    data,
    year,
    setYear,
    month,
    setMonth,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    branch,
    setBranch,

    loading,
    backgroundRefreshing,
    error,

    params,
    search,
    refresh,
    clearFilter,
    reload: refresh,
    previousMonth,
    nextMonth,
  };
}

export type SaleAdminDashboardController = ReturnType<typeof useSaleAdminDashboard>;
