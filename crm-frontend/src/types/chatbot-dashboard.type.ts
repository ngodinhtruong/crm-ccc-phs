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
    ccc_issue_pie: ChartItem[];
    topic_bar: ChartItem[];
  };

  quick_lists: {
    latest_ccc_tickets: ChatbotTicketItem[];
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
