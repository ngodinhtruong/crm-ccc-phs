import api from "@/apis/axios-client";
import {
  DashboardSummary,
  HomeDashboard,
} from "@/types/dashboard.type";

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>("/api/dashboard/summary/");
    return response.data;
  },

  getHome: async (): Promise<HomeDashboard> => {
    const response = await api.get<HomeDashboard>("/api/dashboard/home/");
    return response.data;
  },
};

export const dashboardService = dashboardApi;