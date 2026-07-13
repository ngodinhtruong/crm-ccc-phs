export type CustomerListItem = {
    id: number;
    customer_code?: string | null;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    status?: string | null;

    branch?: number | null;
    branch_name?: string | null;

    company?: number | null;
    company_name?: string | null;

    source?: number | null;
    source_name?: string | null;

    rating?: number | null;
    rating_name?: string | null;

    membership_tier?: number | null;
    membership_tier_name?: string | null;

    account_number?: string | null;
    opened_account_date?: string | null;
    assigned_employee_name?: string | null;
    vip_type?: string | null;
    status_label?: string | null;
    birth_date_display?: string | null;
    description_display?: string | null;

    customer_type?: number | null;
    customer_type_name?: string | null;

    identity_number?: string | null;
    external_customer_id?: string | null;
    date_of_birth?: string | null;
    description?: string | null;
    address?: string | null;
};
export type CustomerTypeOption = {
  id: number;
  type_code: string;
  type_name: string;
  is_active: boolean;
};

export type CustomerSourceOption = {
  id: number;
  source_code: string;
  source_name: string;
  is_active: boolean;
};

export type CustomerRatingOption = {
  id: number;
  rating_code: string;
  rating_name: string;
  score?: number | null;
  is_active: boolean;
};

export type MembershipTierOption = {
  id: number;
  tier_code: string;
  tier_name: string;
  description?: string | null;
  is_active: boolean;
};
export type PaginatedResponse<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
};

export type CustomerListParams = {
  page?: string;

  q?: string;

  customer_code?: string;
  external_customer_id?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  identity_number?: string;

  account_number?: string;
  opened_account_from?: string;
  opened_account_to?: string;

  branch?: string;
  customer_type?: string;
  company_name?: string;

  source?: string;
  rating?: string;
  membership_tier?: string;

  assigned_employee_name?: string;
  vip_type?: string;

  description?: string;
  status?: string;

  date_of_birth_from?: string;
  date_of_birth_to?: string;

  created_from?: string;
  created_to?: string;
};

export type SelectOption = {
    id: number;
    [key: string]: unknown;
};

export type BranchOption = {
    id: number;
    branch_code?: string;
    branch_name?: string;
    name?: string;
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

export type CustomerCreateFormState = {
    genderPrefix: string;
    fullName: string;
    identityNumber: string;
    birthDate: string;
    gender: string;
    phone: string;
    email: string;

    customerType: string;
    accountNumber: string;
    branch: string;
    openedDate: string;
    referrer: string;
    company: string;

    address: string;
    province: string;
    country: string;
    district: string;

    description: string;

    assignedTo: string;
    source: string;
    rating: string;
    membershipTier: string;
};