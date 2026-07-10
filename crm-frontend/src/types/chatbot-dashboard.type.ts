export type ActiveTab = "overview" | "tickets" | "faqs";

export type TicketOpenOptions = {
  title: string;
  status?: string;
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

export type ChartItem = {
  name: string;
  code?: string;
  value: number;
  rate?: number;
};

export type ChatbotTicketItem = {
  id: number;
  session_id: string;

  user_id?: string | null;
  channel?: string | null;

  main_category?: string | null;
  dashboard_category?: string | null;
  state?: string | null;

  outcome_type?: string | null;
  outcome_label?: string | null;

  has_cskh_request?: boolean;

  contact_info?: string | null;
  contact_type?: string | null;
  reason?: string | null;

  first_question?: string | null;
  last_question?: string | null;
  full_conversation?: string | null;

  started_at?: string | null;
  ended_at?: string | null;

  ticket?: number | null;
  ticket_code?: string | null;
  ticket_status?: string | null;

  linked_status?: "LINKED" | "UNLINKED" | string | null;
};

export type ChatbotFaqItem = {
  question: string;
  answer?: string | null;
  category?: string | null;
  hit_count: number;
  latest_at?: string | null;
};

export type ChatbotOverviewResponse = {
  filters?: ChatbotDashboardFilters;

  summary: {
    total_received: {
      value: number;
      session_count?: number;
      label: string;
    };

    bot_done: {
      value: number;
      rate: number;
      label: string;
    };

    ccc: {
      value: number;
      rate: number;
      label: string;
    };

    spam: {
      value: number;
      rate: number;
      label: string;
    };

    waiting_info?: {
      value: number;
      label: string;
    };

    collected?: {
      value: number;
      label: string;
    };
  };

  charts: {
    process_classification: ChartItem[];
    ccc_issue_pie: ChartItem[];
    topic_bar: ChartItem[];
  };

  quick_lists: {
    latest_ccc_tickets: ChatbotTicketItem[];
    top_faqs: ChatbotFaqItem[];
  };
};

export type PaginatedResponse<T> = {
  count: number;
  next?: string | null;
  previous?: string | null;
  page?: number;
  page_size?: number;
  results: T[];
};

export type TicketListParams = ChatbotDashboardFilters & {
  status?: string;
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