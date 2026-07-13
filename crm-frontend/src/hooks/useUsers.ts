"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDebounce } from "@/hooks/useDebounce";
import { authService } from "@/services/auth.service";
import { masterDataService } from "@/services/master-data.service";
import { userService } from "@/services/user.service";
import {
  UserActiveTab,
  UserBranchOption,
  UserListItem,
  UserListParams,
  UserRoleOption,
} from "@/types/user.type";

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

export function useUsers() {
  const router = useRouter();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [count, setCount] = useState(0);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const fromRecord = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toRecord = Math.min(page * PAGE_SIZE, count);

  const [roles, setRoles] = useState<UserRoleOption[]>([]);
  const [branches, setBranches] = useState<UserBranchOption[]>([]);

  const [activeTab, setActiveTab] = useState<UserActiveTab>("active");

  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [email, setEmail] = useState("");

  const [online, setOnline] = useState("");

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);

  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const textFilters = useMemo<UserListParams>(
    () => ({
      department,
      full_name: fullName,
      username,
      email,
    }),
    [department, fullName, username, email]
  );

  const debouncedTextFilters = useDebounce(textFilters, 500);

  const buildParams = (
    customParams?: Partial<UserListParams>,
    pageValue = page
  ): UserListParams => ({
    ...debouncedTextFilters,

    page: String(pageValue),

    active: activeTab === "active",
    branch,
    role,
    group_code: groupCode,

    ...customParams,
  });

  const loadUsers = async (params?: UserListParams, pageValue = page) => {
    try {
      setLoading(true);
      setError("");

      const data = await userService.getUsers(
        params || buildParams({}, pageValue)
      );

      setUsers(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách người dùng"));
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);

    setPage(safePage);
    void loadUsers(
      buildParams(
        {
          page: String(safePage),
        },
        safePage
      ),
      safePage
    );
  };

  const previousPage = () => {
    if (page <= 1) return;
    goToPage(page - 1);
  };

  const nextPage = () => {
    if (page >= totalPages) return;
    goToPage(page + 1);
  };

  const loadMasterData = async () => {
    try {
      setMasterLoading(true);
      setMasterError("");

      const [roleData, branchData] = await Promise.all([
        userService.getRoles(),
        masterDataService.getBranches(),
      ]);

      setRoles(roleData);
      setBranches(branchData);
    } catch (err) {
      setMasterError(
        getErrorMessage(err, "Không tải được dữ liệu lọc người dùng")
      );
    } finally {
      setMasterLoading(false);
    }
  };

  const search = () => {
    setPage(1);

    void loadUsers(
      {
        page: "1",

        active: activeTab === "active",
        branch,
        department,
        full_name: fullName,
        username,
        role,
        group_code: groupCode,
        email,
      },
      1
    );
  };

  const clearFilter = () => {
    setBranch("");
    setDepartment("");
    setFullName("");
    setUsername("");
    setRole("");
    setGroupCode("");
    setEmail("");
    setOnline("");

    setPage(1);

    void loadUsers(
      {
        page: "1",

        active: activeTab === "active",
        branch: "",
        department: "",
        full_name: "",
        username: "",
        role: "",
        group_code: "",
        email: "",
      },
      1
    );
  };

  const changeTab = (tab: UserActiveTab) => {
    setActiveTab(tab);
    setPage(1);

    void loadUsers(
      {
        page: "1",

        active: tab === "active",
        branch,
        department,
        full_name: fullName,
        username,
        role,
        group_code: groupCode,
        email,
      },
      1
    );
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadMasterData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      return;
    }

    setPage(1);
    void loadUsers(buildParams({ page: "1" }, 1), 1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTextFilters, activeTab, branch, role, groupCode]);

  return {
    users,
    filteredUsers: users,
    count,

    page,
    pageSize: PAGE_SIZE,
    totalPages,
    fromRecord,
    toRecord,
    previousPage,
    nextPage,
    goToPage,

    roles,
    branches,

    activeTab,
    changeTab,

    branch,
    setBranch,

    department,
    setDepartment,

    fullName,
    setFullName,

    username,
    setUsername,

    role,
    setRole,

    groupCode,
    setGroupCode,

    email,
    setEmail,

    online,
    setOnline,

    loading,
    masterLoading,
    error,
    masterError,

    search,
    clearFilter,
    reload: loadUsers,
  };
}