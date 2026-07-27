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

export type ChatbotDashboardFilters = {
  year?: string;
  month?: string;
  start_date?: string;
  end_date?: string;
  start_hour?: string;
  end_hour?: string;
  granularity?: "day" | "week" | "month";
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

export type ProcessChartItem = SummaryBucket & {
  name: string;
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

export type ChatbotMonthlyTicketItem = {
  month: string;
  month_key: string;
  month_label: string;
  count: number;
};

export type ChatbotSeriesItem = {
  key: string;
  label: string;
  count: number;
};

export type TimeSeriesOutcomeItem = {
  date: string;
  label: string;
  total: number;
  bot_done: number;
  ccc: number;
  pending: number;
  spam: number;
  bot_done_rate: number;
};

export type CustomerLinkageData = {
  total: number;
  linked: number;
  unlinked: number;
  linked_rate: number;
  items: Array<{ name: string; value: number; color: string }>;
};

export type CccMultiMonthTopicsData = {
  month_labels: string[];
  top_categories: string[];
  data_by_month: Array<Record<string, any>>;
  data_by_category: Array<Record<string, any>>;
};

export type TopicStackedOutcomesData = {
  month_labels: string[];
  top_categories: string[];
  data: Array<Record<string, any>>;
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

  summary: {
    total_received: SummaryBucket;
    bot_done: SummaryBucket;
    ccc: SummaryBucket;
    spam: SummaryBucket;
    pending: SummaryBucket;
  };

  charts: {
    process_classification: ProcessChartItem[];
    ccc_issue_pie?: ChartItem[];
    topic_bar: ChartItem[];
    monthly_chatbot_tickets: ChatbotMonthlyTicketItem[];
    daily_chatbot_tickets: ChatbotSeriesItem[];
    hourly_chatbot_tickets: ChatbotSeriesItem[];
    channel_distribution: ChartItem[];
    ticket_status_distribution: ChartItem[];

    time_series_outcomes?: TimeSeriesOutcomeItem[];
    customer_linkage?: CustomerLinkageData;
    ccc_multi_month_topics?: CccMultiMonthTopicsData;
    topic_stacked_outcomes?: TopicStackedOutcomesData;
    all_topic_multi_month?: CccMultiMonthTopicsData;
    category_ccc_rate_multi_month?: CccMultiMonthTopicsData;

    category_ccc_rate?: CategoryCccRateItem[];
    chat_funnel?: FunnelStepItem[];
    hourly_peak?: HourlyPeakItem[];
    top_reasons?: ChartItem[];
    top_reasons_multi_period?: CccMultiMonthTopicsData;
    channel_performance?: ChannelPerformanceItem[];
    channel_performance_multi_period?: CccMultiMonthTopicsData;
  };

  quick_lists: {
    /** Ticket chatbot đang Mở và chưa ai nhận — 5 dòng mới nhất. */
    latest_ccc_tickets: ChatbotTicketItem[];
    /** Tổng số ticket chưa tiếp nhận (không giới hạn 5 dòng hiển thị). */
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
