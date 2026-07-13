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
  position: string;

  role_names: string[];
  role_codes: string[];
  role_group_codes?: string[];
  branch_access_names?: string[];

  status: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
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

export type UserRoleOption = {
  id: number;
  role_code: string;
  role_name: string;
  scope_type: string;
  group_code: "GLOBAL" | "CCC" | "SALE_ADMIN" | string;
};

export type UserBranchOption = {
  id: number;
  branch_code?: string | null;
  branch_name?: string | null;
  name?: string | null;
};