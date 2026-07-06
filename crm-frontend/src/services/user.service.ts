import api from "./api";

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
  active?: boolean;
  q?: string;
  branch?: string;
  department?: string;
};

export const userService = {
  getUsers: async (
    params: UserListParams = {}
  ): Promise<PaginatedResponse<UserListItem>> => {
    const response = await api.get("/api/accounts/users/", {
      params: {
        active:
          typeof params.active === "boolean"
            ? String(params.active)
            : undefined,
        q: params.q || undefined,
        branch: params.branch || undefined,
        department: params.department || undefined,
      },
    });

    return response.data;
  },
};