import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  SaAdminDashboardParams,
  SaAdminDashboardResponse,
} from "@/types/sale-admin-dashboard.type";

const PRIMARY_ENDPOINT = "/api/sale-admin/admin-dashboard/";
const FALLBACK_ENDPOINT = "/api/sale-admin/dashboard/";

function normalizeDashboardResponse(data: Partial<SaAdminDashboardResponse>): SaAdminDashboardResponse {
  return {
    generated_at: data.generated_at || null,
    filters: {
      branch_options: data.filters?.branch_options || [],
    },
    overview: data.overview || [],
    branch_ranking: data.branch_ranking || [],
    fee_by_branch: data.fee_by_branch || [],
    top_employees: data.top_employees || [],
    top_accounts: data.top_accounts || [],
    product_fee: data.product_fee || [],
    icp_distribution: data.icp_distribution || [],
  };
}

export const saleAdminDashboardApi = {
  getDashboard: async (
    params: SaAdminDashboardParams = {}
  ): Promise<SaAdminDashboardResponse> => {
    try {
      const response = await api.get<SaAdminDashboardResponse>(PRIMARY_ENDPOINT, {
        params: cleanParams(params),
      });

      return normalizeDashboardResponse(response.data);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;

      if (status !== 404) {
        throw error;
      }

      const fallbackResponse = await api.get<SaAdminDashboardResponse>(FALLBACK_ENDPOINT, {
        params: cleanParams(params),
      });

      return normalizeDashboardResponse(fallbackResponse.data);
    }
  },
};
