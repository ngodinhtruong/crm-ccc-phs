"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PermissionCode,
  useCurrentUserPermissions,
} from "@/hooks/useCurrentUserPermissions";
import { saleAdminDashboardService } from "@/services/sale-admin-dashboard.service";
import { SaAdminDashboardPayload } from "@/types/sale-admin-dashboard.type";

const AUTO_REFRESH_MS = 60_000;

function getCurrentYearMonth() {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
  };
}

function getRoleCodes(user: unknown) {
  const currentUser = user as {
    role_codes?: string[];
    roles?: { role_code?: string | null }[];
  } | null;

  const fromRoleCodes = currentUser?.role_codes || [];
  const fromRoles =
    currentUser?.roles?.map((role) => role.role_code).filter(Boolean) || [];

  return Array.from(new Set([...fromRoleCodes, ...fromRoles])) as string[];
}

function hasAnyRole(roleCodes: string[], candidates: string[]) {
  return candidates.some((roleCode) => roleCodes.includes(roleCode));
}

function isSystemLikeUser(user: unknown) {
  const currentUser = user as {
    is_superuser?: boolean;
    is_global_admin?: boolean;
  } | null;

  if (currentUser?.is_superuser || currentUser?.is_global_admin) return true;

  return hasAnyRole(getRoleCodes(user), [
    "SYSTEM_ADMIN",
    "SA_ADMIN",
    "SA_MANAGER",
    "ADMIN",
    "BOM",
  ]);
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

export function useSaleAdminDashboard() {
  const authz = useCurrentUserPermissions();
  const defaultMonth = useMemo(() => getCurrentYearMonth(), []);

  const canView =
    authz.hasPermission(PermissionCode.KPI_DASHBOARD_VIEW_ALL) ||
    authz.hasPermission(PermissionCode.SA_DASHBOARD_VIEW) ||
    isSystemLikeUser(authz.currentUser);

  const [data, setData] = useState<SaAdminDashboardPayload | null>(null);
  const [year, setYear] = useState(defaultMonth.year);
  const [month, setMonth] = useState(defaultMonth.month);
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (options?: { silent?: boolean; params?: { year?: string; month?: string; branch?: string } }) => {
      if (!canView) {
        setLoading(false);
        return;
      }

      const silent = Boolean(options?.silent);

      try {
        if (silent) {
          setBackgroundRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const payload = await saleAdminDashboardService.getDashboard({
          year: options?.params?.year ?? year,
          month: options?.params?.month ?? month,
          branch: options?.params?.branch ?? branch,
        });

        setData(payload);
        setLastUpdatedAt(new Date().toISOString());
      } catch (err) {
        setError(getErrorMessage(err, "Không tải được dashboard quản trị Sale Admin"));
      } finally {
        if (silent) {
          setBackgroundRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [branch, canView, month, year]
  );

  useEffect(() => {
    if (authz.loading) return;
    void loadDashboard();
  }, [authz.loading, loadDashboard]);

  useEffect(() => {
    if (authz.loading || !canView) return;

    const timer = window.setInterval(() => {
      void loadDashboard({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [authz.loading, canView, loadDashboard]);

  const search = () => {
    void loadDashboard();
  };

  const clearFilter = () => {
    const current = getCurrentYearMonth();
    setYear(current.year);
    setMonth(current.month);
    setBranch("");
    void loadDashboard({ params: { year: current.year, month: current.month, branch: "" } });
  };

  const refresh = () => {
    void loadDashboard({ silent: Boolean(data) });
  };

  return {
    authz,
    canView,
    data,

    year,
    setYear,
    month,
    setMonth,
    branch,
    setBranch,

    loading: authz.loading || loading,
    backgroundRefreshing,
    error: error || authz.error,
    lastUpdatedAt,

    search,
    clearFilter,
    refresh,
  };
}

export type SaleAdminDashboardController = ReturnType<typeof useSaleAdminDashboard>;
