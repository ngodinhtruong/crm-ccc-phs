import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  SaAdminDashboardParams,
  SaAdminDashboardPayload,
} from "@/types/sale-admin-dashboard.type";

const SA_ADMIN_DASHBOARD_ENDPOINT = "/api/sale-admin/dashboard/";

export const saleAdminDashboardApi = {
  getDashboard: async (
    params: SaAdminDashboardParams = {}
  ): Promise<SaAdminDashboardPayload> => {
    const response = await api.get<SaAdminDashboardPayload>(
      SA_ADMIN_DASHBOARD_ENDPOINT,
      {
        params: cleanParams(params),
      }
    );

    return response.data;
  },
};
