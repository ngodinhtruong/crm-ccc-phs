export type SaAdminDashboardParams = {
  year?: string;
  month?: string;
  date_from?: string;
  date_to?: string;
  branch?: string;
};

export type SaAdminDashboardPeriod = {
  year?: number | string;
  month?: number | string;
  label?: string;
  code?: string;
  date_from?: string;
  date_to?: string;
  current_label?: string;
  previous_label?: string;
  previous_year?: number | string;
  previous_month?: number | string;
  previous_code?: string;
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
  previous_label?: string | null;
  growth_percent?: number | null;
  unit?: "COUNT" | "VND" | "PERCENT" | string | null;
};

export type SaAdminBranchRankingRow = {
  branch_id: number | null;
  branch_name: string;
  rank: number | null;
  total_calls: number;
  reactivated_accounts: number;
  potential_active_accounts: number;

  sa_transaction_value?: number | string;
  sa_transaction_fee?: number | string;
  broker_transaction_value?: number | string;
  broker_transaction_fee?: number | string;
  total_transaction_value?: number | string;
  total_transaction_fee?: number | string;

  transaction_fee?: number | string;
  transaction_value?: number | string;
  previous_transaction_fee?: number | string;
  mom_growth_percent?: number | null;
};

export type SaAdminBranchFeeChartRow = {
  branch_id: number | null;
  branch_name: string;
  current_fee: number | string;
  previous_fee: number | string;
  current_label?: string | null;
  previous_label?: string | null;
};

export type SaAdminAccountRow = {
  account_no: string;
  customer_name?: string | null;
  branch_name?: string | null;
  transaction_fee: number | string;
  transaction_value: number | string;
  order_count: number;
  call_date?: string | null;
  pic_name?: string | null;
  reactivation?: boolean;
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
  rank?: number;
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

export type SaAdminCustomerGroupRow = {
  group_id?: number | string | null;
  group_code?: string | null;
  group_name?: string | null;
  group_label?: string | null;
  icp_code?: string | null;
  icp_name?: string | null;
  icp_type?: string | null;
  description?: string | null;
  count: number;
  percent?: number;
  transaction_fee?: number | string;
  transaction_value?: number | string;
  accounts: SaAdminAccountRow[];
};

export type SaAdminCriteriaDefinition = {
  title?: string;
  formula?: string;
  groups?: Array<{
    code: string;
    name: string;
    description?: string;
  }>;
  note?: string;
};

export type SaAdminDashboardFilters = {
  year?: string | number;
  month?: string | number;
  date_from?: string;
  date_to?: string;
  branch?: string;
  branch_options: SaAdminBranchOption[];
};

export type SaAdminDashboardResponse = {
  generated_at?: string | null;
  period?: SaAdminDashboardPeriod | null;
  filters: SaAdminDashboardFilters;
  overview: SaAdminOverviewMetric[];
  summary_cards?: SaAdminOverviewMetric[];
  branch_ranking: SaAdminBranchRankingRow[];
  branch_total?: SaAdminBranchRankingRow | null;
  fee_by_branch: SaAdminBranchFeeChartRow[];
  top_employees: SaAdminTopEmployeeRow[];
  top_accounts: SaAdminTopAccountRow[];
  product_fee: SaAdminProductFeeRow[];
  icp_distribution: SaAdminIcpDistributionRow[];
  customer_group_distribution: SaAdminCustomerGroupRow[];
  criteria?: SaAdminCriteriaDefinition | null;
};
