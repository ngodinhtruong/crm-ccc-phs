export type SelectOption = {
  id: number;
  [key: string]: unknown;
};

export type CompanySourceOption = {
  id: number;
  source_code: string;
  source_name: string;
  is_active: boolean;
};

export type CompanyRatingOption = {
  id: number;
  rating_code: string;
  rating_name: string;
  score?: number | null;
  is_active: boolean;
};

export type CompanyMembershipTierOption = {
  id: number;
  tier_code: string;
  tier_name: string;
  description?: string | null;
  is_active: boolean;
};

export type CompanyEmployeeOption = {
  id: number;
  employee_code?: string | null;
  full_name?: string | null;
  employee_name?: string | null;
  name?: string | null;
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
  page?: string;

  q?: string;

  company_code?: string;
  company_name?: string;

  phone?: string;
  email?: string;
  website?: string;
  fax?: string;

  tax_code?: string;
  account_number?: string;

  opened_at_from?: string;
  opened_at_to?: string;

  primary_contact?: string;
  primary_contact_name?: string;

  source?: string;
  source_name?: string;

  rating?: string;
  rating_name?: string;

  membership_tier?: string;
  membership_tier_name?: string;

  assigned_employee?: string;
  assigned_employee_name?: string;

  address?: string;
  status?: string;
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