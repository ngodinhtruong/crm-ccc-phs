import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";


import {
    PaginatedResponse,
    TicketAccountOption,
    TicketClassificationOption,
    TicketCreatePayload,
    TicketListItem,
    TicketListParams,
    TicketPriorityOption,
    TicketSourceOption,
    TicketStatusOption,
    TicketSupportCategoryOption,
} from "@/types/ticket.type";

export const ticketApi = {
    getTickets: async (
        params: TicketListParams = {}
    ): Promise<PaginatedResponse<TicketListItem>> => {
        const response = await api.get<PaginatedResponse<TicketListItem>>(
            "/api/tickets/tickets/",
            {
                params: cleanParams(params),
            }
        );

        const data = response.data;

        if (Array.isArray(data)) {
            return {
                count: data.length,
                next: null,
                previous: null,
                results: data,
            };
        }

        return data;
    },

    createTicket: async (
        payload: TicketCreatePayload
    ): Promise<TicketListItem> => {
        const response = await api.post<TicketListItem>(
            "/api/tickets/tickets/",
            payload
        );

        return response.data;
    },

    getCustomerAccounts: async (params: {
        customer?: string;
        company?: string;
    }): Promise<TicketAccountOption[]> => {
        const response = await api.get("/api/customers/customer-accounts/", {
            params: cleanParams(params),
        });

        return getListData<TicketAccountOption>(response.data);
    },
    getSupportCategories: async (): Promise<TicketSupportCategoryOption[]> => {
        const response = await api.get<
            TicketSupportCategoryOption[] | PaginatedResponse<TicketSupportCategoryOption>
        >("/api/tickets/support-categories/");

        return getListData<TicketSupportCategoryOption>(response.data);
    },

    getClassifications: async (params: { support_category?: string } = {}): Promise<
        TicketClassificationOption[]
    > => {
        const response = await api.get<
            TicketClassificationOption[] | PaginatedResponse<TicketClassificationOption>
        >("/api/tickets/classifications/", {
            params: cleanParams(params),
        });

        return getListData<TicketClassificationOption>(response.data);
    },

    getStatuses: async (): Promise<TicketStatusOption[]> => {
        const response = await api.get<
            TicketStatusOption[] | PaginatedResponse<TicketStatusOption>
        >("/api/tickets/statuses/");

        return getListData<TicketStatusOption>(response.data);
    },

    getPriorities: async (): Promise<TicketPriorityOption[]> => {
        const response = await api.get<
            TicketPriorityOption[] | PaginatedResponse<TicketPriorityOption>
        >("/api/tickets/priorities/");

        return getListData<TicketPriorityOption>(response.data);
    },

    getSources: async (): Promise<TicketSourceOption[]> => {
        const response = await api.get<
            TicketSourceOption[] | PaginatedResponse<TicketSourceOption>
        >("/api/tickets/sources/");

        return getListData<TicketSourceOption>(response.data);
    },
};

export const ticketService = ticketApi;