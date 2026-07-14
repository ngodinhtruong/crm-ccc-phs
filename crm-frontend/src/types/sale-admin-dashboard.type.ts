export type SaAdminDashboardPeriod = {
  year: number;
  month: number;
  label: string;
  start_date: string;
  end_date: string;
  previous_label: string;
  previous_start_date: string;
  previous_end_date: string;
};

export type SaAdminBranchOption = {
  id: number;
  branch_code?: string | null;
  branch_name: string;
};

export type SaAdminOverviewMetric = {
  key: "total_calls" | "reactivated_accounts" | "transaction_value" | "transaction_fee" | string;
  label: string;
  value: string;
  previous_value: string;
  growth_percent: number | null;
  unit: "COUNT" | "VND" | string;
};

export type SaAdminBranchRankingRow = {
  rank: number;
  branch_id: number;
  branch_name: string;
  total_calls: number;
  reactivated_accounts: number;
  potential_active_accounts: number;
  transaction_fee: string;
  previous_transaction_fee: string;
  mom_growth_percent: number | null;
};

export type SaAdminBranchFeeChartRow = {
  branch_id: number;
  branch_name: string;
  current_fee: string;
  previous_fee: string;
};

export type SaAdminEmployeeAccount = {
  account_no: string;
  customer_name: string;
  branch_name: string;
  transaction_fee: string;
  transaction_value: string;
  order_count: number;
  call_date?: string | null;
};

export type SaAdminTopEmployeeRow = {
  rank: number;
  user_id: number;
  employee_id?: number | null;
  employee_name: string;
  username: string;
  email: string;
  branch_id?: number | null;
  branch_name: string;
  reactivated_accounts: number;
  raw_reactivated_accounts: number;
  total_calls: number;
  transaction_fee: string;
  transaction_value: string;
  accounts: SaAdminEmployeeAccount[];
};

export type SaAdminTopAccountRow = {
  account_no: string;
  customer_name: string;
  branch_name: string;
  transaction_fee: string;
  transaction_value: string;
  order_count: number;
  pic_user_id?: number | null;
  pic_name: string;
};

export type SaAdminProductFeeRow = {
  product_code: string;
  product_name: string;
  transaction_fee: string;
  transaction_value: string;
  order_count: number;
};

export type SaAdminIcpDistributionRow = {
  icp_type: string;
  icp_code?: string | null;
  icp_name?: string | null;
  label: string;
  count: number;
  percent: number;
};

export type SaAdminDashboardPayload = {
  period: SaAdminDashboardPeriod;
  filters: {
    branch: string;
    branch_options: SaAdminBranchOption[];
  };
  overview: SaAdminOverviewMetric[];
  branch_ranking: SaAdminBranchRankingRow[];
  branch_fee_chart: SaAdminBranchFeeChartRow[];
  top_employees: SaAdminTopEmployeeRow[];
  top_employee_chart: SaAdminTopEmployeeRow[];
  top_accounts: SaAdminTopAccountRow[];
  product_fee_chart: SaAdminProductFeeRow[];
  icp_distribution: SaAdminIcpDistributionRow[];
  meta: {
    data_sources: string[];
    matched_status: string;
    potential_account_rule: string;
  };
};

export type SaAdminDashboardParams = {
  year?: string;
  month?: string;
  branch?: string;
};
