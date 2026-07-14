export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type KpiPeriodStatus = "DRAFT" | "ACTIVE" | "LOCKED" | "CLOSED";
export type KpiPeriodType = "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR";

export type KpiInputType = "MANUAL" | "AUTO";
export type KpiGroupType = "MANUAL" | "AUTO" | "MIXED";

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
  group_count?: number;
  metric_count?: number;
  gate_count?: number;
  reward_tier_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type KpiGroupItem = {
  id: number;
  period: number;
  period_code?: string;
  group_code: string;
  group_name: string;
  group_type: KpiGroupType;
  weight_percent: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

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

export type KpiPeriodMetricItem = {
  id: number;
  period: number;
  period_code?: string;
  group: number;
  group_code?: string;
  group_name?: string;
  metric_definition: number;
  definition_code?: string;
  metric_code: string;
  metric_name: string;
  input_type: KpiInputType;
  formula_key?: string | null;
  weight_percent: string;
  target_value?: string | null;
  min_value?: string | null;
  max_value?: string | null;
  formula_config?: Record<string, unknown> | null;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
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

export type KpiSaveWeightConfigPayload = {
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

export type KpiGroupPayload = {
  period: number;
  group_code: string;
  group_name: string;
  group_type: KpiGroupType;
  weight_percent: string;
  sort_order?: number;
  is_active?: boolean;
};

export type KpiMetricPayload = {
  period: number;
  group: number;
  metric_definition: number;
  metric_code: string;
  metric_name?: string;
  weight_percent: string;
  target_value?: string | null;
  min_value?: string | null;
  max_value?: string | null;
  formula_config?: Record<string, unknown> | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type KpiGateConfigPayload = {
  period: number;
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

export type KpiGateDefinitionPayload = {
  gate_code: string;
  gate_name: string;
  description?: string | null;
  formula_key: string;
  default_threshold?: string | null;
  operator: string;
  is_active?: boolean;
};