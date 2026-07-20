import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  ChatbotTicket,
  ChatbotTicketDetail,
  ChatbotTicketListParams,
  ChatbotTicketOptions,
  ChatbotTicketUpdatePayload,
  PaginatedResponse,
} from "@/types/chatbot-ticket.type";
import { TicketHistoryItem } from "@/types/ticket.type";

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

  /** Lịch sử thay đổi ticket chatbot. */
  getHistory: async (id: number): Promise<TicketHistoryItem[]> => {
    const response = await api.get<TicketHistoryItem[]>(
      `${BASE}/${id}/history/`
    );

    return response.data;
  },

  /**
   * Nhận xử lý ticket đang nằm ở hàng chờ chung.
   * Backend trả 409 nếu người khác đã nhận trước — đây là cơ chế chống
   * tranh chấp, nên phải đi qua endpoint này thay vì PATCH owner_user.
   */
  claim: async (id: number): Promise<ChatbotTicket> => {
    const response = await api.post<ChatbotTicket>(`${BASE}/${id}/claim/`);

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
