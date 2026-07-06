import api from "./api";

export type LoginPayload = {
  username: string;
  password: string;
};

export type TokenResponse = {
  access: string;
  refresh: string;
};

export const authService = {
  login: async (payload: LoginPayload) => {
    const response = await api.post<TokenResponse>("/api/token/", payload);

    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);

    return response.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  isAuthenticated: () => {
    if (typeof window === "undefined") return false;

    return Boolean(localStorage.getItem("access_token"));
  },
};