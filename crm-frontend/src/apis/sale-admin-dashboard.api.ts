import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  SaAdminCustomerGroupRow,
  SaAdminDashboardParams,
  SaAdminDashboardResponse,
} from "@/types/sale-admin-dashboard.type";

// Backend đã có route chuẩn này. Không gọi tuần tự 3 endpoint vì một URL sai
// có thể làm người dùng phải chờ hết timeout trước khi thử URL tiếp theo.
const DASHBOARD_ENDPOINT = "/api/sale-admin/dashboard/";
const DASHBOARD_TIMEOUT_MS = 45_000;

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
    row.group_code ||
    row.icp_code ||
    row.code ||
    row.icp_type ||
    (row.id !== undefined && row.id !== null ? String(row.id) : `G${index + 1}`);

  const groupName =
    row.group_name ||
    row.icp_name ||
    row.group_label ||
    row.label ||
    row.name ||
    groupCode ||
    "Chưa phân nhóm";

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
      year: data.filters?.year,
      month: data.filters?.month,
      date_from: data.filters?.date_from,
      date_to: data.filters?.date_to,
      branch: data.filters?.branch,
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
    product_introduction_stats: data.product_introduction_stats || null,
    support_info_stats: data.support_info_stats || null,
    icp_distribution: data.icp_distribution || [],
    customer_group_distribution: (data.customer_group_distribution || []).map(
      (row, index) => normalizeCustomerGroupRow(row, index)
    ),
    criteria: data.criteria || null,
  };
}

export const saleAdminDashboardApi = {
  getDashboard: async (
    params: SaAdminDashboardParams = {}
  ): Promise<SaAdminDashboardResponse> => {
    const response = await api.get<SaAdminDashboardResponse>(DASHBOARD_ENDPOINT, {
      params: cleanParams(params),
      timeout: DASHBOARD_TIMEOUT_MS,
    });

    return normalizeDashboardResponse(response.data);
  },
};
