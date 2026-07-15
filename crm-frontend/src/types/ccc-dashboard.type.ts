export type CccDashboardAccountLinkStatus = "LINKED" | "UNLINKED" | "";

export type CccDashboardParams = {
  period?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  category?: string;
  support_category?: string;
  source?: string;
  account_link_status?: CccDashboardAccountLinkStatus | string;
  vip_tier?: string;
  q?: string;
  error_group?: string;
  error_type?: string;
  related_system?: string;
  recent_limit?: string | number;
};

export type CccDashboardFilters = {
  date_from?: string | null;
  date_to?: string | null;
  period?: string | null;
  status?: string | null;
  category?: string | null;
  source?: string | null;
  vip_tier?: string | null;
  account_link_status?: string | null;
  q?: string | null;
};

export type CccDashboardOverview = {
  total_tickets: number;
  resolved_tickets: number;
  pending_processing: number;
  cancelled_tickets: number;
  linked_tickets: number;
  unlinked_tickets: number;
  error_tickets: number;
  recurring_issue_count: number;
  overdue_sla: number;
  average_resolution_minutes: number | null;
  linked_percentage: number;
  unlinked_percentage: number;
  resolved_percentage: number;
};

export type CccDashboardCategoryChartItem = {
  support_category_id?: number | null;
  support_category__category_code?: string | null;
  support_category__category_name?: string | null;
  count: number;
  percentage: number;
};

export type CccDashboardSourceChartItem = {
  source_id?: number | null;
  source__source_code?: string | null;
  source__source_name?: string | null;
  count: number;
  percentage: number;
};

export type CccDashboardStatusChartItem = {
  current_status_id?: number | null;
  current_status__status_code?: string | null;
  current_status__status_name?: string | null;
  current_status__sort_order?: number | null;
  count: number;
  percentage: number;
};

export type CccDashboardBranchChartItem = {
  handling_branch_id?: number | null;
  handling_branch__branch_code?: string | null;
  handling_branch__branch_name?: string | null;
  count: number;
  percentage: number;
};

export type CccDashboardLinkChartItem = {
  key: "LINKED" | "UNLINKED" | string;
  label: string;
  count: number;
  percentage: number;
};

export type CccDashboardTrendItem = {
  day: string;
  count: number;
};

export type CccDashboardRootCauseItem = {
  root_cause_type?: string | null;
  id?: number | null;
  code?: string | null;
  name?: string | null;
  color?: string | null;
  error_group?: number | null;
  error_group_code?: string | null;
  error_group_name?: string | null;
  error_type?: number | null;
  error_type_code?: string | null;
  error_type_name?: string | null;
  count: number;
  percentage: number;
};

export type CccDashboardRecurringIssue = {
  source?: number | null;
  source_code?: string | null;
  source_name?: string | null;
  support_category?: number | null;
  support_category_code?: string | null;
  support_category_name?: string | null;
  classification?: number | null;
  classification_code?: string | null;
  classification_name?: string | null;
  error_group?: number | null;
  error_group_code?: string | null;
  error_group_name?: string | null;
  error_type?: number | null;
  error_type_code?: string | null;
  error_type_name?: string | null;
  problem_name?: string | null;
  count: number;
  latest_created_at?: string | null;
};

export type CccDashboardAuditLog = {
  id: number;
  ticket?: number | null;
  ticket_code?: string | null;
  action_type?: string | null;
  from_status?: number | null;
  from_status_code?: string | null;
  from_status_name?: string | null;
  to_status?: number | null;
  to_status_code?: string | null;
  to_status_name?: string | null;
  from_employee_name?: string | null;
  to_employee_name?: string | null;
  updated_by?: number | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  note?: string | null;
};

export type CccDashboardTicketItem = {
  id: number;
  ticket_code?: string | null;
  title?: string | null;
  created_at?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  display_account_number?: string | null;
  account_link_status?: "LINKED" | "UNLINKED" | string | null;
  status_code?: string | null;
  status_name?: string | null;
  category_name?: string | null;
  source_name?: string | null;
  handling_branch_name?: string | null;
  assigned_employee_name?: string | null;
  is_error_ticket?: boolean;
  error_group_name?: string | null;
  error_type_name?: string | null;
};

export type CccDashboardCharts = {
  tickets_by_category: CccDashboardCategoryChartItem[];
  tickets_by_source: CccDashboardSourceChartItem[];
  tickets_by_status: CccDashboardStatusChartItem[];
  tickets_by_branch: CccDashboardBranchChartItem[];
  linked_vs_unlinked: CccDashboardLinkChartItem[];
  trend_by_day: CccDashboardTrendItem[];
  root_cause_breakdown: CccDashboardRootCauseItem[];
};

export type CccDashboardTables = {
  recurring_issues: CccDashboardRecurringIssue[];
  audit_trail: CccDashboardAuditLog[];
  recent_tickets: CccDashboardTicketItem[];
};

export type CccDashboardMyTicketTabs = {
  all: number;
  linked: number;
  unlinked: number;
};

export type CccDashboardResponse = {
  filters: CccDashboardFilters;
  overview: CccDashboardOverview;
  charts: CccDashboardCharts;
  tables: CccDashboardTables;
  my_ticket_tabs: CccDashboardMyTicketTabs;
  generated_at?: string | null;
};
