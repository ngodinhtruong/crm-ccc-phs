export type TicketContactType = "HAS_ACCOUNT" | "NO_ACCOUNT";

export type MasterOption = {
    id: number;
    [key: string]: unknown;
};

export type PaginatedResponse<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
};
export type TicketSupportCategoryOption = {
  id: number;
  category_code: string;
  category_name: string;
  parent?: number | null;
  is_active: boolean;
  sort_order?: number | null;
};

export type TicketClassificationOption = {
  id: number;
  classification_code: string;
  classification_name: string;
  support_category?: number | null;
  support_category_name?: string | null;
  is_active: boolean;
  sort_order?: number | null;
};

export type TicketStatusOption = {
  id: number;
  status_code: string;
  status_name: string;
  sort_order?: number | null;
  is_final: boolean;
  is_active: boolean;
};

export type TicketPriorityOption = {
  id: number;
  priority_code: string;
  priority_name: string;
  level_order?: number | null;
  default_sla_minutes?: number | null;
  is_active: boolean;
};

export type TicketSourceOption = {
  id: number;
  source_code: string;
  source_name: string;
  is_active: boolean;
};

export type TicketListItem = {
    id: number;
    ticket_code: string;
    title?: string | null;
    classification_method?: "AUTO" | "MANUAL" | string | null;
    support_category_name?: string | null;
    classification_name?: string | null;
    status_name?: string | null;
    priority_name?: string | null;
    source_name?: string | null;
    
    company_name?: string | null;
    customer_name?: string | null;
    customer_account_number?: string | null;

    handling_branch_name?: string | null;
    assigned_unit_name?: string | null;
    owner_user_name?: string | null;

    assigned_employee_name?: string | null;

    request_content?: string | null;
    handling_solution?: string | null;
    final_response?: string | null;

    created_at?: string | null;
    updated_at?: string | null;
};

export type TicketListParams = {
  q?: string;

  ticket_code?: string;
  title?: string;
  classification_method?: string;
  source_ref_id?: string;

  support_category?: string;
  support_category_name?: string;

  classification?: string;
  classification_name?: string;

  current_status?: string;
  status?: string;
  status_name?: string;

  priority?: string;
  priority_name?: string;

  source?: string;
  source_name?: string;

  sla_policy?: string;
  sla_policy_name?: string;

  customer_name?: string;
  customer_phone?: string;
  customer_account_no?: string;
  company_name?: string;

  handling_branch?: string;
  handling_branch_name?: string;

  assigned_unit?: string;
  assigned_unit_name?: string;

  assigned_employee?: string;
  assigned_employee_name?: string;

  owner_user?: string;
  owner_user_name?: string;

  request_content?: string;
  handling_solution?: string;
  final_response?: string;

  created_from?: string;
  created_to?: string;
  updated_from?: string;
  updated_to?: string;
};

export type TicketAccountOption = {
    id: number;
    account_number?: string | null;
    account_no?: string | null;
    customer?: number | null;
    company?: number | null;
    is_active?: boolean;
};

export type TicketCreateFormState = {
    supportCategory: string;
    classification: string;
    status: string;
    priority: string;
    source: string;

    assignedUnit: string;
    handlingBranch: string;
    ownerUser: string;
    ownerUserLabel: string;

    company: string;
    companyLabel: string;

    customer: string;
    customerLabel: string;

    contactType: TicketContactType;
    account: string;
    accountNumber: string;
    mobile: string;
    email: string;

    slaPolicy: string;
    requestContent: string;
    handlingSolution: string;
    finalResponse: string;
};

export type TicketCreatePayload = {
    support_category: number;
    classification: number;
    current_status: number;
    priority: number;
    source: number;

    assigned_unit?: number | null;
    handling_branch: number;
    owner_user?: number | null;

    company?: number | null;
    customer?: number | null;
    customer_account?: number | null;

    sla_policy?: number | null;

    request_content?: string;
    handling_solution?: string;
    final_response?: string;
};