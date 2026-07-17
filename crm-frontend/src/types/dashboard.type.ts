export type DashboardOverviewItem = {
  key: string;
  label: string;
  value: number;
  href: string;
};

export type DashboardQuickSetting = {
  key: string;
  title: string;
  description: string;
  href: string;
  value: number;
  icon: string;
};

export type TicketStatusSummary = {
  current_status__status_code: string | null;
  current_status__status_name: string | null;
  count: number;
};

export type DashboardSummary = {
  overview: DashboardOverviewItem[];
  quick_settings: DashboardQuickSetting[];
  ticket_status_summary: TicketStatusSummary[];
};

export type HomeTicket = {
  id: number;
  ticket_code: string;
  branch_name: string;
  classification_name: string;
  company_name: string;
  status_name: string;
  description: string;
  source_name: string;
};

export type HomeChartItem = {
  label: string;
  count: number;
};

export type ChartItem = HomeChartItem;

export type HomeDashboard = {
  latest_tickets: HomeTicket[];
  source_summary: HomeChartItem[];
  category_summary: HomeChartItem[];
  customer_type_summary: HomeChartItem[];
  total_tickets: number;
};

export type HomeTabKey = "Ticket" | "Call Center" | "Hoạt động" | "Ghi chú";

export type GeneralDashboardBranchOption = {
  id: string;
  name: string;
};

export type GeneralDashboardFilters = {
  branch: string;
  date_from: string;
  date_to: string;
  branch_options: GeneralDashboardBranchOption[];
};

export type GeneralDashboardOverview = {
  total_customers: number;
  active_customers: number;
  total_tickets: number;
  unlinked_tickets: number;
  total_transactions: number;
  matched_value: number;
};

export type GeneralDashboardPortfolioHealth = {
  icp_score: number;
  grouped_customers: number;
  total_customers_health: number;
  avg_ltv: number;
  avg_ltv_fees: number;
  active_customers_ltv: number;
  aar: number;
  reactivated_with_trades: number;
  total_reactivated_records: number;
  churn: number;
  churn_count: number;
  referral: number;
  referral_count: number;
};

export type GeneralDashboardChartItem = {
  name: string;
  value: number;
};

export type GeneralDashboardCharts = {
  vip_tier_distribution: GeneralDashboardChartItem[];
  branch_distribution: GeneralDashboardChartItem[];
  customer_type_distribution: GeneralDashboardChartItem[];

  ticket_status_distribution: GeneralDashboardChartItem[];
  ticket_category_distribution: GeneralDashboardChartItem[];
  ticket_source_distribution: GeneralDashboardChartItem[];
  ticket_priority_distribution: GeneralDashboardChartItem[];
  ticket_classification_distribution: GeneralDashboardChartItem[];

  customer_group_distribution: GeneralDashboardChartItem[];
  call_result_distribution: GeneralDashboardChartItem[];
  interest_level_distribution: GeneralDashboardChartItem[];
  pic_distribution: GeneralDashboardChartItem[];
  campaign_distribution: GeneralDashboardChartItem[];

  product_type_distribution: GeneralDashboardChartItem[];
  channel_distribution: GeneralDashboardChartItem[];
  order_status_distribution: GeneralDashboardChartItem[];
  buy_sell_distribution: GeneralDashboardChartItem[];
  top_tickers_distribution: GeneralDashboardChartItem[];
};

export type GeneralDashboard = {
  filters: GeneralDashboardFilters;
  overview: GeneralDashboardOverview;
  portfolio_health: GeneralDashboardPortfolioHealth;
  charts: GeneralDashboardCharts;
};

export type GeneralDashboardParams = {
  branch?: string;
  date_from?: string;
  date_to?: string;
};
