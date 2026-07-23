import api from "@/apis/axios-client";
import type {
  CccPendingTicketListParams,
  CccPendingTicketListResponse,
} from "@/types/ccc-dashboard-ticket-table.type";
import { cleanParams } from "@/utils/api-param.util";

export const cccDashboardTicketApi = {
  getPendingTickets: async (
    params: CccPendingTicketListParams,
    signal?: AbortSignal
  ): Promise<CccPendingTicketListResponse> => {
    const response = await api.get<CccPendingTicketListResponse>(
      "/api/tickets/ccc-dashboard/pending-tickets/",
      {
        params: cleanParams(params),
        signal,
      }
    );

    return response.data;
  },
};
