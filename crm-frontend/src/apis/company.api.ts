import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
  CompanyListItem,
  CompanyListParams,
  CompanyPayload,
  CustomerContactOption,
  PaginatedResponse,
  SelectOption,
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

  getSources: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/customer-sources/");
    return getListData<SelectOption>(response.data);
  },

  getRatings: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/customer-ratings/");
    return getListData<SelectOption>(response.data);
  },

  getMembershipTiers: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/membership-tiers/");
    return getListData<SelectOption>(response.data);
  },

  getEmployees: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/master-data/employees/");
    return getListData<SelectOption>(response.data);
  },
};

export const companyService = companyApi;