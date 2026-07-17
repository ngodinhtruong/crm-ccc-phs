"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { accountService } from "@/services/account.service";
import { authService } from "@/services/auth.service";
import { CurrentUser } from "@/types/account.type";
import {
  getActiveWorkspace,
  getDefaultPathByWorkspace,
  setActiveWorkspace,
  WorkspaceCode,
} from "@/utils/workspace.util";
import {
  getDefaultPathForWorkspaceByUser,
  isSaleAdminKpiHomeUser,
} from "@/utils/default-home.util";

function getRoleCodes(user: CurrentUser) {
  const fromRoleCodes = user.role_codes || [];
  const fromRoles = user.roles?.map((role) => role.role_code) || [];

  return Array.from(new Set([...fromRoleCodes, ...fromRoles]));
}

function isGlobalAdmin(user: CurrentUser) {
  const roleCodes = getRoleCodes(user);

  return (
    user.is_superuser ||
    user.is_global_admin ||
    roleCodes.includes("SYSTEM_ADMIN")
  );
}

function isSaleAdminPath(pathname: string) {
  return pathname.startsWith("/sale-admin");
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/accounts");
}

function isExternalErrorPath(pathname: string) {
  return pathname.startsWith("/external-errors");
}

function isCccPath(pathname: string) {
  return (
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/tickets") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/companies") ||
    pathname.startsWith("/sla") ||
    pathname.startsWith("/chatbots") ||
    pathname.startsWith("/dashboard") ||
    isExternalErrorPath(pathname)
  );
}

function isEntryPath(pathname: string) {
  return pathname === "/" || pathname === "/workspace";
}

function getFallbackPath(user: CurrentUser) {
  const groups = user.accessible_groups || [];

  if (isGlobalAdmin(user)) {
    return "/accounts/users";
  }

  if (isSaleAdminKpiHomeUser(user)) {
    return "/sale-admin/kpi";
  }

  if (groups.includes("SALE_ADMIN")) {
    return getDefaultPathByWorkspace("SALE_ADMIN");
  }

  if (groups.includes("CCC")) {
    return getDefaultPathByWorkspace("CCC");
  }

  return "/login";
}

function getWorkspaceFromPath(pathname: string): WorkspaceCode | null {
  if (isSaleAdminPath(pathname)) {
    return "SALE_ADMIN";
  }

  if (isCccPath(pathname)) {
    return "CCC";
  }

  return null;
}

export function useWorkspaceGuard() {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeWorkspace, setActiveWorkspaceState] =
    useState<WorkspaceCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const me = await accountService.getMe();
        setCurrentUser(me);

        const path = pathname || "/";
        const groups = me.accessible_groups || [];

        const globalAdmin = isGlobalAdmin(me);

        const canAccessSaleAdmin =
          globalAdmin || groups.includes("SALE_ADMIN");

        const canAccessCcc = globalAdmin || groups.includes("CCC");

        const canAccessAdmin = globalAdmin;

        /*
         * 1. Chặn route Admin.
         * /accounts/* chỉ SYSTEM_ADMIN / GLOBAL admin được vào.
         */
        if (isAdminPath(path)) {
          if (!canAccessAdmin) {
            router.push(getFallbackPath(me));
            return;
          }

          const workspaceFromStorage = getActiveWorkspace();
          const workspace =
            workspaceFromStorage ||
            me.default_group ||
            (groups.includes("SALE_ADMIN") ? "SALE_ADMIN" : "CCC");

          if (workspace === "CCC" || workspace === "SALE_ADMIN") {
            setActiveWorkspaceState(workspace);
            setActiveWorkspace(workspace);
          }

          return;
        }

        /*
         * 2. Chặn route Sale Admin.
         * SA only / Both / System Admin được vào.
         * CCC only không được vào.
         */
        if (isSaleAdminPath(path)) {
          if (!canAccessSaleAdmin) {
            router.push(getFallbackPath(me));
            return;
          }

          setActiveWorkspaceState("SALE_ADMIN");
          setActiveWorkspace("SALE_ADMIN");
          return;
        }

        /*
         * 3. Chặn route CCC.
         * CCC only / Both / System Admin được vào.
         * SA only không được vào CCC.
         * /external-errors cũng thuộc workspace CCC nhưng là dashboard lỗi riêng.
         */
        if (isCccPath(path) && !isEntryPath(path)) {
          if (!canAccessCcc) {
            router.push(getFallbackPath(me));
            return;
          }

          setActiveWorkspaceState("CCC");
          setActiveWorkspace("CCC");
          return;
        }

        /*
         * 4. Auto redirect chỉ chạy ở entry page:
         * / hoặc /workspace.
         * Không được redirect khi đang ở /accounts/users/create,
         * /sale-admin/records, /tickets, /external-errors, ...
         */
        if (!isEntryPath(path)) {
          const workspaceFromPath = getWorkspaceFromPath(path);

          if (workspaceFromPath) {
            setActiveWorkspaceState(workspaceFromPath);
            setActiveWorkspace(workspaceFromPath);
          }

          return;
        }

        let workspace = getActiveWorkspace();

        if (workspace && workspace === "SALE_ADMIN" && !canAccessSaleAdmin) {
          workspace = null;
        }

        if (workspace && workspace === "CCC" && !canAccessCcc) {
          workspace = null;
        }

        if (!workspace) {
          const defaultGroup = me.default_group;

          if (defaultGroup === "SALE_ADMIN" && canAccessSaleAdmin) {
            workspace = "SALE_ADMIN";
          } else if (defaultGroup === "CCC" && canAccessCcc) {
            workspace = "CCC";
          } else if (canAccessSaleAdmin) {
            workspace = "SALE_ADMIN";
          } else if (canAccessCcc) {
            workspace = "CCC";
          }
        }

        if (!workspace) {
          router.push(getFallbackPath(me));
          return;
        }

        setActiveWorkspaceState(workspace);
        setActiveWorkspace(workspace);

        router.push(getDefaultPathForWorkspaceByUser(workspace, me));
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;

        if (status === 401) {
          authService.logout();
          router.push("/login");
          return;
        }

        setError(
          status
            ? `Không tải được thông tin tài khoản (HTTP ${status}).`
            : "Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router, pathname]);

  return {
    currentUser,
    activeWorkspace,
    loading,
    error,
  };
}
