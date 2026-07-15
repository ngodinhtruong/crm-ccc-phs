import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";

import {
    PaginatedResponse,
    TicketAccountOption,
    TicketClassificationOption,
    TicketCreatePayload,
    TicketErrorGroupOption,
    TicketErrorGroupPayload,
    TicketErrorTypeOption,
    TicketErrorTypePayload,
    TicketListItem,
    TicketListParams,
    TicketPriorityOption,
    TicketSourceOption,
    TicketStatusOption,
    TicketSupportCategoryOption,
} from "@/types/ticket.type";
import {
    CccDashboardParams,
    CccDashboardResponse,
} from "@/types/ccc-dashboard.type";

export const ticketApi = {
    getCccDashboard: async (
        params: CccDashboardParams = {}
    ): Promise<CccDashboardResponse> => {
        const response = await api.get<CccDashboardResponse>(
            "/api/tickets/ccc-dashboard/",
            {
                params: cleanParams(params),
            }
        );

        return response.data;
    },

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

    getErrorGroups: async (): Promise<TicketErrorGroupOption[]> => {
        const response = await api.get<
            TicketErrorGroupOption[] | PaginatedResponse<TicketErrorGroupOption>
        >("/api/tickets/error-groups/");

        return getListData<TicketErrorGroupOption>(response.data);
    },

    createErrorGroup: async (
        payload: TicketErrorGroupPayload
    ): Promise<TicketErrorGroupOption> => {
        const response = await api.post<TicketErrorGroupOption>(
            "/api/tickets/error-groups/",
            payload
        );

        return response.data;
    },

    updateErrorGroup: async (
        id: number,
        payload: Partial<TicketErrorGroupPayload>
    ): Promise<TicketErrorGroupOption> => {
        const response = await api.patch<TicketErrorGroupOption>(
            `/api/tickets/error-groups/${id}/`,
            payload
        );

        return response.data;
    },

    getErrorTypes: async (params: { group?: string } = {}): Promise<
        TicketErrorTypeOption[]
    > => {
        const response = await api.get<
            TicketErrorTypeOption[] | PaginatedResponse<TicketErrorTypeOption>
        >("/api/tickets/error-types/", {
            params: cleanParams(params),
        });

        return getListData<TicketErrorTypeOption>(response.data);
    },

    createErrorType: async (
        payload: TicketErrorTypePayload
    ): Promise<TicketErrorTypeOption> => {
        const response = await api.post<TicketErrorTypeOption>(
            "/api/tickets/error-types/",
            payload
        );

        return response.data;
    },

    updateErrorType: async (
        id: number,
        payload: Partial<TicketErrorTypePayload>
    ): Promise<TicketErrorTypeOption> => {
        const response = await api.patch<TicketErrorTypeOption>(
            `/api/tickets/error-types/${id}/`,
            payload
        );

        return response.data;
    },

};

export const ticketService = ticketApi;
