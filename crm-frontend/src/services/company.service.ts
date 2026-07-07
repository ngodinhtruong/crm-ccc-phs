import api from "./api";

export type SelectOption = {
  id: number;
  [key: string]: any;
};

export type CompanyListItem = {
  id: number;
  company_code?: string;
  company_name: string;
  phone?: string;
  email?: string;
  website?: string;
  fax?: string;
  tax_code?: string;
  account_number?: string;
  opened_at?: string;
  opened_at_display?: string;

  primary_contact?: number | null;
  primary_contact_name?: string;

  source?: number | null;
  source_name?: string;

  rating?: number | null;
  rating_name?: string;

  membership_tier?: number | null;
  membership_tier_name?: string;

  assigned_employee?: number | null;
  assigned_employee_name?: string;

  address?: string;
  country?: string;
  province?: string;
  district?: string;
  ward?: string;

  description?: string;
  status?: string;
  status_label?: string;
};

export type CompanyPayload = {
  company_name: string;
  phone?: string;
  email?: string;
  website?: string;
  fax?: string;
  tax_code?: string;
  account_number?: string;
  opened_at?: string;

  primary_contact?: number | null;
  source?: number | null;
  rating?: number | null;
  membership_tier?: number | null;
  assigned_employee?: number | null;

  address?: string;
  country?: string;
  province?: string;
  district?: string;
  ward?: string;

  description?: string;
  status?: string;
};

export type CustomerContactOption = {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  account_number?: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export const companyService = {
  getCompanies: async (
    params: {
      q?: string;
      status?: string;
      source?: string;
      rating?: string;
      membership_tier?: string;
    } = {}
  ): Promise<PaginatedResponse<CompanyListItem>> => {
    const response = await api.get("/api/customers/companies/", {
      params,
    });

    return response.data;
  },

  getCompany: async (id: number | string): Promise<CompanyListItem> => {
    const response = await api.get(`/api/customers/companies/${id}/`);
    return response.data;
  },

  createCompany: async (payload: CompanyPayload): Promise<CompanyListItem> => {
    const response = await api.post("/api/customers/companies/", payload);
    return response.data;
  },

  updateCompany: async (
    id: number | string,
    payload: Partial<CompanyPayload>
  ): Promise<CompanyListItem> => {
    const response = await api.patch(`/api/customers/companies/${id}/`, payload);
    return response.data;
  },

  getCompanyContacts: async (
    companyId: number | string,
    q?: string
  ): Promise<CustomerContactOption[]> => {
    const response = await api.get(
      `/api/customers/companies/${companyId}/contacts/`,
      {
        params: {
          q: q || undefined,
        },
      }
    );

    return unwrapList<CustomerContactOption>(response.data);
  },

  getSources: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/customer-sources/");
    return unwrapList<SelectOption>(response.data);
  },

  getRatings: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/customer-ratings/");
    return unwrapList<SelectOption>(response.data);
  },

  getMembershipTiers: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/customers/membership-tiers/");
    return unwrapList<SelectOption>(response.data);
  },

  getEmployees: async (): Promise<SelectOption[]> => {
    const response = await api.get("/api/master-data/employees/");
    return unwrapList<SelectOption>(response.data);
  },
};