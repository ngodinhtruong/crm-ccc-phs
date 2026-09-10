import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  ChatbotDashboardFilters,
  ChatbotExportParams,
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  ChatbotSessionDetail,
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

  getSessionDetail: async (sessionId: string): Promise<ChatbotSessionDetail> => {
    const response = await api.get<ChatbotSessionDetail>(
      `/api/chatbots/dashboard/sessions/${encodeURIComponent(sessionId)}/`
    );

    return response.data;
  },

  exportData: async (params: ChatbotExportParams = {}): Promise<void> => {
    const format = params.export_format || "excel";
    const response = await api.get("/api/chatbots/dashboard/export/", {
      params: cleanParams(params),
      responseType: "blob",
    });

    const extension = format === "csv" ? "csv" : "xlsx";
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const filename = `Chatbot_Export_${dateStr}.${extension}`;

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const chatbotDashboardService = chatbotDashboardApi;