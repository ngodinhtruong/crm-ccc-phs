"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { accountService } from "@/services/account.service";
import { authService } from "@/services/auth.service";
import { CurrentUser } from "@/types/account.type";
import {
  getActiveWorkspace,
  getDefaultPathByWorkspace,
  setActiveWorkspace,
  WorkspaceCode,
} from "@/utils/workspace.util";

export function useWorkspaceGuard() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeWorkspace, setActiveWorkspaceState] =
    useState<WorkspaceCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);

        const me = await accountService.getMe();
        setCurrentUser(me);

        const groups = me.accessible_groups || [];

        let workspace = getActiveWorkspace();

        if (!workspace) {
          const defaultGroup = me.default_group;

          if (defaultGroup === "CCC" || defaultGroup === "SALE_ADMIN") {
            workspace = defaultGroup;
            setActiveWorkspace(workspace);
          }
        }

        if (!workspace) {
          router.push("/workspace");
          return;
        }

        const canAccess = groups.includes(workspace);

        if (!canAccess) {
          router.push("/workspace");
          return;
        }

        setActiveWorkspaceState(workspace);

        const currentPath = window.location.pathname;

        if (
          workspace === "SALE_ADMIN" &&
          !currentPath.startsWith("/sale-admin") &&
          currentPath !== "/accounts/users"
        ) {
          router.push(getDefaultPathByWorkspace("SALE_ADMIN"));
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  return {
    currentUser,
    activeWorkspace,
    loading,
  };
}