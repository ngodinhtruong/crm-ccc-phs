/**
 * Kiểu dữ liệu của `GET /api/customers/customers/{id}/insight-360/`.
 *
 * Mọi chuỗi thời gian đều trả đủ 12 mốc tháng kể cả tháng trống, nên các biểu
 * đồ trên cùng một trang khớp trục hoành với nhau.
 */

/** Mốc tháng dùng chung cho cả ba chuỗi. */
type MonthBucket = {
  code: string;
  label: string;
  short_label: string;
};

export type Customer360Header = {
  id: number;
  customer_code: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  branch_name: string | null;
  status: string | null;
  vip_type: string;
  account_numbers: string[];
};

export type Customer360Summary = {
  tickets: number;
  calls: number;
  transactions: number;
  total_value_ytd: number;
  orders_30d: number;
  rated: number;
  /** `null` khi khách chưa từng đánh giá — khác hẳn với "đánh giá 0 điểm". */
  avg_rating: number | null;
  csat_percent: number | null;
};

export type Customer360BehaviourPattern =
  | "NONE"
  | "REGULAR"
  | "BURST"
  | "OCCASIONAL";

export type Customer360Behaviour = {
  pattern: Customer360BehaviourPattern;
  pattern_label: string;
  active_months_6m: number;
  active_months_12m: number;
  avg_transaction_value: number | null;
  product_diversity: number;
  preferred_channel: string | null;
  /** `null` khi chưa từng giao dịch, không phải 0 ngày. */
  days_inactive: number | null;
  inactive_warning: boolean;
};

export type Customer360TransactionPoint = MonthBucket & {
  buy_value: number;
  sell_value: number;
  total_value: number;
  orders: number;
};

export type Customer360CallPoint = MonthBucket & {
  total: number;
  connected: number;
  missed: number;
  duration_minutes: number;
};

export type Customer360SurveyPoint = MonthBucket & {
  rated: number;
  avg_score: number | null;
  csat_percent: number | null;
};

export type Customer360TimelineType =
  | "transaction"
  | "call"
  | "ticket"
  | "survey";

export type Customer360TimelineItem = {
  type: Customer360TimelineType;
  date: string;
  title: string;
  description: string;
  value: number | null;
  meta: string | null;
};

export type Customer360 = {
  customer: Customer360Header;
  summary: Customer360Summary;
  behaviour: Customer360Behaviour;
  series: {
    transactions: Customer360TransactionPoint[];
    calls: Customer360CallPoint[];
    surveys: Customer360SurveyPoint[];
  };
  timeline: Customer360TimelineItem[];
};
