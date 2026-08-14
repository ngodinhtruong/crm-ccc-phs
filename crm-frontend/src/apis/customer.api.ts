import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
  CreateCustomerAccountPayload,
  CreateCustomerPayload,
  CustomerDetail,
  CustomerListItem,
  CustomerListParams,
  CustomerRatingOption,
  CustomerSourceOption,
  CustomerTypeOption,
  MembershipTierOption,
  PaginatedResponse,
  SelectOption,
} from "@/types/customer.type";
import { Customer360 } from "@/types/customer-360.type";

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

  getCustomerById: async (id: number): Promise<CustomerDetail> => {
    const response = await api.get<CustomerDetail>(
      `/api/customers/customers/${id}/`
    );

    return response.data;
  },

  /** Số liệu tổng hợp cho màn 360. Cần quyền CUSTOMER_360_VIEW. */
  getCustomer360: async (id: number): Promise<Customer360> => {
    const response = await api.get<Customer360>(
      `/api/customers/customers/${id}/insight-360/`
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

  getCustomerTypes: async (): Promise<CustomerTypeOption[]> => {
    const response = await api.get<
      CustomerTypeOption[] | PaginatedResponse<CustomerTypeOption>
    >("/api/customers/customer-types/");

    return getListData<CustomerTypeOption>(response.data);
  },

  getCompanies: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/companies/");
    return getListData<SelectOption>(response.data);
  },

  getSources: async (): Promise<CustomerSourceOption[]> => {
    const response = await api.get<
      CustomerSourceOption[] | PaginatedResponse<CustomerSourceOption>
    >("/api/customers/customer-sources/");

    return getListData<CustomerSourceOption>(response.data);
  },
  getRatings: async (): Promise<CustomerRatingOption[]> => {
    const response = await api.get<
      CustomerRatingOption[] | PaginatedResponse<CustomerRatingOption>
    >("/api/customers/customer-ratings/");

    return getListData<CustomerRatingOption>(response.data);
  },

  getMembershipTiers: async (): Promise<MembershipTierOption[]> => {
    const response = await api.get<
      MembershipTierOption[] | PaginatedResponse<MembershipTierOption>
    >("/api/customers/membership-tiers/");

    return getListData<MembershipTierOption>(response.data);
  },
};

export const customerService = customerApi;