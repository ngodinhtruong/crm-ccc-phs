"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { masterDataService } from "@/services/master-data.service";
import { userService } from "@/services/user.service";
import {
  UserBranchOption,
  UserCreateFormState,
  UserCreateWithAccessPayload,
  UserEmployeeOption,
  UserRoleOption,
} from "@/types/user.type";

function getEmployeeStatus(employee: UserEmployeeOption) {
  return employee.status || "ACTIVE";
}

function getIsActiveFromEmployeeStatus(status: string) {
  return status === "ACTIVE";
}

function formatApiErrorData(data: unknown): string {
  if (!data) return "";

  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return data.map(String).join(" ");
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const fieldLabels: Record<string, string> = {
      username: "Username",
      email: "Email",
      password: "Password",
      employee: "Nhân viên",
      employee_data: "Thông tin nhân viên",
      role_ids: "Vai trò",
      branch_ids: "Chi nhánh",
      non_field_errors: "Lỗi",
      detail: "Lỗi",
    };

    const messages: string[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      const label = fieldLabels[key] || key;

      if (Array.isArray(value)) {
        messages.push(`${label}: ${value.map(String).join(" ")}`);
        return;
      }

      if (typeof value === "string") {
        messages.push(`${label}: ${value}`);
        return;
      }

      if (value && typeof value === "object") {
        messages.push(`${label}: ${JSON.stringify(value)}`);
      }
    });

    return messages.join(" ");
  }

  return String(data);
}

const initialForm: UserCreateFormState = {
  username: "",
  email: "",

  employeeId: "",
  employeeCode: "",
  employeeFullName: "",
  employeeBranchId: "",
  employeeDepartment: "",
  employeePosition: "",

  status: "ACTIVE",
  isActive: true,

  groupCode: "SALE_ADMIN",
  roleId: "",
  branchIds: [],
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  return {
    firstName: parts[parts.length - 1],
    lastName: parts.slice(0, -1).join(" "),
  };
}

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "");
}

function getEmployeeBranchId(employee: UserEmployeeOption) {
  return String(employee.branch?.id || employee.branch_id || "");
}

function roleRequiresBranch(role?: UserRoleOption | null) {
  if (!role) return false;

  if (role.group_code === "GLOBAL") return false;
  if (role.scope_type === "ALL") return false;

  return ["OWN", "BRANCH", "MULTI_BRANCH"].includes(role.scope_type);
}

export function useUserCreate() {
  const router = useRouter();

  const [form, setForm] = useState<UserCreateFormState>(initialForm);

  const [roles, setRoles] = useState<UserRoleOption[]>([]);
  const [branches, setBranches] = useState<UserBranchOption[]>([]);
  const [employees, setEmployees] = useState<UserEmployeeOption[]>([]);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const selectedRole = useMemo(() => {
    return roles.find((item) => String(item.id) === form.roleId) || null;
  }, [roles, form.roleId]);

  const filteredRoles = useMemo(() => {
    if (!form.groupCode) return roles;

    return roles.filter((item) => item.group_code === form.groupCode);
  }, [roles, form.groupCode]);

  const requiresBranch = roleRequiresBranch(selectedRole);
  const isMultiBranch = selectedRole?.scope_type === "MULTI_BRANCH";
  const employeeLocked = Boolean(form.employeeId);

  const setField = <K extends keyof UserCreateFormState>(
    key: K,
    value: UserCreateFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getBranchName = (branch: UserBranchOption) => {
    return branch.branch_name || branch.name || `Chi nhánh ${branch.id}`;
  };

  const getEmployeeName = (employee: UserEmployeeOption) => {
    const name = employee.full_name || `Nhân viên ${employee.id}`;
    const code = employee.employee_code ? ` - ${employee.employee_code}` : "";

    return `${name}${code}`;
  };

  const changeGroupCode = (value: string) => {
    setForm((prev) => ({
      ...prev,
      groupCode: value,
      roleId: "",
      branchIds: [],
    }));
  };

  const changeRoleId = (value: string) => {
    const nextRole = roles.find((item) => String(item.id) === value) || null;
    const nextRequiresBranch = roleRequiresBranch(nextRole);

    setForm((prev) => ({
      ...prev,
      roleId: value,
      branchIds:
        nextRequiresBranch && prev.employeeBranchId
          ? [prev.employeeBranchId]
          : [],
    }));
  };

  const changeEmployee = (employeeId: string) => {
    const selectedEmployee = employees.find(
      (item) => String(item.id) === employeeId
    );

    if (!selectedEmployee) {
      setForm((prev) => ({
        ...prev,
        employeeId: "",
        employeeCode: "",
        employeeFullName: "",
        employeeBranchId: "",
        employeeDepartment: "",
        employeePosition: "",
        username: "",
        email: "",
        status: "ACTIVE",
        isActive: true,
        branchIds: [],
      }));
      return;
    }

    const employeeCode = selectedEmployee.employee_code || "";
    const employeeEmail = selectedEmployee.email || "";
    const employeeStatus = getEmployeeStatus(selectedEmployee);
    const employeeBranchId = getEmployeeBranchId(selectedEmployee);

    setForm((prev) => ({
      ...prev,

      employeeId,

      employeeCode,
      employeeFullName: selectedEmployee.full_name || "",
      employeeBranchId,
      employeeDepartment: selectedEmployee.department || "",
      employeePosition: selectedEmployee.position || "",

      username: normalizeUsername(employeeCode),
      email: employeeEmail,

      status: employeeStatus,
      isActive: getIsActiveFromEmployeeStatus(employeeStatus),

      branchIds:
        (!selectedRole || roleRequiresBranch(selectedRole)) && employeeBranchId
          ? [employeeBranchId]
          : [],
    }));
  };
  const changeEmployeeCode = (value: string) => {
    setForm((prev) => ({
      ...prev,
      employeeCode: value,
      username: normalizeUsername(value),
    }));
  };

  const changeEmployeeFullName = (value: string) => {
    setForm((prev) => ({
      ...prev,
      employeeFullName: value,
    }));
  };

  const changeEmployeeBranch = (value: string) => {
    setForm((prev) => ({
      ...prev,
      employeeBranchId: value,
      branchIds: value ? [value] : [],
    }));
  };

  const loadMasterData = async () => {
    try {
      setLoadingMaster(true);
      setMasterError("");

      const [roleData, branchData, employeeData] = await Promise.all([
        userService.getRoles(),
        masterDataService.getBranches(),
        masterDataService.getEmployees(),
      ]);

      setRoles(roleData);
      setBranches(branchData as UserBranchOption[]);
      setEmployees(employeeData as UserEmployeeOption[]);
    } catch (err) {
      setMasterError(getErrorMessage(err, "Không tải được dữ liệu tạo user"));
    } finally {
      setLoadingMaster(false);
    }
  };

  const validate = () => {
    if (!form.username.trim()) {
      return "Vui lòng nhập username.";
    }
    
    if (!form.email.trim()) {
      return "Vui lòng nhập email.";
    }

      if (!form.groupCode) {
      return "Vui lòng chọn nhóm quyền.";
    }

    if (!form.roleId) {
      return "Vui lòng chọn vai trò.";
    }

    if (!form.employeeId) {
      if (!form.employeeCode.trim()) {
        return "Vui lòng nhập mã nhân viên.";
      }

      if (!form.employeeFullName.trim()) {
        return "Vui lòng nhập họ tên nhân viên.";
      }

      if (!form.employeeBranchId) {
        return "Vui lòng chọn chi nhánh nhân viên.";
      }
    }

    if (requiresBranch && form.branchIds.length === 0) {
      return "Vui lòng chọn chi nhánh cho user nghiệp vụ.";
    }

    return "";
  };

  const buildPayload = (): UserCreateWithAccessPayload => {
    const employeeData = form.employeeId
      ? null
      : {
        employee_code: form.employeeCode.trim(),
        full_name: form.employeeFullName.trim(),
        branch: form.employeeBranchId ? Number(form.employeeBranchId) : null,
        department: form.employeeDepartment.trim(),
        position: form.employeePosition.trim(),
      };

    return {
      username: form.username.trim(),
      email: form.email.trim(),

      employee: form.employeeId ? Number(form.employeeId) : null,
      employee_data: employeeData,

      status: form.status,
      is_active: form.isActive,

      role_ids: [Number(form.roleId)],
      branch_ids: form.branchIds.map(Number),
    };
  };

  const submit = async () => {
    const message = validate();

    if (message) {
      setError(message);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await userService.createWithAccess(buildPayload());

      router.push("/accounts/users");
    } catch (err) {
      setError(getErrorMessage(err, "Không tạo được user"));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    router.push("/accounts/users");
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadMasterData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    form,
    setField,

    roles,
    filteredRoles,
    branches,
    employees,

    selectedRole,
    requiresBranch,
    isMultiBranch,
    employeeLocked,

    loadingMaster,
    submitting,

    error,
    masterError,

    getBranchName,
    getEmployeeName,

    changeGroupCode,
    changeRoleId,
    changeEmployeeCode,
    changeEmployee,
    changeEmployeeFullName,
    changeEmployeeBranch,

    submit,
    cancel,
  };
}