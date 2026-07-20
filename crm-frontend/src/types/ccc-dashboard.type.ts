export type CccDashboardParams = {
  period?: string;
  date_from?: string;
  date_to?: string;
  created_from?: string;
  created_to?: string;
  status?: string;
  current_status?: string;
  category?: string;
  support_category?: string;
  classification?: string;
  source?: string;
  priority?: string;
  account_link_status?: string;
  vip_tier?: string;
  membership_tier?: string;
  q?: string;
  ticket_code?: string;
  account_number?: string;
  customer_account_no?: string;
  error_group?: string;
  error_type?: string;
  related_system?: string;
  recent_limit?: number;
};

export type CccDashboardFilters = {
  date_from: string;
  date_to: string;
  period?: string | null;
  status?: string | null;
  category?: string | null;
  source?: string | null;
  vip_tier?: string | null;
  account_link_status?: string | null;
  q?: string | null;
};

export type CccDashboardSlaOverview = {
  total_with_sla: number;
  on_time: number;
  overdue: number;
  processing: number;
  sla_rate: number;
};

export type CccDashboardCsatOverview = {
  survey_sent: number;
  survey_responded: number;
  response_rate: number;
  avg_score: number | null;
  csat_percentage: number | null;
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
  resolution_median_minutes?: number | null;
  resolution_p75_minutes?: number | null;
  resolution_p90_minutes?: number | null;
  linked_percentage: number;
  unlinked_percentage: number;
  resolved_percentage: number;
  cancelled_percentage: number;
  sla?: CccDashboardSlaOverview;
  csat?: CccDashboardCsatOverview;
  report_total_tickets?: number;
  report_processed_tickets?: number;
  report_cancelled_tickets?: number;
  report_transferred_tickets?: number;
  report_ekyc_tickets?: number;
};

export type CccDashboardPreviousPeriod = {
  period_from: string;
  period_to: string;
  total_tickets: number;
  resolved_tickets: number;
  cancelled_tickets: number;
  pending_processing: number;
};

export type CccDashboardMonthItem = {
  month: string;
  month_key: string;
  month_label: string;
  period_label: string;
};

export type CccDashboardReportInfo = {
  cutoff_date: string;
  range_from: string;
  range_to: string;
  month_count: number;
  months: CccDashboardMonthItem[];
  remark: {
    total_tickets: number;
    processed_tickets: number;
    cancelled_tickets: number;
    transferred_tickets: number;
    ekyc_tickets: number;
    cutoff_date: string;
    note_processed: string;
    note_cancelled: string;
  };
};

export type CccDashboardCategoryChartItem = {
  support_category_id?: number | null;
  support_category__category_code?: string | null;
  support_category__category_name?: string | null;
  count: number;
  percentage?: number | null;
};

export type CccDashboardSourceChartItem = {
  source_id?: number | null;
  source__source_code?: string | null;
  source__source_name?: string | null;
  count: number;
  percentage?: number | null;
};

export type CccDashboardStatusChartItem = {
  current_status_id?: number | null;
  current_status__status_code?: string | null;
  current_status__status_name?: string | null;
  current_status__sort_order?: number | null;
  count: number;
  percentage?: number | null;
};

export type CccDashboardBranchChartItem = {
  handling_branch_id?: number | null;
  handling_branch__branch_code?: string | null;
  handling_branch__branch_name?: string | null;
  count: number;
  percentage?: number | null;
};

export type CccDashboardRootCauseItem = {
  root_cause_type?: string;
  id?: number | null;
  code?: string | null;
  name: string;
  color?: string | null;
  error_group?: number | null;
  error_group_code?: string | null;
  error_group_name?: string | null;
  error_type?: number | null;
  error_type_code?: string | null;
  error_type_name?: string | null;
  count: number;
  percentage?: number | null;
};

export type CccDashboardSimpleChartItem = {
  key: string;
  label: string;
  count: number;
  percentage?: number | null;
};

export type CccDashboardTrendByDayItem = {
  day: string;
  count: number;
};

export type CccDashboardMonthlyProcessingItem = {
  month_str?: string;
  month?: string;
  month_key?: string;
  month_label?: string;
  period_label?: string;
  total: number;
  resolved?: number;
  processed?: number;
  cancelled: number;
  ekyc?: number;
  spam?: number;
  transferred_to_related_unit?: number;
};

export type CccDashboardMonthlySourceItem = {
  month_str?: string;
  source_id?: number | null;
  source__source_name?: string | null;
  source_key?: string;
  source_name?: string;
  month_key?: string;
  month_label?: string;
  period_label?: string;
  count?: number;
  total?: number;
  resolved?: number;
  processed?: number;
  cancelled?: number;
};

export type CccDashboardMonthlyCategoryItem = {
  month_str?: string;
  support_category_id?: number | null;
  support_category__category_name?: string | null;
  category_key?: string;
  category_name?: string;
  month_key?: string;
  month_label?: string;
  period_label?: string;
  count?: number;
  total?: number;
  resolved?: number;
  processed?: number;
  cancelled?: number;
};

export type CccDashboardReportUnitItem = {
  month: string;
  month_key: string;
  month_label: string;
  period_label: string;
  cs_processed: number;
  related_processed: number;
  cs_cancelled: number;
  related_cancelled: number;
  total_with_related_unit: number;
};

export type CccDashboardReportTimeCategoryItem = {
  category_name: string;
  current_avg_days: number | null;
  previous_avg_days: number | null;
};

export type CccDashboardReportTime = {
  cs_by_category: CccDashboardReportTimeCategoryItem[];
  related_by_category: CccDashboardReportTimeCategoryItem[];
  current_cs_avg_days: number | null;
  previous_cs_avg_days: number | null;
  current_related_avg_days: number | null;
  previous_related_avg_days: number | null;
};

export type CccDashboardReportSlaMonthlyItem = {
  month: string;
  month_key: string;
  month_label: string;
  period_label: string;
  total_sla: number;
  on_time: number;
  overdue: number;
  processing: number;
  related_unit_overdue: number;
};

export type CccDashboardReportSlaCategoryItem = {
  category_name: string;
  not_overdue: number;
  overdue: number;
};

export type CccDashboardReportSlaUnitMonthItem = {
  month_key: string;
  month_label: string;
  period_label: string;
  unit_name: string;
  overdue: number;
};

export type CccDashboardReportSla = {
  monthly: CccDashboardReportSlaMonthlyItem[];
  overdue_by_category: CccDashboardReportSlaCategoryItem[];
  overdue_by_unit_month: CccDashboardReportSlaUnitMonthItem[];
};

export type CccDashboardReportEmployeeItem = {
  employee_name: string;
  total: number;
  processed: number;
  related_processed: number;
  cancelled: number;
  ekyc: number;
  avg_cs_days: number | null;
  avg_related_days: number | null;
};

export type CccDashboardCharts = {
  tickets_by_category: CccDashboardCategoryChartItem[];
  tickets_by_source: CccDashboardSourceChartItem[];
  tickets_by_status: CccDashboardStatusChartItem[];
  tickets_by_branch: CccDashboardBranchChartItem[];
  linked_vs_unlinked: CccDashboardSimpleChartItem[];
  trend_by_day: CccDashboardTrendByDayItem[];
  root_cause_breakdown: CccDashboardRootCauseItem[];
  monthly_processing: CccDashboardMonthlyProcessingItem[];
  monthly_source: CccDashboardMonthlySourceItem[];
  monthly_category: CccDashboardMonthlyCategoryItem[];
  ageing_backlog?: CccDashboardSimpleChartItem[];
  report_monthly_processing?: CccDashboardMonthlyProcessingItem[];
  report_source?: CccDashboardMonthlySourceItem[];
  report_category?: CccDashboardMonthlyCategoryItem[];
  report_unit?: CccDashboardReportUnitItem[];
  report_time?: CccDashboardReportTime;
  report_sla?: CccDashboardReportSla;
  report_employee?: CccDashboardReportEmployeeItem[];
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
  problem_name: string;
  count: number;
  latest_created_at?: string | null;
};

export type CccDashboardAuditTrailItem = {
  id: number;
  ticket: number;
  ticket_code?: string | null;
  action_type: string;
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
  ticket_code: string;
  title?: string | null;
  created_at?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  display_account_number?: string | null;
  account_link_status?: string | null;
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

export type CccDashboardTables = {
  recurring_issues: CccDashboardRecurringIssue[];
  audit_trail: CccDashboardAuditTrailItem[];
  recent_tickets: CccDashboardTicketItem[];
  pending_tickets: CccDashboardTicketItem[];
};

export type CccDashboardMyTicketTabs = {
  all: number;
  linked: number;
  unlinked: number;
};

export type CccDashboardResponse = {
  filters: CccDashboardFilters;
  overview: CccDashboardOverview;
  previous_period: CccDashboardPreviousPeriod;
  report?: CccDashboardReportInfo;
  charts: CccDashboardCharts;
  tables: CccDashboardTables;
  my_ticket_tabs: CccDashboardMyTicketTabs;
  generated_at: string;
};
