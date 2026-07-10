import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
  CreateCustomerAccountPayload,
  CreateCustomerPayload,
  CustomerListItem,
  CustomerListParams,
  PaginatedResponse,
  SelectOption,
} from "@/types/customer.type";

export const customerApi = {
  getCustomers: async (
    params: CustomerListParams = {}
  ): Promise<PaginatedResponse<CustomerListItem>> => {
    const response = await api.get<PaginatedResponse<CustomerListItem>>(
      "/api/customers/customers/",
      {
        params: cleanParams(params),
      }
    );

    return response.data;
  },

  createCustomer: async (payload: CreateCustomerPayload) => {
    const response = await api.post("/api/customers/customers/", payload);
    return response.data;
  },

  createCustomerAccount: async (payload: CreateCustomerAccountPayload) => {
    const response = await api.post(
      "/api/customers/customer-accounts/",
      payload
    );

    return response.data;
  },

  checkAccountNumberExists: async (accountNumber: string): Promise<boolean> => {
    const response = await api.get("/api/customers/customer-accounts/", {
      params: {
        account_number: accountNumber,
      },
    });

    const data = response.data;

    if (Array.isArray(data)) {
      return data.length > 0;
    }

    return Number(data.count || 0) > 0;
  },

  getCustomerTypes: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/customer-types/");
    return getListData<SelectOption>(response.data);
  },

  getCompanies: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/companies/");
    return getListData<SelectOption>(response.data);
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
};

export const customerService = customerApi;