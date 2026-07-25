export type UserListItem = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;

  employee: number | null;
  employee_name: string;
  employee_code: string;

  branch_name: string;
  department: string;
  primary_organization_unit_id?: number | null;
  primary_organization_unit_code?: string | null;
  primary_organization_unit_name?: string | null;
  primary_membership_responsibility?: string | null;
  primary_membership_responsibility_label?: string | null;
  position: string;

  role_names: string[];
  role_codes: string[];
  role_group_codes?: string[];
  role_assignments?: UserRoleAssignmentResponse[];
  branch_access_names?: string[];

  status: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;

  generated_password?: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type UserListParams = {
  page?: string;

  q?: string;

  username?: string;
  email?: string;
  full_name?: string;

  employee?: string;
  employee_name?: string;
  employee_code?: string;

  branch?: string;
  branch_name?: string;

  organization_unit?: string;
  department?: string;
  position?: string;

  role?: string;
  role_code?: string;
  role_name?: string;
  group_code?: string;
  scope_type?: string;

  status?: string;
  active?: boolean | string;
  is_active?: boolean | string;
  is_staff?: boolean | string;
  is_superuser?: boolean | string;
};

export type UserActiveTab = "active" | "inactive";

export type UserScopeType =
  | "OWN"
  | "ORGANIZATION_UNIT"
  | "BRANCH"
  | "MULTI_BRANCH"
  | "ALL"
  | string;

export type UserRoleOption = {
  id: number;
  role_code: string;
  role_name: string;
  scope_type: UserScopeType;
  group_code: "GLOBAL" | "CCC" | "SALE_ADMIN" | string;
  is_active?: boolean;
};

export type UserBranchOption = {
  id: number;
  branch_code?: string | null;
  branch_name?: string | null;
  name?: string | null;
  status?: string | null;
};

export type UserOrganizationUnitOption = {
  id: number;
  unit_code: string;
  unit_name: string;
  unit_type: string;
  parent?: number | null;
  parent_name?: string | null;
  branch?: number | null;
  branch_name?: string | null;
  description?: string | null;
  is_ticket_assignable?: boolean;
  is_active: boolean;
  sort_order?: number;
  member_count?: number;
};

export type MembershipResponsibilityOption = {
  value: string;
  label: string;
};

export type UserEmployeeMembershipOption = {
  id: number;
  organization_unit: number;
  organization_unit_code?: string | null;
  organization_unit_name?: string | null;
  responsibility: string;
  responsibility_label?: string | null;
  is_primary: boolean;
  is_active: boolean;
};

export type UserEmployeeOption = {
  id: number;
  employee_code?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  status?: string | null;

  branch?:
    | number
    | {
        id: number;
        branch_code?: string | null;
        branch_name?: string | null;
      }
    | null;
  branch_id?: number | null;
  branch_name?: string | null;

  department?: string | null;
  primary_organization_unit_id?: number | null;
  primary_organization_unit_code?: string | null;
  primary_organization_unit_name?: string | null;
  primary_membership_responsibility?: string | null;
  primary_membership_responsibility_label?: string | null;
  memberships?: UserEmployeeMembershipOption[];
};

export type UserRoleAssignmentPayload = {
  role: number;
  scope_type: UserScopeType;
  organization_unit?: number | null;
  branch?: number | null;
  include_descendants?: boolean;
  is_active?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
};

export type UserRoleAssignmentResponse = UserRoleAssignmentPayload & {
  id?: number;
  role_code?: string;
  role_name?: string;
  organization_unit_code?: string | null;
  organization_unit_name?: string | null;
  branch_name?: string | null;
};

export type UserCreateWithAccessPayload = {
  username: string;
  email: string;

  password?: string;
  first_name?: string;
  last_name?: string;

  employee?: number | null;
  employee_data?: UserCreateEmployeeData | null;

  status: string;
  is_active: boolean;

  role_ids?: number[];
  role_assignments?: UserRoleAssignmentPayload[];
  branch_ids: number[];
};

export const NEW_EMPLOYEE_VALUE = "NEW" as const;

export type UserCreateFormState = {
  username: string;
  email: string;

  /** NEW hoặc ID Employee có sẵn. */
  employeeId: string;
  employeeCode: string;
  employeeFullName: string;
  employeePhone: string;
  employeeBranchId: string;
  employeeOrganizationUnitId: string;
  employeeResponsibility: string;
  employeePosition: string;
  employeeStatus: string;

  status: string;
  isActive: boolean;

  groupCode: string;
  roleId: string;
  includeDescendants: boolean;
  branchIds: string[];
};

export type UserCreateEmployeeData = {
  employee_code: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  branch: number;
  primary_organization_unit: number;
  primary_membership_responsibility: string;
  position?: string | null;
  status?: string;
};
