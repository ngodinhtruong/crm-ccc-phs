import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";

import {
    PaginatedResponse,
    TicketAccountOption,
    TicketClassificationOption,
    TicketCreatePayload,
    TicketDetail,
    TicketHistoryItem,
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

    getTicketById: async (id: number): Promise<TicketDetail> => {
        const response = await api.get<TicketDetail>(
            `/api/tickets/tickets/${id}/`
        );

        return response.data;
    },

    /** Đổi trạng thái ticket. Nếu SLA đã vượt, backend bắt buộc phải có lý do vượt. */
    updateTicketStatus: async (
        id: number,
        payload: {
            to_status_code: string;
            note?: string;
            breach_reason?: number | null;
            breach_note?: string;
            cancelled_reason?: string;
        }
    ): Promise<TicketDetail> => {
        const response = await api.post<TicketDetail>(
            `/api/tickets/tickets/${id}/status/`,
            cleanParams(payload)
        );

        return response.data;
    },

    /** Sửa thông tin ticket. Backend ghi log từng field đổi vào lịch sử. */
    amendTicket: async (
        id: number,
        payload: {
            title?: string;
            support_category?: number | null;
            classification?: number | null;
            source?: number | null;
            priority?: number | null;
            sla_policy?: number | null;
            customer?: number | null;
            company?: number | null;
            customer_account?: number | null;
            error_group?: number | null;
            error_type?: number | null;
            related_system?: string;
            error_note?: string;
            request_content?: string;
            handling_solution?: string;
            final_response?: string;
        }
    ): Promise<TicketDetail> => {
        const response = await api.post<TicketDetail>(
            `/api/tickets/tickets/${id}/amend/`,
            cleanParams(payload)
        );

        return response.data;
    },

    /** Phân công xử lý: đổi đơn vị / chi nhánh / nhân viên. Tự đóng phân công cũ. */
    assignTicket: async (
        id: number,
        payload: {
            to_unit?: number | null;
            to_branch?: number | null;
            to_employee?: number | null;
            transfer_reason?: string;
            note?: string;
        }
    ): Promise<TicketDetail> => {
        const response = await api.post<TicketDetail>(
            `/api/tickets/tickets/${id}/assign/`,
            cleanParams(payload)
        );

        return response.data;
    },

    /**
     * Tự nhận một ticket đang nằm hàng chờ (chưa ai xử lý).
     *
     * Endpoint riêng thay vì PATCH owner_user: hai người bấm cùng lúc thì
     * người sau nhận 409 chứ không ghi đè im lặng.
     */
    claimTicket: async (id: number): Promise<TicketDetail> => {
        const response = await api.post<TicketDetail>(
            `/api/tickets/tickets/${id}/claim/`
        );

        return response.data;
    },

    /** Đánh dấu gửi khảo sát hài lòng cho ticket. */
    sendTicketSurvey: async (id: number, sendSurvey: boolean) => {
        const response = await api.post(`/api/tickets/tickets/${id}/survey/`, {
            send_survey: sendSurvey,
        });

        return response.data;
    },

    /** Lịch sử thay đổi ticket: đổi gì, từ → đến, ai đổi, khi nào. */
    getTicketHistory: async (id: number): Promise<TicketHistoryItem[]> => {
        const response = await api.get<TicketHistoryItem[]>(
            `/api/tickets/tickets/${id}/history/`
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
