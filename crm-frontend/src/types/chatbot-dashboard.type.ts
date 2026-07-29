export type ActiveTab = "overview" | "tickets" | "faqs";

/** Nhóm xử lý của một phiên chat. TOPIC là bộ lọc ghép: bot tự xử lý + chuyển CCC. */
export type OutcomeCode =
  | "ALL"
  | "BOT_DONE"
  | "CCC"
  | "SPAM"
  | "PENDING"
  | "TOPIC";

export type TicketOpenOptions = {
  title: string;
  status?: OutcomeCode;
  dashboard_category?: string;
};

/** Mốc thời gian của trục hoành. AUTO = để backend suy từ khoảng lọc. */
export type GranularityMode =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year";

export type GranularityChoice = GranularityMode | "auto";

export type ChatbotDashboardFilters = {
  year?: string;
  month?: string;
  start_date?: string;
  end_date?: string;
  start_hour?: string;
  end_hour?: string;
  granularity?: GranularityChoice;
};

/** Một cột trong biểu đồ so sánh kỳ (kỳ này với kỳ liền trước). */
export type PeriodComparisonItem = {
  key: string;
  label: string;
  /** Kỳ nằm trong khoảng người dùng đang lọc — tô nổi bật. */
  is_current: boolean;
  total: number;
  bot_done: number;
  ccc: number;
  pending: number;
  spam: number;
  ccc_rate: number;
  prev_label: string | null;
  prev_total: number | null;
  /** null = kỳ đầu tiên, không có gì để so sánh (khác với 0 = không đổi). */
  delta: number | null;
  growth_percent: number | null;
};

/**
 * Kết quả xử lý phiên chia theo kỳ — thay cho biểu đồ tròn.
 *
 * Mỗi phần tử `data` có `label`, `is_current` và một khóa cho từng nhãn trong
 * `series` (ví dụ "Chatbot tự xử lý": 142), nên vẽ thẳng bằng stacked bar.
 */
export type OutcomeByPeriod = {
  series: string[];
  data: ({
    key: string;
    label: string;
    is_current: boolean;
  } & Record<string, number | string | boolean>)[];
};

export type PeriodComparison = {
  granularity: GranularityMode;
  granularity_label: string;
  items: PeriodComparisonItem[];
};

/** Một ô KPI / một cột trong biểu đồ phân loại xử lý. */
export type SummaryBucket = {
  code: OutcomeCode;
  label: string;
  value: number;
  session_count: number;
  rate: number;
};

/** Một lát trong biểu đồ tròn / một dòng trong xếp hạng chủ đề. */
export type ChartItem = {
  name: string;
  value: number;
};

export type ChatbotTicketItem = {
  id: number;
  session_id: string;

  user_id?: string | null;
  channel?: string | null;

  dashboard_category?: string | null;
  category_label?: string | null;

  outcome_type?: OutcomeCode | null;
  outcome_label?: string | null;

  has_cskh_state?: boolean;
  has_cskh_request?: boolean;
  state_step?: string | null;

  contact_info?: string | null;
  contact_type?: string | null;
  reason?: string | null;

  first_question?: string | null;
  last_question?: string | null;
  full_conversation?: string | null;

  msg_count_total?: number;

  started_at?: string | null;
  ended_at?: string | null;

  ticket?: number | null;
  ticket_code?: string | null;
  ticket_status?: string | null;

  ticket_chatbot_id?: number | null;
  ticket_chatbot_code?: string | null;
  ticket_chatbot_status?: string | null;

  linked_status?: "LINKED" | "UNLINKED" | string | null;
};

/** FAQ = chủ đề (category) được hỏi nhiều nhất. */
export type ChatbotFaqItem = {
  category: string;
  hit_count: number;
  session_count: number;
  latest_at?: string | null;
};

export type TimeSeriesOutcomeItem = {
  date: string;
  label: string;
  /**
   * Kỳ nằm trong bộ lọc. Khi bộ lọc gói gọn trong một kỳ (vd "hôm nay"),
   * backend nới dữ liệu ra trọn kỳ cha nên chuỗi có cả các kỳ xung quanh
   * làm nền so sánh — cờ này để tô nổi kỳ đang xem.
   */
  is_current: boolean;
  total: number;
  bot_done: number;
  ccc: number;
  pending: number;
  spam: number;
  bot_done_rate: number;
};

export type CccMultiMonthTopicsData = {
  month_labels: string[];
  top_categories: string[];
  data_by_category: Array<Record<string, any>>;
};

export type CategoryCccRateItem = {
  name: string;
  total: number;
  ccc: number;
  rate: number;
};

export type FunnelStepItem = {
  step: number;
  name: string;
  count: number;
};

export type HourlyPeakItem = {
  hour: number;
  label: string;
  count: number;
};

/**
 * Khung giờ trong ngày tách theo kỳ: 24 dòng cố định, mỗi kỳ là một khóa động
 * trên dòng (ví dụ `{ hour: 14, label: "14:00", "T07/2026": 90 }`).
 */
export type HourlyPeakByPeriodData = {
  period_labels: string[];
  data: Array<Record<string, any>>;
};

export type ChannelPerformanceItem = {
  name: string;
  total: number;
  bot_done: number;
  ccc: number;
  bot_done_rate: number;
  ccc_rate: number;
};

export type ChatbotOverviewResponse = {
  filters?: ChatbotDashboardFilters;

  /** Mốc backend đã thực sự dùng (quan trọng khi frontend để chế độ tự động). */
  granularity?: GranularityMode;
  granularity_label?: string;

  summary: {
    total_received: SummaryBucket;
    bot_done: SummaryBucket;
    ccc: SummaryBucket;
    spam: SummaryBucket;
    pending: SummaryBucket;
  };

  charts: {
    outcome_by_period?: OutcomeByPeriod;
    period_comparison?: PeriodComparison;
    topic_bar: ChartItem[];
    channel_distribution: ChartItem[];
    ticket_status_distribution: ChartItem[];

    time_series_outcomes?: TimeSeriesOutcomeItem[];
    ccc_multi_month_topics?: CccMultiMonthTopicsData;
    all_topic_multi_month?: CccMultiMonthTopicsData;

    category_ccc_rate?: CategoryCccRateItem[];
    chat_funnel?: FunnelStepItem[];
    hourly_peak?: HourlyPeakItem[];
    hourly_peak_multi_period?: HourlyPeakByPeriodData;
    top_reasons?: ChartItem[];
    top_reasons_multi_period?: CccMultiMonthTopicsData;
    channel_performance?: ChannelPerformanceItem[];
    channel_performance_multi_period?: CccMultiMonthTopicsData;
  };

  quick_lists: {
    /** Ticket chatbot đang Mở và chưa ai nhận — lô mới nhất, tối đa 50 dòng. */
    latest_ccc_tickets: ChatbotTicketItem[];
    /** Tổng số ticket chưa tiếp nhận trên toàn hàng chờ. */
    pending_ticket_total?: number;
    top_faqs: ChatbotFaqItem[];
  };
};

export type ChatbotMessage = {
  id: number;
  session_id: string;
  user_id?: string | null;
  channel?: string | null;
  question?: string | null;
  answer?: string | null;
  questionType?: string | null;
  category?: string | null;
  external_created_at?: string | null;
};

export type ChatbotSessionDetail = {
  session: ChatbotTicketItem;
  messages: ChatbotMessage[];
};

export type PaginatedResponse<T> = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};

export type TicketListParams = ChatbotDashboardFilters & {
  status?: OutcomeCode;
  q?: string;
  dashboard_category?: string;
  page?: number;
  page_size?: number;
};

export type FaqListParams = ChatbotDashboardFilters & {
  q?: string;
  page?: number;
  page_size?: number;
};
