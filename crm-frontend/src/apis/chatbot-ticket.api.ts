import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  ChatbotTicket,
  ChatbotTicketDetail,
  ChatbotTicketListParams,
  ChatbotTicketOptions,
  ChatbotTicketStatus,
  ChatbotTicketUpdatePayload,
  PaginatedResponse,
} from "@/types/chatbot-ticket.type";

const BASE = "/api/chatbots/ticket-chatbots";

export const chatbotTicketApi = {
  getList: async (
    params: ChatbotTicketListParams = {}
  ): Promise<PaginatedResponse<ChatbotTicket>> => {
    const response = await api.get<PaginatedResponse<ChatbotTicket>>(`${BASE}/`, {
      params: cleanParams(params),
    });

    return response.data;
  },

  getDetail: async (id: number): Promise<ChatbotTicketDetail> => {
    const response = await api.get<ChatbotTicketDetail>(`${BASE}/${id}/`);

    return response.data;
  },

  claim: async (id: number): Promise<ChatbotTicket> => {
    const response = await api.post<ChatbotTicket>(`${BASE}/${id}/claim/`);

    return response.data;
  },

  changeStatus: async (
    id: number,
    status: ChatbotTicketStatus,
    cancelledReason?: string
  ): Promise<ChatbotTicket> => {
    const response = await api.post<ChatbotTicket>(
      `${BASE}/${id}/change-status/`,
      cleanParams({ status, cancelled_reason: cancelledReason })
    );

    return response.data;
  },

  updateSolution: async (
    id: number,
    handlingSolution: string
  ): Promise<ChatbotTicket> => {
    const response = await api.patch<ChatbotTicket>(`${BASE}/${id}/`, {
      handling_solution: handlingSolution,
    });

    return response.data;
  },

  update: async (
    id: number,
    payload: ChatbotTicketUpdatePayload
  ): Promise<ChatbotTicket> => {
    const response = await api.patch<ChatbotTicket>(`${BASE}/${id}/`, payload);

    return response.data;
  },

  getOptions: async (): Promise<ChatbotTicketOptions> => {
    const response = await api.get<ChatbotTicketOptions>(`${BASE}/options/`);

    return response.data;
  },
};
