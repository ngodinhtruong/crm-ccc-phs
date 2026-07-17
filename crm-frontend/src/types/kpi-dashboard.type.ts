export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type KpiPeriodStatus = "DRAFT" | "ACTIVE" | "LOCKED" | "CLOSED";
export type KpiPeriodType = "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR";
export type KpiProfileCode = "SA" | "SA_SUP" | string;
export type KpiGroupType = "MANUAL" | "AUTO" | "MIXED";
export type KpiResultSourceType = "MANUAL" | "AUTO" | string;
export type KpiProgressStatus = "GREEN" | "YELLOW" | "RED" | "EMPTY";
export type KpiGateDashboardStatus = "PASSED" | "RISK" | "FAILED" | "UNKNOWN";
export type KpiDashboardScope = "SELF" | "BRANCH";

export type KpiFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "ON_EVENT"
  | string;

export type KpiTargetUnit = "COUNT" | "PERCENT" | "VND" | string;

export type KpiPeriodItem = {
  id: number;
  period_code: string;
  period_name: string;
  period_type: KpiPeriodType;
  year: number;
  month?: number | null;
  quarter?: number | null;
  half_year?: number | null;
  start_date: string;
  end_date: string;
  status: KpiPeriodStatus;
  total_weight: string;
};

export type KpiProfileItem = {
  id: number;
  period: number;
  period_code?: string;
  profile_code: KpiProfileCode;
  profile_name: string;
  target_role_code: string;
  total_weight: string;
  sort_order: number;
  is_active: boolean;
};

export type KpiSectionItem = {
  id: number;
  period: number;
  profile: number;
  profile_code?: KpiProfileCode;
  section_code: string;
  section_name: string;
  weight_percent: string;
  sort_order: number;
  is_active: boolean;
};

export type KpiGroupItem = {
  id: number;
  period: number;
  profile: number;
  section: number;
  section_code?: string;
  section_name?: string;
  group_code: string;
  group_name: string;
  group_type: KpiGroupType;
  weight_percent: string;
  sort_order: number;
  is_active: boolean;
};

export type KpiPeriodMetricItem = {
  id: number;
  period: number;
  period_code?: string;
  profile: number;
  profile_code?: KpiProfileCode;
  profile_name?: string;
  section?: number;
  section_code?: string;
  section_name?: string;
  group: number;
  group_code?: string;
  group_name?: string;
  metric_code: string;
  metric_name: string;
  weight_percent: string;
  // work_description?: string | null;
  measurement_formula?: string | null;
  target_text?: string | null;
  target_value?: string | null;
  target_unit?: KpiTargetUnit | null;
  frequency?: KpiFrequency | null;
  is_active: boolean;
};

export type KpiUserMetricResultItem = {
  id: number;
  period: number;
  period_code?: string;
  profile?: number | null;
  profile_code?: KpiProfileCode | null;
  group?: number | null;
  group_code?: string | null;
  group_name?: string | null;
  metric: number;
  metric_code?: string | null;
  metric_name?: string | null;
  user: number;
  user_username?: string | null;
  user_email?: string | null;
  employee?: number | null;
  employee_name?: string | null;
  branch?: number | null;
  branch_name?: string | null;
  source_type: KpiResultSourceType;
  actual_value?: string | null;
  target_value?: string | null;
  window_start_date?: string | null;
  window_end_date?: string | null;
  denominator_value?: string | null;
  contributing_record_count?: number | null;
  score?: string | null;
  weight_percent?: string | null;
  weighted_score?: string | null;
  result_status?: string | null;
  evidence_data?: Record<string, unknown> | null;
  scored_by_user_name?: string | null;
  scored_at?: string | null;
  calculated_at?: string | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiUserGateResultItem = {
  id: number;
  period: number;
  period_code?: string;
  profile?: number | null;
  profile_code?: KpiProfileCode | null;
  gate_config: number;
  gate_code?: string | null;
  gate_name?: string | null;
  user: number;
  user_username?: string | null;
  user_email?: string | null;
  employee?: number | null;
  employee_name?: string | null;
  branch?: number | null;
  branch_name?: string | null;
  actual_value?: string | null;
  threshold_value?: string | null;
  operator?: string | null;
  is_passed?: boolean | null;
  result_label?: string | null;
  calculated_at?: string | null;
};

export type KpiUserSummaryItem = {
  id: number;
  period: number;
  period_code?: string;
  profile?: number | null;
  profile_code?: KpiProfileCode | null;
  user: number;
  user_username?: string | null;
  user_email?: string | null;
  employee?: number | null;
  employee_name?: string | null;
  branch?: number | null;
  branch_name?: string | null;
  manual_score?: string | null;
  auto_score?: string | null;
  total_score?: string | null;
  manual_weight?: string | null;
  auto_weight?: string | null;
  all_gates_passed?: boolean | null;
  failed_gate_codes?: string[] | string | null;
  reward_tier?: number | null;
  reward_tier_code?: string | null;
  reward_tier_name?: string | null;
  rank_overall?: number | null;
  rank_branch?: number | null;
  rank_fee?: number | null;
  rank_reactivated_accounts?: number | null;
  calculated_at?: string | null;
};

export type KpiDashboardParams = {
  period?: string;
  profile_code?: string;
  user?: string;
};


export type KpiContributionRecordItem = {
  id: number;
  record_code?: string | null;
  account_no?: string | null;
  customer_name_snapshot?: string | null;
  branch_name_snapshot?: string | null;
  pic_name_snapshot?: string | null;
  call_date?: string | null;
  follow_no?: number | null;
  call_result_code?: string | null;
  call_result_name?: string | null;
  interest_level_code?: string | null;
  interest_level_name?: string | null;
  icp_group_code?: string | null;
  icp_group_name?: string | null;
  introduced_product?: boolean;
  reactivation?: boolean;
  support_info?: boolean;
  referred_rm?: boolean;
  handover_to_broker?: boolean;
  transaction_value_snapshot?: string | null;
  transaction_fee_snapshot?: string | null;
  data_status?: string | null;
  note?: string | null;
  contributes: boolean;
  contribution_label: string;
  contribution_reason?: string | null;
};

export type KpiMetricContributionResponse = {
  period: number;
  period_code?: string | null;
  profile?: number | null;
  profile_code?: KpiProfileCode | null;
  user: number;
  metric: {
    id: number;
    metric_code: string;
    metric_name: string;
    measurement_formula?: string | null;
  };
  summary: {
    formula_key?: string | null;
    contribution_mode?: string | null;
    window_start_date?: string | null;
    window_end_date?: string | null;
    window_label?: string | null;
    total_record_count: number;
    contributing_record_count: number;
    non_contributing_record_count: number;
    reactivated_account_nos?: string[];
    active_post_reactivation_account_nos?: string[];
  };
  records: KpiContributionRecordItem[];
};

export type KpiMetricContributionParams = KpiDashboardParams & {
  metric?: string;
  metric_code?: string;
};

export type KpiProgressMetric = {
  metric: KpiPeriodMetricItem;
  result: KpiUserMetricResultItem | null;
  actualValue: number | null;
  targetValue: number | null;
  progressPercent: number | null;
  progressStatus: KpiProgressStatus;
  sourceType: "MANUAL" | "AUTO";
  displayActual: string;
  displayTarget: string;
  displayUnit: string;
  windowStartDate?: string | null;
  windowEndDate?: string | null;
  windowLabel?: string | null;
  denominatorValue?: number | null;
  contributingRecordCount?: number | null;
};

export type KpiMetricGroup = {
  group: KpiGroupItem;
  metrics: KpiProgressMetric[];
  activeMetricCount: number;
};

export type KpiMetricSection = {
  section: KpiSectionItem;
  groups: KpiMetricGroup[];
  metricCount: number;
};

export type KpiGateStatusItem = {
  gate: KpiUserGateResultItem;
  status: KpiGateDashboardStatus;
  progressPercent: number | null;
};


