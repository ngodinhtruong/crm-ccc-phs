export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type KpiPeriodStatus = "DRAFT" | "ACTIVE" | "LOCKED" | "CLOSED";
export type KpiPeriodType = "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR";
export type KpiGroupType = "MANUAL" | "AUTO" | "MIXED";

export type KpiFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "ON_EVENT";

export type KpiTargetUnit = "COUNT" | "PERCENT";

export type KpiProfileCode = "SA" | "SA_SUP" | string;

export type KpiWeightValidation = {
  valid: boolean;
  errors: string[];
};

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
  profile_count?: number;
  section_count?: number;
  group_count?: number;
  metric_count?: number;
  gate_count?: number;
  reward_tier_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
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
  section_count?: number;
  group_count?: number;
  metric_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiSectionItem = {
  id: number;
  period: number;
  period_code?: string;
  profile: number;
  profile_code?: KpiProfileCode;
  profile_name?: string;
  section_code: string;
  section_name: string;
  weight_percent: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiGroupItem = {
  id: number;
  period: number;
  period_code?: string;
  profile: number;
  profile_code?: KpiProfileCode;
  profile_name?: string;
  section: number;
  section_code?: string;
  section_name?: string;
  group_code: string;
  group_name: string;
  group_type: KpiGroupType;
  weight_percent: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiPeriodMetricItem = {
  id: number;
  period: number;
  period_code?: string;
  profile: number;
  profile_code?: KpiProfileCode;
  profile_name?: string;
  section_code?: string;
  section_name?: string;
  group: number;
  group_code?: string;
  group_name?: string;
  metric_code: string;
  metric_name: string;
  weight_percent: string;
  work_description?: string | null;
  measurement_formula: string;
  target_text?: string | null;
  target_value?: string | null;
  target_unit?: KpiTargetUnit | null;
  frequency?: KpiFrequency | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;

  /**
   * Deprecated compatibility fields.
   * Không dùng cho UI mới, nhưng giữ tạm để các component cũ không vỡ trong lúc migrate.
   */
  metric_definition?: number | null;
  definition_code?: string | null;
  input_type?: "MANUAL" | "AUTO" | null;
  formula_key?: string | null;
  min_value?: string | null;
  max_value?: string | null;
  formula_config?: Record<string, unknown> | null;
  description?: string | null;
  sort_order?: number;
};

export type KpiGateDefinitionItem = {
  id: number;
  gate_code: string;
  gate_name: string;
  description?: string | null;
  formula_key: string;
  default_threshold?: string | null;
  operator: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiPeriodGateConfigItem = {
  id: number;
  period: number;
  period_code?: string;
  profile?: number | null;
  profile_code?: KpiProfileCode | null;
  profile_name?: string | null;
  gate_definition: number;
  definition_code?: string;
  gate_code: string;
  gate_name: string;
  formula_key: string;
  operator: string;
  threshold_value: string;
  is_required: boolean;
  is_active: boolean;
  formula_config?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiRewardTierConfigItem = {
  id: number;
  period: number;
  period_code?: string;
  profile?: number | null;
  profile_code?: KpiProfileCode | null;
  profile_name?: string | null;
  tier_code: string;
  tier_name: string;
  description?: string | null;
  rank_metric_code?: string | null;
  rank_limit?: number | null;
  min_total_score?: string | null;
  require_all_gates_passed: boolean;
  reward_type?: string | null;
  reward_config?: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiPeriodDetail = KpiPeriodItem & {
  profiles: KpiProfileItem[];
  sections: KpiSectionItem[];
  groups: KpiGroupItem[];
  metrics: KpiPeriodMetricItem[];
  gate_configs: KpiPeriodGateConfigItem[];
  reward_tiers: KpiRewardTierConfigItem[];
};

export type KpiCreateMonthlyPayload = {
  year: number;
  month: number;
  activate?: boolean;
};

export type KpiCreateMonthlyResponse = {
  detail: string;
  created: boolean;
  period: KpiPeriodDetail;
};

export type KpiConfigMutationResponse<T> = {
  detail: string;
  changed: boolean;
  weight_validation?: KpiWeightValidation;
  item: T;
};

export type KpiValidateWeightPayload = {
  profile?: number | string;
  profile_code?: string;
};

export type KpiSaveWeightConfigPayload = {
  profile?: number | string;
  profile_code?: string;
  sections?: {
    id: number;
    weight_percent: string;
    is_active?: boolean;
  }[];
  groups?: {
    id: number;
    weight_percent: string;
    is_active?: boolean;
  }[];
  metrics?: {
    id: number;
    weight_percent: string;
    is_active?: boolean;
  }[];
};

export type KpiSaveWeightConfigResponse = {
  detail: string;
  changed: boolean;
  weight_validation: KpiWeightValidation;
  period: KpiPeriodDetail;
};

export type KpiProfilePayload = {
  period: number;
  profile_code: string;
  profile_name: string;
  target_role_code: string;
  total_weight?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type KpiSectionPayload = {
  period: number;
  profile: number;
  section_code: string;
  section_name: string;
  weight_percent: string;
  sort_order?: number;
  is_active?: boolean;
};

export type KpiGroupPayload = {
  period: number;
  profile: number;
  section: number;
  group_code: string;
  group_name: string;
  group_type: KpiGroupType;
  weight_percent: string;
  sort_order?: number;
  is_active?: boolean;
};

export type KpiMetricPayload = {
  period: number;
  profile: number;
  group: number;
  metric_code: string;
  metric_name: string;
  weight_percent: string;
  work_description?: string | null;
  measurement_formula: string;
  target_text?: string | null;
  target_value?: string | null;
  target_unit?: KpiTargetUnit | null;
  frequency?: KpiFrequency | null;
  is_active?: boolean;

  /**
   * Deprecated compatibility fields.
   * Không gửi lên backend mới.
   */
  metric_definition?: number | null;
  min_value?: string | null;
  max_value?: string | null;
  formula_config?: Record<string, unknown> | null;
  description?: string | null;
  sort_order?: number;
};

export type KpiGateConfigPayload = {
  period: number;
  profile?: number | null;
  gate_definition: number;
  gate_code?: string;
  gate_name?: string;
  operator?: string;
  threshold_value?: string;
  is_required?: boolean;
  is_active?: boolean;
  formula_config?: Record<string, unknown> | null;
};

export type KpiRewardTierPayload = {
  period: number;
  profile?: number | null;
  tier_code: string;
  tier_name: string;
  description?: string | null;
  rank_metric_code?: string | null;
  rank_limit?: number | null;
  min_total_score?: string | null;
  require_all_gates_passed?: boolean;
  reward_type?: string | null;
  reward_config?: Record<string, unknown> | null;
  sort_order?: number;
  is_active?: boolean;
};

export type KpiGateDefinitionPayload = {
  gate_code: string;
  gate_name: string;
  description?: string | null;
  formula_key: string;
  default_threshold?: string | null;
  operator: string;
  is_active?: boolean;
};

export type KpiPeriodPayload = {
  period_code?: string;
  period_name?: string;
  period_type?: KpiPeriodType;
  year?: number;
  month?: number | null;
  quarter?: number | null;
  half_year?: number | null;
  start_date?: string;
  end_date?: string;
  status?: KpiPeriodStatus;
  total_weight?: string;
};

/**
 * Deprecated compatibility types.
 * Backend mới không còn KPI master / metric definitions.
 */
export type KpiInputType = "MANUAL" | "AUTO";

export type KpiMetricDefinitionItem = {
  id: number;
  metric_code: string;
  metric_name: string;
  description?: string | null;
  input_type: KpiInputType;
  formula_key?: string | null;
  unit: string;
  min_score: string;
  max_score: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiMetricDefinitionPayload = {
  metric_code: string;
  metric_name: string;
  description?: string | null;
  input_type: KpiInputType;
  formula_key?: string | null;
  unit: string;
  min_score?: string;
  max_score?: string;
  is_active?: boolean;
};
