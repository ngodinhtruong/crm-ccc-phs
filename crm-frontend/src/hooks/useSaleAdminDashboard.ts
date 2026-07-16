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

function currentYear() {
  return String(new Date().getFullYear());
}

function currentMonth() {
  return String(new Date().getMonth() + 1);
}

export function useSaleAdminDashboard() {
  const router = useRouter();

  const [data, setData] = useState<SaAdminDashboardResponse | null>(null);
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(currentMonth());
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [error, setError] = useState("");

  const params = useMemo<SaAdminDashboardParams>(
    () => ({
      year,
      month,
      branch,
    }),
    [branch, month, year]
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
      setError(getErrorMessage(err, "Không tải được Dashboard Sale Admin"));
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
    const nextParams = {
      year: currentYear(),
      month: currentMonth(),
      branch: "",
    };

    setYear(nextParams.year);
    setMonth(nextParams.month);
    setBranch(nextParams.branch);
    void loadDashboard(nextParams);
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
  };
}

export type SaleAdminDashboardController = ReturnType<typeof useSaleAdminDashboard>;
