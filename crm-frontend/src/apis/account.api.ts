import api from "@/apis/axios-client";
import { CurrentUser } from "@/types/account.type";

export const accountApi = {
  getMe: async (): Promise<CurrentUser> => {
    const response = await api.get<CurrentUser>("/api/accounts/me/");
    return response.data;
  },
};

export const accountService = accountApi;