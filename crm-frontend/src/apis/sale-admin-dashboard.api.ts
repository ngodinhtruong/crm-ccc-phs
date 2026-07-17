import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  SaAdminCustomerGroupRow,
  SaAdminDashboardParams,
  SaAdminDashboardResponse,
} from "@/types/sale-admin-dashboard.type";

const PRIMARY_ENDPOINT = "/api/sale-admin/admin-dashboard/";
const REPORT_ENDPOINT = "/api/sale-admin/report-dashboard/";
const FALLBACK_ENDPOINT = "/api/sale-admin/dashboard/";

type LooseCustomerGroupRow = Partial<SaAdminCustomerGroupRow> & {
  id?: string | number | null;
  code?: string | null;
  name?: string | null;
  label?: string | null;
};

function normalizeCustomerGroupRow(
  row: LooseCustomerGroupRow,
  index: number
): SaAdminCustomerGroupRow {
  const groupCode =
    row.group_code || row.icp_code || row.code || row.icp_type ||
    (row.id !== undefined && row.id !== null ? String(row.id) : `G${index + 1}`);

  const groupName =
    row.group_name || row.icp_name || row.group_label || row.label || row.name || groupCode || "Chưa phân nhóm";

  return {
    ...row,
    group_code: String(groupCode || `G${index + 1}`),
    group_name: String(groupName || "Chưa phân nhóm"),
    count: Number(row.count || 0),
    percent: Number(row.percent || 0),
    transaction_fee: row.transaction_fee || 0,
    transaction_value: row.transaction_value || 0,
    accounts: row.accounts || [],
  };
}

function normalizeDashboardResponse(
  data: Partial<SaAdminDashboardResponse>
): SaAdminDashboardResponse {
  const overview = data.summary_cards || data.overview || [];

  return {
    generated_at: data.generated_at || null,
    period: data.period || null,
    filters: {
      branch_options: data.filters?.branch_options || [],
    },
    overview,
    summary_cards: overview,
    branch_ranking: data.branch_ranking || [],
    branch_total: data.branch_total || null,
    fee_by_branch: data.fee_by_branch || [],
    top_employees: data.top_employees || [],
    top_accounts: data.top_accounts || [],
    product_fee: data.product_fee || [],
    icp_distribution: data.icp_distribution || [],
    customer_group_distribution: (data.customer_group_distribution || []).map(
      (row, index) => normalizeCustomerGroupRow(row, index)
    ),
    criteria: data.criteria || null,
  };
}

async function requestDashboard(endpoint: string, params: SaAdminDashboardParams) {
  const response = await api.get<SaAdminDashboardResponse>(endpoint, {
    params: cleanParams(params),
  });

  return normalizeDashboardResponse(response.data);
}

export const saleAdminDashboardApi = {
  getDashboard: async (
    params: SaAdminDashboardParams = {}
  ): Promise<SaAdminDashboardResponse> => {
    try {
      return await requestDashboard(PRIMARY_ENDPOINT, params);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;

      if (status !== 404) {
        throw error;
      }
    }

    try {
      return await requestDashboard(REPORT_ENDPOINT, params);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;

      if (status !== 404) {
        throw error;
      }
    }

    return requestDashboard(FALLBACK_ENDPOINT, params);
  },
};
