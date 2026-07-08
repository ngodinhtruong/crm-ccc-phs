import api from "./api";

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

export type ChatbotOverviewResponse = {
  summary: {
    total_received: {
      value: number;
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

export type ChatbotTicketItem = {
  id: number;
  session_id: string;
  user_id?: string;
  channel?: string;

  main_category?: string;
  dashboard_category?: string;
  state?: string;
  outcome_type: string;
  outcome_label?: string;

  has_cskh_request: boolean;
  contact_info?: string;
  contact_type?: string;
  reason?: string;

  first_question?: string;
  last_question?: string;
  full_conversation?: string;

  started_at?: string;
  ended_at?: string;

  ticket?: number | null;
  ticket_code?: string;
  ticket_status?: string;
  linked_status?: "LINKED" | "UNLINKED" | string;
};

export type ChatbotFaqItem = {
  question: string;
  answer: string;
  category: string;
  hit_count: number;
  latest_at: string | null;
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

function cleanParams<T extends Record<string, any>>(params: T): T {
  const result: Record<string, any> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  });

  return result as T;
}

export const chatbotDashboardService = {
  getOverview: async (
    filters: ChatbotDashboardFilters = {}
  ): Promise<ChatbotOverviewResponse> => {
    const response = await api.get("/api/chatbots/dashboard/overview/", {
      params: cleanParams(filters),
    });

    return response.data;
  },

  getTickets: async (
    params: TicketListParams = {}
  ): Promise<PaginatedResponse<ChatbotTicketItem>> => {
    const response = await api.get("/api/chatbots/dashboard/tickets/", {
      params: cleanParams(params),
    });

    return response.data;
  },

  getFaqs: async (
    params: FaqListParams = {}
  ): Promise<PaginatedResponse<ChatbotFaqItem>> => {
    const response = await api.get("/api/chatbots/dashboard/faqs/", {
      params: cleanParams(params),
    });

    return response.data;
  },
};