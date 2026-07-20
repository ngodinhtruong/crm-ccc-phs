export type TicketContactType = "HAS_ACCOUNT" | "NO_ACCOUNT";
export type TicketAccountLinkStatus = "LINKED" | "UNLINKED";

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

export type TicketErrorGroupOption = {
    id: number;
    group_code: string;
    group_name: string;
    description?: string | null;
    is_active: boolean;
    sort_order?: number | null;
};

export type TicketErrorTypeOption = {
    id: number;
    group: number;
    group_name?: string | null;
    type_code: string;
    type_name: string;
    description?: string | null;
    is_active: boolean;
    sort_order?: number | null;
};

export type TicketErrorGroupPayload = {
    group_code: string;
    group_name: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number | null;
};

export type TicketErrorTypePayload = {
    group: number;
    type_code: string;
    type_name: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number | null;
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
    customer_phone?: string | null;
    customer_email?: string | null;
    customer_account_number?: string | null;
    raw_account_number?: string | null;
    display_account_number?: string | null;
    account_link_status?: TicketAccountLinkStatus | string | null;
    account_link_status_label?: string | null;

    handling_branch_name?: string | null;
    assigned_unit_name?: string | null;
    owner_user_name?: string | null;
    assigned_employee_name?: string | null;

    error_group?: number | null;
    error_group_name?: string | null;
    error_type?: number | null;
    error_type_name?: string | null;
    error_note?: string | null;
    related_system?: string | null;
    external_status?: string | null;
    last_synced_at?: string | null;

    request_content?: string | null;
    handling_solution?: string | null;
    final_response?: string | null;

    total_duration_minutes?: number | null;
    processing_duration_minutes?: number | null;

    created_at?: string | null;
    updated_at?: string | null;
    done_at?: string | null;
    closed_at?: string | null;
};

export type TicketListParams = {
    page?: string;
    page_size?: string;
    q?: string;

    ticket_code?: string;
    title?: string;
    classification_method?: string;
    source_ref_id?: string;

    customer?: string;

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
    customer_email?: string;
    customer_account_no?: string;
    raw_account_number?: string;
    account_link_status?: string;
    company_name?: string;

    handling_branch?: string;
    handling_branch_name?: string;

    assigned_unit?: string;
    assigned_unit_name?: string;

    assigned_employee?: string;
    assigned_employee_name?: string;

    owner_user?: string;
    owner_user_name?: string;

    is_error_ticket?: string;
    error_group?: string;
    error_type?: string;
    error_note?: string;
    related_system?: string;
    external_status?: string;

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

    errorGroup: string;
    errorType: string;
    relatedSystem: string;
    externalStatus: string;
    errorNote: string;

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
    raw_account_number?: string;

    classification_method?: string;
    sla_policy?: number | null;

    error_group?: number | null;
    error_type?: number | null;
    related_system?: string;
    external_status?: string;
    error_note?: string;

    request_content?: string;
    handling_solution?: string;
    final_response?: string;
};

/** Chi tiết ticket thường — khớp GET /api/tickets/tickets/{id}/ */
export type TicketDetail = TicketListItem & {
    /** Đã gửi khảo sát chưa — backend đọc từ TicketFeedback.survey_sent. */
    send_survey?: boolean;
    is_error_ticket?: boolean;
    error_group_code?: string | null;
    error_type_code?: string | null;
    current_status?: number | null;
    current_status_code?: string | null;
    current_status_name?: string | null;
    support_category?: number | null;
    classification?: number | null;
    priority?: number | null;
    source?: number | null;
    customer?: number | null;
    customer_account?: number | null;
    handling_branch?: number | null;
    assigned_unit?: number | null;
    assigned_employee?: number | null;
    owner_user?: number | null;
    sla_policy?: number | null;
    sla_policy_name?: string | null;
    accepted_at?: string | null;
    processing_started_at?: string | null;
    done_at?: string | null;
    closed_at?: string | null;
    cancelled_at?: string | null;
    cancelled_reason?: string | null;
    is_locked_for_amend?: boolean;
};

/** Mã trạng thái luồng ticket thường */
export type TicketStatusCode =
    | "CREATED"
    | "ACCEPTED"
    | "PROCESSING"
    | "DONE_WAIT_CLOSE"
    | "PENDING_CLOSE"
    | "CLOSED"
    | "CANCELLED";

/** Một dòng lịch sử thay đổi ticket. */
export type TicketHistoryItem = {
    id: number;
    action_type: string;
    action_name: string;
    old_value?: string | null;
    new_value?: string | null;
    changed_by?: string | null;
    created_at?: string | null;
    note?: string | null;
};
