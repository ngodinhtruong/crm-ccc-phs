export type ActiveTab = "overview" | "tickets" | "faqs";

/** Nhóm xử lý của một phiên chat. TOPIC là bộ lọc ghép: bot tự xử lý + chuyển CCC. */
export type OutcomeCode =
  | "ALL"
  | "BOT_DONE"
  | "CCC"
  | "RESEARCH"
  | "SPAM"
  | "PENDING"
  | "UNCLASSIFIED"
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
  refresh?: string | boolean;
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
  research: number;
  pending: number;
  spam: number;
  unclassified: number;
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
  research: number;
  pending: number;
  spam: number;
  unclassified: number;
  bot_done_rate: number;
};

export type CccMultiMonthTopicsData = {
  month_labels: string[];
  top_categories: string[];
  data_by_category: Array<Record<string, any>>;
  /**
   * Số nhóm bị gom vào cột "Khác". Biểu đồ chỉ vẽ top N nhóm; phần đuôi được
   * cộng dồn chứ không bị bỏ, nên tổng của biểu đồ luôn khớp số liệu gốc.
   */
  other_group_count?: number;
  other_group_label?: string;
};

export type CategoryCccRateItem = {
  name: string;
  total: number;
  ccc: number;
  rate: number;
};

export type CategoryBotVsCccItem = {
  name: string;
  bot_done: number;
  ccc: number;
  total: number;
  ccc_rate: number;
};

/**
 * Độ dài một phiên tính bằng số lượt tin nhắn.
 *
 * Có cả `avg_messages` lẫn `median_messages` vì hai con số lệch nhau rất xa —
 * vài phiên dài kéo trung bình lên trong khi quá nửa số phiên chỉ có 1 lượt.
 */
export type SessionLengthData = {
  avg_messages: number;
  median_messages: number;
  total_sessions: number;
  total_messages: number;
  /** Phân bố theo mốc độ dài, giữ đúng thứ tự ngắn → dài. */
  distribution: Array<{ name: string; value: number; rate: number }>;
  /** Trung bình lượt/phiên của từng nền tảng, sắp giảm dần. */
  by_channel: Array<{
    name: string;
    value: number;
    session_count: number;
    message_count: number;
  }>;
};

/** Một chủ đề bị cắt khỏi biểu đồ, kèm số phiên của nó. */
export type CategorySkippedTopic = {
  name: string;
  total: number;
};

/**
 * So sánh bot tự xử lý với chuyển CCC trên cùng một chủ đề.
 *
 * Các trường `skipped_*` là số phiên KHÔNG nằm trong `items` — phiên chưa gán
 * chủ đề, chủ đề dưới ngưỡng `min_volume`, và chủ đề rơi ngoài top. Frontend
 * ghi chú các con số này dưới biểu đồ để người xem biết phần bị cắt.
 *
 * Hai mảng `skipped_*_items` liệt kê đích danh tên chủ đề và số phiên, để ghi
 * chú nói rõ "chủ đề nào" thay vì chỉ một con số tổng không tra được.
 */
export type CategoryBotVsCccData = {
  items: CategoryBotVsCccItem[];
  min_volume: number;
  skipped_uncategorized: number;
  skipped_low_volume: number;
  skipped_beyond_limit: number;
  skipped_low_volume_items?: CategorySkippedTopic[];
  skipped_beyond_limit_items?: CategorySkippedTopic[];
};

/**
 * Cùng bộ chủ đề của `CategoryBotVsCccData` nhưng tách theo kỳ, để so được
 * bot đang khá lên hay tệ đi trên từng chủ đề khi bộ lọc trải nhiều kỳ.
 *
 * Mỗi dòng là một chủ đề; mỗi kỳ là một khóa động mang tỷ lệ % chuyển CCC,
 * kèm ba khóa phụ `<kỳ>__bot`, `<kỳ>__ccc`, `<kỳ>__total` để tooltip hiện số
 * phiên thật. Kỳ không có phiên nào của chủ đề mang giá trị `null` (khác hẳn
 * 0% nghĩa là bot xử lý hết).
 */
export type CategoryBotVsCccByPeriodData = {
  period_labels: string[];
  items: Array<Record<string, any>>;
};

/**
 * Thống kê thể loại câu hỏi (`questionType` của hai bảng log).
 *
 * Tách theo nguồn vì hai nền tảng gán questionType không đều nhau — nhìn cột
 * "Chưa gán loại" là biết ngay nguồn nào đang thiếu, thay vì tưởng khách bên
 * đó không hỏi. `sources` là tên bảng Supabase gốc; mỗi phần tử `items` mang
 * một khóa động cho từng nguồn kèm `value` là tổng.
 */
export type QuestionTypeBarData = {
  sources: string[];
  items: Array<{ name: string; value: number } & Record<string, any>>;
};

/**
 * Thời lượng phiên theo nền tảng.
 *
 * Có cả trung bình lẫn trung vị vì dữ liệu lệch rất nặng: một phiên kéo dài
 * nhiều ngày đủ đẩy trung bình lên gấp vài chục lần trung vị. Đọc mỗi trung
 * bình sẽ tưởng khách trò chuyện hàng giờ.
 */
export type SessionDurationItem = {
  name: string;
  session_count: number;
  avg_minutes: number;
  median_minutes: number;
  max_minutes: number;
  /** Phiên chỉ có một lượt hỏi — thời lượng bằng 0. */
  single_turn_count: number;
};

export type SessionDurationByPeriodData = {
  period_labels: string[];
  items: Array<{ name: string } & Record<string, any>>;
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
    research: SummaryBucket;
    spam: SummaryBucket;
    pending: SummaryBucket;
    unclassified: SummaryBucket;
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

    category_bot_vs_ccc?: CategoryBotVsCccData;
    category_bot_vs_ccc_multi_period?: CategoryBotVsCccByPeriodData;
    category_ccc_rate?: CategoryCccRateItem[];
    question_type_bar?: QuestionTypeBarData;
    session_duration_by_channel?: SessionDurationItem[];
    session_duration_multi_period?: SessionDurationByPeriodData;
    question_type_multi_period?: CccMultiMonthTopicsData;
    chat_funnel?: FunnelStepItem[];
    hourly_peak?: HourlyPeakItem[];
    hourly_peak_multi_period?: HourlyPeakByPeriodData;
    session_length?: SessionLengthData;
    top_reasons?: ChartItem[];
    /** Chủ đề rơi ngoài top của `top_reasons`, để ghi chú dưới biểu đồ. */
    top_reasons_skipped?: ChartItem[];
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
    /** Câu hỏi rơi ngoài top của `top_faqs`, để ghi chú dưới bảng. */
    top_faqs_skipped?: ChartItem[];
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

/**
 * Bộ lọc theo từng cột của bảng phiên, đặt ngay dưới dòng tiêu đề.
 *
 * Khác `q` (tìm chung trên nhiều cột) và khác `dashboard_category` (khớp
 * tuyệt đối, do biểu đồ truyền vào khi bấm một cột): đây là những ô người
 * dùng gõ tay nên tìm gần đúng trên đúng một cột.
 */
export type ChatbotTicketColumnFilters = {
  ticket_code: string;
  ticket_status: string;
  session_id: string;
  started_from: string;
  started_to: string;
  channel: string;
  category: string;
  msg_count_min: string;
  msg_count_max: string;
  contact_info: string;
  last_question: string;
  reason: string;
};

export type ChatbotTicketColumnFilterKey = keyof ChatbotTicketColumnFilters;

export type TicketListParams = ChatbotDashboardFilters &
  Partial<ChatbotTicketColumnFilters> & {
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
