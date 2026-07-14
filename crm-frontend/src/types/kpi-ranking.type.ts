import { KpiProfileCode } from "@/types/kpi-dashboard.type";

export type KpiRankingCategory =
  | "TOTAL"
  | "MANUAL"
  | "AUTO"
  | "FEE"
  | "REACTIVATED"
  | "GATE";

export type KpiRankingStatus =
  | "ALL"
  | "HAS_DATA"
  | "NO_DATA"
  | "GATE_PASSED"
  | "GATE_FAILED";

export type KpiRankingCategoryOption = {
  value: KpiRankingCategory;
  label: string;
  description?: string;
};

export type KpiRankingItem = {
  rank: number;
  user: number;
  user_username?: string | null;
  user_email?: string | null;
  employee?: number | null;
  employee_code?: string | null;
  employee_name?: string | null;
  branch?: number | null;
  branch_name?: string | null;
  has_summary: boolean;
  manual_score?: string | null;
  auto_score?: string | null;
  total_score?: string | null;
  all_gates_passed?: boolean | null;
  failed_gate_codes?: string[] | string | null;
  reward_tier_code?: string | null;
  reward_tier_name?: string | null;
  rank_overall?: number | null;
  rank_branch?: number | null;
  rank_fee?: number | null;
  rank_reactivated_accounts?: number | null;
  fee_value?: string | null;
  reactivated_accounts?: string | null;
  ranking_value?: string | null;
  calculated_at?: string | null;
};

export type KpiRankingResponse = {
  period: number;
  period_code?: string | null;
  period_name?: string | null;
  profile?: number | null;
  profile_code?: KpiProfileCode | null;
  category: KpiRankingCategory;
  status: KpiRankingStatus;
  categories: KpiRankingCategoryOption[];
  total_count: number;
  has_summary_count: number;
  no_summary_count: number;
  items: KpiRankingItem[];
};

export type KpiRankingParams = {
  period?: string;
  profile_code?: KpiProfileCode;
  category?: KpiRankingCategory;
  status?: KpiRankingStatus;
  q?: string;
  branch?: string;
};
