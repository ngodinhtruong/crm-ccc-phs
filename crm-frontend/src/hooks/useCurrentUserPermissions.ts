"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { accountService } from "@/services/account.service";
import { authService } from "@/services/auth.service";
import { CurrentUser } from "@/types/account.type";

export const PermissionCode = {
  SA_RECORD_VIEW: "SA_RECORD_VIEW",
  SA_RECORD_CREATE: "SA_RECORD_CREATE",
  SA_RECORD_UPDATE: "SA_RECORD_UPDATE",
  SA_RECORD_DELETE: "SA_RECORD_DELETE",
  SA_RECORD_IMPORT: "SA_RECORD_IMPORT",
  SA_RECORD_AUDIT_VIEW: "SA_RECORD_AUDIT_VIEW",

  SA_KPI_VIEW_SELF: "SA_KPI_VIEW_SELF",
  SA_KPI_VIEW_BRANCH: "SA_KPI_VIEW_BRANCH",
  SA_KPI_CONFIG: "SA_KPI_CONFIG",
  SA_DASHBOARD_VIEW: "SA_DASHBOARD_VIEW",

  KPI_DASHBOARD_VIEW_SELF: "KPI_DASHBOARD_VIEW_SELF",
  KPI_DASHBOARD_VIEW_BRANCH: "KPI_DASHBOARD_VIEW_BRANCH",
  KPI_DASHBOARD_VIEW_ALL: "KPI_DASHBOARD_VIEW_ALL",

  KPI_MANUAL_SCORE_VIEW: "KPI_MANUAL_SCORE_VIEW",
  KPI_MANUAL_SCORE_UPDATE: "KPI_MANUAL_SCORE_UPDATE",

  KPI_TARGET_VIEW: "KPI_TARGET_VIEW",
  KPI_TARGET_MANAGE: "KPI_TARGET_MANAGE",

  KPI_CONFIG_VIEW: "KPI_CONFIG_VIEW",
  KPI_CONFIG_MANAGE: "KPI_CONFIG_MANAGE",

  KPI_GATE_VIEW: "KPI_GATE_VIEW",
  KPI_GATE_MANAGE: "KPI_GATE_MANAGE",

  KPI_REWARD_VIEW: "KPI_REWARD_VIEW",
  KPI_REWARD_MANAGE: "KPI_REWARD_MANAGE",

  KPI_REPORT_EXPORT: "KPI_REPORT_EXPORT",
  KPI_AUTO_CALCULATE: "KPI_AUTO_CALCULATE",

  CUSTOMER_360_VIEW: "CUSTOMER_360_VIEW",
} as const;

function getPermissionCodes(user?: CurrentUser | null): string[] {
  if (!user) return [];

  const fromPermissionCodes = user.permission_codes || [];

  const fromPermissions =
    user.permissions?.map((item) => item.permission_code).filter(Boolean) || [];

  return Array.from(new Set([...fromPermissionCodes, ...fromPermissions]));
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

export function useCurrentUserPermissions() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!authService.isAuthenticated()) {
        router.push("/login");
        return;
      }

      const data = await accountService.getMe();
      setCurrentUser(data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được thông tin quyền"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const permissionCodes = useMemo(
    () => getPermissionCodes(currentUser),
    [currentUser]
  );

  const hasPermission = (permissionCode: string) => {
    if (!currentUser) return false;

    if (currentUser.is_superuser || currentUser.is_global_admin) {
      return true;
    }

    return permissionCodes.includes(permissionCode);
  };

  return {
    currentUser,
    loading,
    error,
    permissionCodes,
    hasPermission,
    reload: loadCurrentUser,
  };
}