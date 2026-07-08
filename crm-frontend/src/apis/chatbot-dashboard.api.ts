import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  ChatbotDashboardFilters,
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  ChatbotTicketItem,
  FaqListParams,
  PaginatedResponse,
  TicketListParams,
} from "@/types/chatbot-dashboard.type";

export const chatbotDashboardApi = {
  getOverview: async (
    filters: ChatbotDashboardFilters = {}
  ): Promise<ChatbotOverviewResponse> => {
    const response = await api.get<ChatbotOverviewResponse>(
      "/api/chatbots/dashboard/overview/",
      {
        params: cleanParams(filters),
      }
    );

    return response.data;
  },

  getTickets: async (
    params: TicketListParams = {}
  ): Promise<PaginatedResponse<ChatbotTicketItem>> => {
    const response = await api.get<PaginatedResponse<ChatbotTicketItem>>(
      "/api/chatbots/dashboard/tickets/",
      {
        params: cleanParams(params),
      }
    );

    return response.data;
  },

  getFaqs: async (
    params: FaqListParams = {}
  ): Promise<PaginatedResponse<ChatbotFaqItem>> => {
    const response = await api.get<PaginatedResponse<ChatbotFaqItem>>(
      "/api/chatbots/dashboard/faqs/",
      {
        params: cleanParams(params),
      }
    );

    return response.data;
  },
};

export const chatbotDashboardService = chatbotDashboardApi;