"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { saleAdminDashboardService } from "@/services/sale-admin-dashboard.service";
import {
  SaAdminDashboardParams,
  SaAdminDashboardResponse,
} from "@/types/sale-admin-dashboard.type";
import { getErrorMessage } from "@/utils/error.util";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function last5MonthsRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end),
  };
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

function isLastDayOfMonth(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  const nextDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return nextDay.getDate() === 1;
}

function shiftDateByMonths(dateStr: string, monthOffset: number, keepEndOfMonth = false): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;

  if (keepEndOfMonth) {
    const targetMonthStart = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
    const targetMonthEnd = new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth() + 1, 0);
    return toDateInputValue(targetMonthEnd);
  }

  const targetDate = new Date(d.getFullYear(), d.getMonth() + monthOffset, d.getDate());
  if (targetDate.getMonth() !== (d.getMonth() + monthOffset + 1200) % 12) {
    const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 0);
    return toDateInputValue(lastDayOfTargetMonth);
  }
  return toDateInputValue(targetDate);
}

function getSingleMonthRange(referenceDateStr: string, offset: number) {
  const d = new Date(`${referenceDateStr}T00:00:00`);
  const ref = isNaN(d.getTime()) ? new Date() : d;
  const start = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + offset + 1, 0);

  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end),
  };
}

function getShiftedRange(dateFrom: string, dateTo: string, offset: number) {
  if (offset === 0) {
    return { dateFrom, dateTo };
  }

  const fromDate = new Date(`${dateFrom}T00:00:00`);
  const toDate = new Date(`${dateTo}T00:00:00`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return monthRangeFromDate(dateFrom, offset);
  }

  const isToLastDay = isLastDayOfMonth(dateTo);
  const shiftedFrom = shiftDateByMonths(dateFrom, offset, false);
  const shiftedTo = shiftDateByMonths(dateTo, offset, isToLastDay);

  return {
    dateFrom: shiftedFrom,
    dateTo: shiftedTo,
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
  const defaultRange = last5MonthsRange();

  const [data, setData] = useState<SaAdminDashboardResponse | null>(null);
  const [historyData, setHistoryData] = useState<SaAdminDashboardResponse[]>([]);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

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
    const requestId = ++requestIdRef.current;

    try {
      if (options.background) {
        setBackgroundRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const targetFrom = customParams.date_from || dateFrom;
      const targetTo = customParams.date_to || dateTo;
      const monthOffsets = [-4, -3, -2, -1, 0];

      const multiMonthParams = monthOffsets.map((offset) => {
        if (offset === 0) {
          return {
            ...customParams,
            year: yearFromDate(targetFrom),
            month: monthFromDate(targetFrom),
            date_from: targetFrom,
            date_to: targetTo,
          };
        }

        const range = getSingleMonthRange(targetTo, offset);
        return {
          ...customParams,
          year: yearFromDate(range.dateFrom),
          month: monthFromDate(range.dateFrom),
          date_from: range.dateFrom,
          date_to: range.dateTo,
        };
      });

      const responses = await Promise.all(
        multiMonthParams.map((p) => saleAdminDashboardService.getDashboard(p))
      );

      if (mountedRef.current && requestId === requestIdRef.current) {
        setHistoryData(responses);
        const currentTargetResponse = responses[responses.length - 1];
        setData(currentTargetResponse || null);
      }
    } catch (err) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(getErrorMessage(err, "Không tải được báo cáo Sale Admin"));
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
        setBackgroundRefreshing(false);
      }
    }
  };

  const search = () => {
    void loadDashboard(params);
  };

  const refresh = () => {
    void loadDashboard(params, { background: true });
  };

  const clearFilter = () => {
    const nextRange = last5MonthsRange();
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
    const df = toDateInputValue(start);
    const dt = toDateInputValue(end);
    setDateFrom(df);
    setDateTo(dt);
    void loadDashboard({ ...params, year: String(safeYear), month: String(safeMonth), date_from: df, date_to: dt });
  };

  const setMonth = (value: string) => {
    const safeYear = Number(year || new Date().getFullYear());
    const safeMonth = Number(value || 1);
    const start = new Date(safeYear, safeMonth - 1, 1);
    const end = new Date(safeYear, safeMonth, 0);
    const df = toDateInputValue(start);
    const dt = toDateInputValue(end);
    setDateFrom(df);
    setDateTo(dt);
    void loadDashboard({ ...params, year: String(safeYear), month: String(safeMonth), date_from: df, date_to: dt });
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Hoãn sang task kế tiếp để lần cleanup mô phỏng của React Strict Mode
    // có thể hủy timer trước khi request được gửi. Không abort HTTP request
    // qua Next proxy vì việc đó tạo ECONNRESET / socket hang up.
    const initialLoadTimer = window.setTimeout(() => {
      void loadDashboard(params);
    }, 0);

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      window.clearTimeout(initialLoadTimer);
    };
    // Chỉ tải lần đầu. Các thay đổi bộ lọc được áp dụng qua search/changeMonth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      // Không gọi API khi tab đang ẩn, tránh request thừa và tranh chấp request.
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    }, 120_000);

    return () => window.clearInterval(interval);
  }, []);

  return {
    data,
    historyData,
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
