"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { masterDataService } from "@/services/master-data.service";
import { userService } from "@/services/user.service";
import {
  MembershipResponsibilityOption,
  NEW_EMPLOYEE_VALUE,
  UserBranchOption,
  UserCreateFormState,
  UserCreateWithAccessPayload,
  UserEmployeeOption,
  UserListItem,
  UserOrganizationUnitOption,
  UserRoleAssignmentPayload,
  UserRoleOption,
} from "@/types/user.type";
import { getApiErrorDetail } from "@/utils/error.util";

const initialForm: UserCreateFormState = {
  username: "",
  email: "",

  employeeId: NEW_EMPLOYEE_VALUE,
  employeeCode: "",
  employeeFullName: "",
  employeePhone: "",
  employeeBranchId: "",
  employeeOrganizationUnitId: "",
  employeeResponsibility: "",
  employeePosition: "",
  employeeStatus: "ACTIVE",

  status: "ACTIVE",
  isActive: true,

  groupCode: "CCC",
  roleId: "",
  includeDescendants: false,
  branchIds: [],
};

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9_.-]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  return {
    firstName: parts[parts.length - 1],
    lastName: parts.slice(0, -1).join(" "),
  };
}

function getEmployeeBranchId(employee: UserEmployeeOption) {
  if (typeof employee.branch === "number") {
    return String(employee.branch);
  }

  if (employee.branch && typeof employee.branch === "object") {
    return String(employee.branch.id);
  }

  return String(employee.branch_id || "");
}

function getEmployeePrimaryUnitId(employee: UserEmployeeOption) {
  if (employee.primary_organization_unit_id) {
    return String(employee.primary_organization_unit_id);
  }

  const membership = employee.memberships?.find(
    (item) => item.is_active && item.is_primary
  );

  return membership ? String(membership.organization_unit) : "";
}

function getEmployeeResponsibility(employee: UserEmployeeOption) {
  if (employee.primary_membership_responsibility) {
    return employee.primary_membership_responsibility;
  }

  return (
    employee.memberships?.find((item) => item.is_active && item.is_primary)
      ?.responsibility || ""
  );
}

function flattenApiErrors(value: unknown, prefix = ""): string[] {
  if (value == null) return [];

  if (typeof value === "string" || typeof value === "number") {
    return [prefix ? `${prefix}: ${String(value)}` : String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenApiErrors(item, prefix));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, item]) => {
        const labels: Record<string, string> = {
          detail: "Lỗi",
          non_field_errors: "Lỗi",
          username: "Tên đăng nhập",
          email: "Email",
          employee: "Nhân viên",
          employee_data: "Hồ sơ nhân viên",
          employee_code: "Mã nhân viên",
          full_name: "Họ tên",
          branch: "Chi nhánh",
          primary_organization_unit: "Đơn vị tổ chức",
          primary_membership_responsibility: "Trách nhiệm trong đơn vị",
          role_ids: "Vai trò",
          role_assignments: "Phạm vi vai trò",
          organization_unit: "Đơn vị áp dụng",
          branch_ids: "Chi nhánh truy cập",
        };

        const nextPrefix = prefix
          ? `${prefix} / ${labels[key] || key}`
          : labels[key] || key;

        return flattenApiErrors(item, nextPrefix);
      }
    );
  }

  return [];
}

function getCreateErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: unknown } })?.response
    ?.data;
  const details = flattenApiErrors(responseData);

  if (details.length > 0) {
    return details.join(" ");
  }

  return getApiErrorDetail(error, "Không tạo được tài khoản người dùng.");
}

export function useUserCreate() {
  const router = useRouter();

  const [form, setForm] = useState<UserCreateFormState>(initialForm);
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  const [roles, setRoles] = useState<UserRoleOption[]>([]);
  const [branches, setBranches] = useState<UserBranchOption[]>([]);
  const [employees, setEmployees] = useState<UserEmployeeOption[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<
    UserOrganizationUnitOption[]
  >([]);
  const [responsibilities, setResponsibilities] = useState<
    MembershipResponsibilityOption[]
  >([]);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const [createdUser, setCreatedUser] = useState<UserListItem | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((item) => String(item.id) === form.roleId) || null,
    [roles, form.roleId]
  );

  const selectedEmployee = useMemo(() => {
    if (form.employeeId === NEW_EMPLOYEE_VALUE) return null;
    return (
      employees.find((item) => String(item.id) === form.employeeId) || null
    );
  }, [employees, form.employeeId]);

  const selectedOrganizationUnit = useMemo(
    () =>
      organizationUnits.find(
        (item) => String(item.id) === form.employeeOrganizationUnitId
      ) || null,
    [organizationUnits, form.employeeOrganizationUnitId]
  );

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (item) => !form.groupCode || item.group_code === form.groupCode
    );
  }, [roles, form.groupCode]);

  const availableOrganizationUnits = useMemo(() => {
    if (!form.employeeBranchId) return [];

    return organizationUnits
      .filter((item) => {
        if (!item.is_active) return false;
        if (item.branch == null) return true;
        return String(item.branch) === form.employeeBranchId;
      })
      .sort((a, b) => {
        const typeCompare = a.unit_type.localeCompare(b.unit_type);
        if (typeCompare !== 0) return typeCompare;
        return a.unit_name.localeCompare(b.unit_name, "vi");
      });
  }, [organizationUnits, form.employeeBranchId]);

  const employeeLocked = Boolean(selectedEmployee);
  const isNewEmployee = form.employeeId === NEW_EMPLOYEE_VALUE;
  const isOrganizationScope =
    selectedRole?.scope_type === "ORGANIZATION_UNIT";
  const isBranchScope = selectedRole?.scope_type === "BRANCH";
  const isMultiBranch = selectedRole?.scope_type === "MULTI_BRANCH";
  const isAllScope = selectedRole?.scope_type === "ALL";
  const defaultPassword = form.username ? `${form.username}123` : "";

  const setField = <K extends keyof UserCreateFormState>(
    key: K,
    value: UserCreateFormState[K]
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const getBranchName = (branch: UserBranchOption) =>
    branch.branch_name || branch.name || `Chi nhánh ${branch.id}`;

  const getEmployeeName = (employee: UserEmployeeOption) => {
    const name = employee.full_name || `Nhân viên ${employee.id}`;
    const code = employee.employee_code ? ` · ${employee.employee_code}` : "";
    const nestedBranchName =
      employee.branch && typeof employee.branch === "object"
        ? employee.branch.branch_name
        : "";
    const branchName = employee.branch_name || nestedBranchName;
    const branch = branchName ? ` · ${branchName}` : "";
    return `${name}${code}${branch}`;
  };

  const getOrganizationUnitName = (unit: UserOrganizationUnitOption) => {
    const unitTypeLabels: Record<string, string> = {
      COMPANY: "Công ty",
      DIVISION: "Khối",
      CENTER: "Trung tâm",
      DEPARTMENT: "Phòng ban",
      TEAM: "Nhóm",
      PROCESSING_UNIT: "Đơn vị xử lý",
      PROJECT: "Dự án",
      OTHER: "Khác",
    };
    const type = unitTypeLabels[unit.unit_type] || unit.unit_type;
    const parent = unit.parent_name ? ` · ${unit.parent_name}` : "";
    return `${type} · ${unit.unit_name} (${unit.unit_code})${parent}`;
  };

  const changeUsername = (value: string) => {
    setUsernameManuallyEdited(true);
    setField("username", normalizeUsername(value));
  };

  const resetToNewEmployee = () => {
    setUsernameManuallyEdited(false);
    setForm((previous) => ({
      ...previous,
      employeeId: NEW_EMPLOYEE_VALUE,
      employeeCode: "",
      employeeFullName: "",
      employeePhone: "",
      employeeBranchId: "",
      employeeOrganizationUnitId: "",
      employeeResponsibility: "",
      employeePosition: "",
      employeeStatus: "ACTIVE",
      username: "",
      email: "",
      status: "ACTIVE",
      isActive: true,
      branchIds: [],
      includeDescendants: false,
    }));
  };

  const changeEmployeeSelection = (value: string) => {
    setError("");

    if (!value || value === NEW_EMPLOYEE_VALUE) {
      resetToNewEmployee();
      return;
    }

    const employee = employees.find((item) => String(item.id) === value);
    if (!employee) {
      resetToNewEmployee();
      return;
    }

    setUsernameManuallyEdited(false);

    const branchId = getEmployeeBranchId(employee);
    const unitId = getEmployeePrimaryUnitId(employee);
    const responsibility = getEmployeeResponsibility(employee);
    const employeeCode = employee.employee_code || "";
    const employeeStatus = employee.status || "ACTIVE";

    setForm((previous) => ({
      ...previous,
      employeeId: value,
      employeeCode,
      employeeFullName: employee.full_name || "",
      employeePhone: employee.phone || "",
      employeeBranchId: branchId,
      employeeOrganizationUnitId: unitId,
      employeeResponsibility: responsibility,
      employeePosition: employee.position || "",
      employeeStatus,
      username: normalizeUsername(employeeCode),
      email: employee.email || "",
      status: employeeStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      isActive: employeeStatus === "ACTIVE",
      branchIds:
        selectedRole?.scope_type === "ALL" || !branchId ? [] : [branchId],
      includeDescendants: false,
    }));
  };

  const changeEmployeeCode = (value: string) => {
    setForm((previous) => ({
      ...previous,
      employeeCode: value,
      username: usernameManuallyEdited
        ? previous.username
        : normalizeUsername(value),
    }));
  };

  const changeEmployeeFullName = (value: string) => {
    setForm((previous) => ({ ...previous, employeeFullName: value }));
  };

  const changeEmployeeBranch = (branchId: string) => {
    setForm((previous) => ({
      ...previous,
      employeeBranchId: branchId,
      employeeOrganizationUnitId: "",
      employeeResponsibility: "",
      branchIds:
        selectedRole?.scope_type === "ALL" || !branchId ? [] : [branchId],
    }));
  };

  const changeOrganizationUnit = (unitId: string) => {
    setForm((previous) => ({
      ...previous,
      employeeOrganizationUnitId: unitId,
      employeeResponsibility: unitId
        ? previous.employeeResponsibility
        : "",
    }));
  };

  const changeGroupCode = (groupCode: string) => {
    setForm((previous) => ({
      ...previous,
      groupCode,
      roleId: "",
      includeDescendants: false,
      branchIds: previous.employeeBranchId
        ? [previous.employeeBranchId]
        : [],
    }));
  };

  const changeRoleId = (roleId: string) => {
    const role = roles.find((item) => String(item.id) === roleId) || null;

    setForm((previous) => ({
      ...previous,
      roleId,
      includeDescendants: false,
      branchIds:
        role?.scope_type === "ALL" || !previous.employeeBranchId
          ? []
          : [previous.employeeBranchId],
    }));
  };

  const toggleBranchAccess = (branchId: string) => {
    setForm((previous) => {
      const selected = previous.branchIds.includes(branchId);
      return {
        ...previous,
        branchIds: selected
          ? previous.branchIds.filter((item) => item !== branchId)
          : [...previous.branchIds, branchId],
      };
    });
  };

  const loadMasterData = async () => {
    try {
      setLoadingMaster(true);
      setMasterError("");

      const [roleData, branchData, employeeData, unitData, responsibilityData] =
        await Promise.all([
          userService.getRoles(),
          masterDataService.getBranches(),
          masterDataService.getEmployees({
            status: "ACTIVE",
            available_for_user: true,
          }),
          masterDataService.getOrganizationUnits({ is_active: true }),
          masterDataService.getMembershipResponsibilityChoices(),
        ]);

      setRoles(roleData.filter((item) => item.is_active !== false));
      setBranches(branchData as UserBranchOption[]);
      setEmployees(employeeData as UserEmployeeOption[]);
      setOrganizationUnits(unitData);
      setResponsibilities(responsibilityData);
    } catch (loadError) {
      setMasterError(
        getApiErrorDetail(loadError, "Không tải được dữ liệu tạo người dùng.")
      );
    } finally {
      setLoadingMaster(false);
    }
  };

  const validate = () => {
    if (!form.username.trim()) return "Vui lòng nhập tên đăng nhập.";
    if (!form.email.trim()) return "Vui lòng nhập email đăng nhập.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Email đăng nhập không đúng định dạng.";
    }

    if (!form.groupCode) return "Vui lòng chọn phân hệ quyền.";
    if (!form.roleId || !selectedRole) return "Vui lòng chọn vai trò.";

    if (isNewEmployee) {
      if (!form.employeeCode.trim()) return "Vui lòng nhập mã nhân viên.";
      if (!form.employeeFullName.trim()) return "Vui lòng nhập họ tên nhân viên.";
      if (!form.employeeBranchId) return "Vui lòng chọn chi nhánh công tác.";
      if (!form.employeeOrganizationUnitId) {
        return "Vui lòng chọn đơn vị tổ chức chính.";
      }
      if (!form.employeeResponsibility) {
        return "Vui lòng chọn trách nhiệm của nhân viên trong đơn vị.";
      }
    } else if (!selectedEmployee) {
      return "Nhân viên được chọn không còn tồn tại trong danh sách.";
    }

    if (isOrganizationScope && !form.employeeOrganizationUnitId) {
      return "Vai trò này dùng phạm vi đơn vị tổ chức nhưng nhân viên chưa có đơn vị chính.";
    }

    if (isBranchScope && !form.employeeBranchId) {
      return "Vai trò này dùng phạm vi chi nhánh nhưng chưa xác định được chi nhánh.";
    }

    if (isMultiBranch && form.branchIds.length === 0) {
      return "Vui lòng chọn ít nhất một chi nhánh được truy cập.";
    }

    return "";
  };

  const buildRoleAssignment = (): UserRoleAssignmentPayload => {
    if (!selectedRole) {
      throw new Error("Role is required before building payload.");
    }

    const assignment: UserRoleAssignmentPayload = {
      role: selectedRole.id,
      scope_type: selectedRole.scope_type,
      include_descendants:
        selectedRole.scope_type === "ORGANIZATION_UNIT"
          ? form.includeDescendants
          : false,
      is_active: true,
    };

    if (selectedRole.scope_type === "ORGANIZATION_UNIT") {
      assignment.organization_unit = Number(form.employeeOrganizationUnitId);
    }

    if (selectedRole.scope_type === "BRANCH") {
      assignment.branch = Number(form.employeeBranchId);
    }

    return assignment;
  };

  const buildPayload = (): UserCreateWithAccessPayload => {
    const { firstName, lastName } = splitFullName(form.employeeFullName);

    const employeeData = isNewEmployee
      ? {
          employee_code: form.employeeCode.trim(),
          full_name: form.employeeFullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.employeePhone.trim() || null,
          branch: Number(form.employeeBranchId),
          primary_organization_unit: Number(form.employeeOrganizationUnitId),
          primary_membership_responsibility: form.employeeResponsibility,
          position: form.employeePosition.trim() || null,
          status: form.employeeStatus,
        }
      : null;

    const branchIds = isAllScope
      ? []
      : isMultiBranch
        ? form.branchIds.map(Number)
        : form.employeeBranchId
          ? [Number(form.employeeBranchId)]
          : [];

    return {
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      ...(isNewEmployee
        ? { employee: null, employee_data: employeeData }
        : { employee: Number(form.employeeId) }),
      status: form.status,
      is_active: form.isActive,
      role_assignments: [buildRoleAssignment()],
      branch_ids: branchIds,
    };
  };

  const submit = async () => {
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setPasswordCopied(false);

      const result = await userService.createWithAccess(buildPayload());
      setCreatedUser(result);
    } catch (submitError) {
      setError(getCreateErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const copyGeneratedPassword = async () => {
    const password =
      createdUser?.generated_password ||
      (createdUser?.username ? `${createdUser.username}123` : "");
    if (!password || typeof document === "undefined") return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(password);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = password;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setPasswordCopied(true);
    } catch {
      setPasswordCopied(false);
    }
  };

  const createAnother = () => {
    setCreatedUser(null);
    setPasswordCopied(false);
    setError("");
    setUsernameManuallyEdited(false);
    setForm(initialForm);
  };

  const goToUserList = () => router.push("/accounts/users");
  const cancel = () => router.push("/accounts/users");

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
    organizationUnits,
    availableOrganizationUnits,
    responsibilities,

    selectedRole,
    selectedEmployee,
    selectedOrganizationUnit,

    employeeLocked,
    isNewEmployee,
    isOrganizationScope,
    isBranchScope,
    isMultiBranch,
    isAllScope,
    defaultPassword,

    loadingMaster,
    submitting,
    error,
    masterError,

    createdUser,
    passwordCopied,

    getBranchName,
    getEmployeeName,
    getOrganizationUnitName,

    changeUsername,
    changeEmployeeSelection,
    changeEmployeeCode,
    changeEmployeeFullName,
    changeEmployeeBranch,
    changeOrganizationUnit,
    changeGroupCode,
    changeRoleId,
    toggleBranchAccess,

    copyGeneratedPassword,
    createAnother,
    goToUserList,
    submit,
    cancel,
  };
}
