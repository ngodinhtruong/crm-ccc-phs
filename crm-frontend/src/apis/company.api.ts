import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
    CompanyEmployeeOption,
    CompanyListItem,
    CompanyListParams,
    CompanyMembershipTierOption,
    CompanyPayload,
    CompanyRatingOption,
    CompanySourceOption,
    CustomerContactOption,
    PaginatedResponse,
} from "@/types/company.type";

export const companyApi = {
    getCompanies: async (
        params: CompanyListParams = {}
    ): Promise<PaginatedResponse<CompanyListItem>> => {
        const response = await api.get<PaginatedResponse<CompanyListItem>>(
            "/api/customers/companies/",
            {
                params: cleanParams(params),
            }
        );

        return response.data;
    },

    getCompany: async (id: number | string): Promise<CompanyListItem> => {
        const response = await api.get<CompanyListItem>(
            `/api/customers/companies/${id}/`
        );

        return response.data;
    },

    createCompany: async (payload: CompanyPayload): Promise<CompanyListItem> => {
        const response = await api.post<CompanyListItem>(
            "/api/customers/companies/",
            payload
        );

        return response.data;
    },

    updateCompany: async (
        id: number | string,
        payload: Partial<CompanyPayload>
    ): Promise<CompanyListItem> => {
        const response = await api.patch<CompanyListItem>(
            `/api/customers/companies/${id}/`,
            payload
        );

        return response.data;
    },

    getCompanyContacts: async (
        companyId: number | string,
        q?: string
    ): Promise<CustomerContactOption[]> => {
        const response = await api.get(
            `/api/customers/companies/${companyId}/contacts/`,
            {
                params: cleanParams({
                    q,
                }),
            }
        );

        return getListData<CustomerContactOption>(response.data);
    },

    getSources: async (): Promise<CompanySourceOption[]> => {
        const response = await api.get<
            CompanySourceOption[] | PaginatedResponse<CompanySourceOption>
        >("/api/customers/customer-sources/");

        return getListData<CompanySourceOption>(response.data);
    },

    getRatings: async (): Promise<CompanyRatingOption[]> => {
        const response = await api.get<
            CompanyRatingOption[] | PaginatedResponse<CompanyRatingOption>
        >("/api/customers/customer-ratings/");

        return getListData<CompanyRatingOption>(response.data);
    },

    getMembershipTiers: async (): Promise<CompanyMembershipTierOption[]> => {
        const response = await api.get<
            | CompanyMembershipTierOption[]
            | PaginatedResponse<CompanyMembershipTierOption>
        >("/api/customers/membership-tiers/");

        return getListData<CompanyMembershipTierOption>(response.data);
    },

    getEmployees: async (): Promise<CompanyEmployeeOption[]> => {
        const response = await api.get<
            CompanyEmployeeOption[] | PaginatedResponse<CompanyEmployeeOption>
        >("/api/master-data/employees/");

        return getListData<CompanyEmployeeOption>(response.data);
    },
};

export const companyService = companyApi;