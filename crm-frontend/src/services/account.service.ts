import api from "./api";

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  employee: null | {
    id: number;
    employee_code: string;
    full_name: string;
    department: string | null;
    position: string | null;
    branch: null | {
      id: number;
      branch_code: string;
      branch_name: string;
    };
  };
  roles: {
    id: number;
    role_code: string;
    role_name: string;
    scope_type: string;
  }[];
  permissions: {
    id: number;
    permission_code: string;
    permission_name: string;
    module_code: string;
    action_code: string;
  }[];
};

export const accountService = {
  getMe: async (): Promise<CurrentUser> => {
    const response = await api.get("/api/accounts/me/");
    return response.data;
  },
};