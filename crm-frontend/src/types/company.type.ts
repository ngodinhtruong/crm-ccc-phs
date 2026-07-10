export type SelectOption = {
  id: number;
  [key: string]: unknown;
};

export type CompanyListItem = {
  id: number;
  company_code?: string | null;
  company_name: string;

  phone?: string | null;
  email?: string | null;
  website?: string | null;
  fax?: string | null;
  tax_code?: string | null;
  account_number?: string | null;

  opened_at?: string | null;
  opened_at_display?: string | null;

  primary_contact?: number | null;
  primary_contact_name?: string | null;

  source?: number | null;
  source_name?: string | null;

  rating?: number | null;
  rating_name?: string | null;

  membership_tier?: number | null;
  membership_tier_name?: string | null;

  assigned_employee?: number | null;
  assigned_employee_name?: string | null;

  address?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;

  description?: string | null;
  status?: string | null;
  status_label?: string | null;
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
  phone?: string | null;
  email?: string | null;
  account_number?: string | null;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CompanyListParams = {
  q?: string;
  status?: string;
  source?: string;
  rating?: string;
  membership_tier?: string;
};


export type CompanyCreateFormState = {
  companyName: string;
  phone: string;
  email: string;
  website: string;
  fax: string;

  accountNumber: string;
  openedAt: string;
  taxCode: string;
  source: string;

  address: string;
  country: string;
  province: string;
  district: string;

  description: string;

  assignedEmployee: string;
  employeeSearch: string;

  rating: string;
  membershipTier: string;
};