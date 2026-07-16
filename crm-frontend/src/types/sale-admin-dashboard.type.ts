export type SaAdminDashboardParams = {
  year?: string;
  month?: string;
  branch?: string;
};

export type SaAdminBranchOption = {
  id: number;
  branch_code?: string | null;
  branch_name: string;
};

export type SaAdminOverviewMetric = {
  key: string;
  label: string;
  value: number | string;
  previous_value?: number | string | null;
  growth_percent?: number | null;
  unit?: "COUNT" | "VND" | "PERCENT" | string | null;
};

export type SaAdminBranchRankingRow = {
  branch_id: number;
  branch_name: string;
  rank: number;
  total_calls: number;
  reactivated_accounts: number;
  potential_active_accounts: number;
  transaction_fee: number | string;
  mom_growth_percent?: number | null;
};

export type SaAdminBranchFeeChartRow = {
  branch_id: number;
  branch_name: string;
  current_fee: number | string;
  previous_fee: number | string;
};

export type SaAdminAccountRow = {
  account_no: string;
  customer_name?: string | null;
  branch_name?: string | null;
  transaction_fee: number | string;
  transaction_value: number | string;
  order_count: number;
  call_date?: string | null;
};

export type SaAdminTopEmployeeRow = {
  user_id: number;
  username?: string | null;
  email?: string | null;
  employee_name: string;
  branch_name: string;
  rank: number;
  total_calls: number;
  reactivated_accounts: number;
  transaction_fee: number | string;
  transaction_value: number | string;
  accounts: SaAdminAccountRow[];
};

export type SaAdminTopAccountRow = SaAdminAccountRow & {
  pic_name?: string | null;
};

export type SaAdminProductFeeRow = {
  product_code: string;
  product_name: string;
  transaction_fee: number | string;
};

export type SaAdminIcpDistributionRow = {
  icp_type: string;
  icp_code?: string | null;
  label: string;
  count: number;
  percent: number;
};

export type SaAdminDashboardFilters = {
  branch_options: SaAdminBranchOption[];
};

export type SaAdminDashboardResponse = {
  generated_at?: string | null;
  filters: SaAdminDashboardFilters;
  overview: SaAdminOverviewMetric[];
  branch_ranking: SaAdminBranchRankingRow[];
  fee_by_branch: SaAdminBranchFeeChartRow[];
  top_employees: SaAdminTopEmployeeRow[];
  top_accounts: SaAdminTopAccountRow[];
  product_fee: SaAdminProductFeeRow[];
  icp_distribution: SaAdminIcpDistributionRow[];
};
