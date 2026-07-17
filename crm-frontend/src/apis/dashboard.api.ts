import api from "@/apis/axios-client";
import {
  DashboardSummary,
  GeneralDashboard,
  GeneralDashboardParams,
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

  getGeneral: async (
    params: GeneralDashboardParams = {}
  ): Promise<GeneralDashboard> => {
    const response = await api.get<GeneralDashboard>("/api/dashboard/general/", {
      params,
    });

    return response.data;
  },
};

export const dashboardService = dashboardApi;
