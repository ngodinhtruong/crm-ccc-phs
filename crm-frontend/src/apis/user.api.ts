import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  PaginatedResponse,
  UserListItem,
  UserListParams,
} from "@/types/user.type";

export const userApi = {
  getUsers: async (
    params: UserListParams = {}
  ): Promise<PaginatedResponse<UserListItem>> => {
    const response = await api.get<PaginatedResponse<UserListItem>>(
      "/api/accounts/users/",
      {
        params: cleanParams({
          active:
            typeof params.active === "boolean"
              ? String(params.active)
              : undefined,
          q: params.q,
          branch: params.branch,
          department: params.department,
        }),
      }
    );

    return response.data;
  },
};

export const userService = userApi;