"use client";

import { useEffect, useState } from "react";

import { accountService } from "@/services/account.service";
import { userService } from "@/services/user.service";
import { UserListItem } from "@/types/user.type";

export type AssigneeValue = {
  id: string;
  label: string;
};

function getUserDisplayName(user: {
  username?: string;
  email?: string;
  employee_name?: string;
  first_name?: string;
  last_name?: string;
}) {
  return (
    user.employee_name ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.username ||
    user.email ||
    "-"
  );
}

export function getAssigneeLabel(user: UserListItem) {
  const displayName = getUserDisplayName(user);

  return user.email ? `${displayName} - ${user.email}` : displayName;
}

export function useUserAssignees() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [defaultAssignee, setDefaultAssignee] =
    useState<AssigneeValue | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const [me, userData] = await Promise.all([
        accountService.getMe(),
        userService.getUsers({
          active: true,
        }),
      ]);

      const currentUser: UserListItem = {
        id: me.id,
        username: me.username,
        email: me.email,
        first_name: me.full_name || me.username,
        last_name: "",
        employee: me.employee?.id || null,
        employee_name: me.employee?.full_name || me.full_name || me.username,
        employee_code: me.employee?.employee_code || "",
        branch_name: me.employee?.branch?.branch_name || "",
        department: me.employee?.department || "",
        position: me.employee?.position || "",
        role_names: me.roles?.map((role) => role.role_name) || [],
        role_codes: me.roles?.map((role) => role.role_code) || [],
        status: "ACTIVE",
        is_active: true,
        is_staff: false,
        is_superuser: false,
      };

      const userList = userData.results || [];
      const hasCurrentUser = userList.some((user) => user.id === me.id);

      const mergedUsers = hasCurrentUser
        ? userList
        : [currentUser, ...userList];

      setUsers(mergedUsers);

      setDefaultAssignee({
        id: String(me.id),
        label: getAssigneeLabel(currentUser),
      });
    } catch (err) {
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

      setError(`Không tải được danh sách người được giao. Status: ${status} - ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  return {
    users,
    defaultAssignee,
    loading,
    error,
    reload: loadUsers,
  };
}