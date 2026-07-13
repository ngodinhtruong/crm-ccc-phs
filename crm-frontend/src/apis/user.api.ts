import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
  PaginatedResponse,
  UserCreateWithAccessPayload,
  UserListItem,
  UserListParams,
  UserRoleOption,
} from "@/types/user.type";

export const userApi = {
  getUsers: async (
    params: UserListParams = {}
  ): Promise<PaginatedResponse<UserListItem>> => {
    const response = await api.get<PaginatedResponse<UserListItem>>(
      "/api/accounts/users/",
      {
        params: cleanParams({
          ...params,
          active:
            typeof params.active === "boolean"
              ? String(params.active)
              : params.active,
          is_active:
            typeof params.is_active === "boolean"
              ? String(params.is_active)
              : params.is_active,
          is_staff:
            typeof params.is_staff === "boolean"
              ? String(params.is_staff)
              : params.is_staff,
          is_superuser:
            typeof params.is_superuser === "boolean"
              ? String(params.is_superuser)
              : params.is_superuser,
        }),
      }
    );

    return response.data;
  },

  getRoles: async (params: { group_code?: string } = {}): Promise<UserRoleOption[]> => {
    const response = await api.get<
      UserRoleOption[] | PaginatedResponse<UserRoleOption>
    >("/api/accounts/roles/", {
      params: cleanParams(params),
    });

    return getListData<UserRoleOption>(response.data);
  },
  createWithAccess: async ( payload: UserCreateWithAccessPayload ): Promise<UserListItem> => 
    {
    const response = await api.post<UserListItem>(
      "/api/accounts/users/create-with-access/",
      payload
    );

    return response.data;
  },
};

export const userService = userApi;