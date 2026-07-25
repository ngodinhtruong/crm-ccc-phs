export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  full_name: string;

  first_name?: string;
  last_name?: string;

  is_superuser?: boolean;
  is_staff?: boolean;
  is_global_admin?: boolean;

  employee: null | {
    id: number;
    employee_code: string;
    full_name: string;
    department?: string | null;
    primary_organization_unit_id?: number | null;
    primary_organization_unit_code?: string | null;
    primary_organization_unit_name?: string | null;
    primary_membership_responsibility?: string | null;
    primary_membership_responsibility_label?: string | null;
    position: string | null;
    branch: null | {
      id: number;
      branch_code: string;
      branch_name: string;
    };
  };

  roles: {
    id: number;
    role?: number;
    role_code: string;
    role_name: string;
    scope_type: string;
    group_code?: "GLOBAL" | "CCC" | "SALE_ADMIN" | string;
    organization_unit?: number | null;
    organization_unit_code?: string | null;
    organization_unit_name?: string | null;
    branch?: number | null;
    branch_name?: string | null;
    include_descendants?: boolean;
  }[];

  permissions: {
    id: number;
    permission_code: string;
    permission_name: string;
    module_code: string | null;
    action_code: string | null;
  }[];

  role_codes?: string[];
  permission_codes?: string[];
  scope_type?: string | null;
  branch_ids?: number[];

  accessible_groups?: ("CCC" | "SALE_ADMIN" | string)[];
  default_group?: "CCC" | "SALE_ADMIN" | string | null;
};
