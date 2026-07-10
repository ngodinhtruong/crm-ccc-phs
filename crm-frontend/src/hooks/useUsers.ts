"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { userService } from "@/services/user.service";
import {
  UserActiveTab,
  UserListItem,
  UserListParams,
} from "@/types/user.type";

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as {
    response?: {
      status?: number;
      data?: unknown;
    };
    message?: string;
  };

  const status = error?.response?.status;
  const detail = error?.response?.data
    ? JSON.stringify(error.response.data)
    : error?.message;

  return `${fallback}. Status: ${status} - ${detail}`;
}

export function useUsers() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<UserActiveTab>("active");

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [count, setCount] = useState(0);

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [online, setOnline] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const active = activeTab === "active";

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const filteredUsers = useMemo(() => {
    if (!online) return users;

    return users.filter(() => {
      if (online === "no") return true;
      if (online === "yes") return false;

      return true;
    });
  }, [users, online]);

  const buildParams = (tab: UserActiveTab = activeTab): UserListParams => ({
    active: tab === "active",
    q,
    branch,
    department,
  });

  const loadUsers = async (params: UserListParams = buildParams()) => {
    try {
      setLoading(true);
      setError("");

      const data = await userService.getUsers(params);

      setUsers(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách người dùng"));
    } finally {
      setLoading(false);
    }
  };

  const changeTab = (tab: UserActiveTab) => {
    setActiveTab(tab);

    void loadUsers({
      active: tab === "active",
      q,
      branch,
      department,
    });
  };

  const search = () => {
    void loadUsers();
  };

  const clearFilter = () => {
    setQ("");
    setBranch("");
    setDepartment("");
    setOnline("");

    void loadUsers({
      active,
      q: "",
      branch: "",
      department: "",
    });
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadUsers({
      active: true,
      q: "",
      branch: "",
      department: "",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    activeTab,
    active,
    changeTab,

    users,
    filteredUsers,
    count,
    fromRecord,
    toRecord,

    q,
    setQ,
    branch,
    setBranch,
    department,
    setDepartment,
    online,
    setOnline,

    loading,
    error,

    search,
    clearFilter,
    reload: loadUsers,
  };
}