import api from "./api";

export type CustomerListItem = {
  id: number;
  customer_code?: string;
  full_name: string;
  phone?: string;
  email?: string;
  status?: string;

  branch?: number | null;
  branch_name?: string;

  company?: number | null;
  company_name?: string;

  source?: number | null;
  source_name?: string;

  rating?: number | null;
  rating_name?: string;

  membership_tier?: number | null;
  membership_tier_name?: string;

  account_number?: string;
  opened_account_date?: string;
  assigned_employee_name?: string;
  vip_type?: string;
  status_label?: string;
  birth_date_display?: string;
  description_display?: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CustomerListParams = {
  q?: string;
  branch?: string;
  phone?: string;
  status?: string;
};

export type SelectOption = {
  id: number;
  [key: string]: any;
};

export type CreateCustomerPayload = {
  full_name: string;
  phone: string;
  email?: string;
  identity_number?: string;
  birth_date?: string;
  gender?: string;
  customer_type?: number | null;
  branch?: number | null;
  company?: number | null;
  source?: number | null;
  rating?: number | null;
  membership_tier?: number | null;
  address?: string;
  status?: string;
};

export type CreateCustomerAccountPayload = {
  customer: number;
  account_number: string;
  account_status: string;
  source_system?: string;
};

export const customerService = {
  getCustomers: async (
    params: CustomerListParams = {}
  ): Promise<PaginatedResponse<CustomerListItem>> => {
    const response = await api.get("/api/customers/customers/", {
      params: {
        q: params.q || undefined,
        branch: params.branch || undefined,
        phone: params.phone || undefined,
        status: params.status || undefined,
      },
    });

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
    return response.data.results || response.data;
  },

  getCompanies: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/companies/");
    return response.data.results || response.data;
  },

  getSources: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/customer-sources/");
    return response.data.results || response.data;
  },

  getRatings: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/customer-ratings/");
    return response.data.results || response.data;
  },

  getMembershipTiers: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/membership-tiers/");
    return response.data.results || response.data;
  },
};