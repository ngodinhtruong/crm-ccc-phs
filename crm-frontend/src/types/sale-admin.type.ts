export type PaginatedResponse<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
};

export type SaProduct = {
    id: number;
    name: string;
    code?: string | null;
    description?: string | null;
    usage_count: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

export type SaSupportCategory = {
    id: number;
    name: string;
    code?: string | null;
    description?: string | null;
    usage_count: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

export type SaCallResult = {
    id: number;
    result_code: string;
    result_name: string;
    is_active: boolean;
    sort_order?: number | null;
};

export type SaInterestLevel = {
    id: number;
    level_code: string;
    level_name: string;
    score: number;
    is_active: boolean;
    sort_order?: number | null;
};

export type SaIcpGroup = {
    id: number;
    icp_code: string;
    icp_name: string;
    icp_type: string;
    description?: string | null;
    follow_up_days?: number | null;
    is_potential: boolean;
    is_active: boolean;
    sort_order?: number | null;
};

export type SaIcpRule = {
  id: number;
  call_result?: number | null;
  call_result_name?: string | null;
  interest_level?: number | null;
  interest_level_name?: string | null;
  icp_group: number;
  icp_group_code?: string | null;
  icp_group_name?: string | null;
  priority: number;
  is_active: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};




export type SaSelectOption = {
    value: string;
    label: string;
};

export type SaCustomerAccountSuggestion = {
    id: number;
    account_number: string;
    account_status?: string | null;
    customer?: number | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    company?: number | null;
    company_name?: string | null;
    branch?: number | null;
    branch_name?: string | null;
    membership_tier?: number | null;
    membership_tier_name?: string | null;
    vip_classification?: string | null;
    vip_classification_label?: string | null;
};

export type SaRecordItem = {
    id: number;
    record_code: string;

    account_no: string;
    customer_name_snapshot?: string | null;
    branch_name_snapshot?: string | null;
    pic_name_snapshot?: string | null;
    account_status?: string | null;
    vip_classification?: string | null;

    customer_account?: number | null;
    customer?: number | null;
    customer_name?: string | null;
    company?: number | null;
    company_name?: string | null;
    branch?: number | null;
    branch_name?: string | null;

    pic_user?: number | null;
    pic_user_name?: string | null;
    pic_employee?: number | null;
    pic_employee_name?: string | null;

    call_date: string;
    follow_no: number;

    call_result: number;
    call_result_name?: string | null;

    interest_level?: number | null;
    interest_level_name?: string | null;

    icp_group?: number | null;
    icp_group_code?: string | null;
    icp_group_name?: string | null;
    icp_group_type?: string | null;

    introduced_product: boolean;
    introduced_product_obj?: number | null;
    introduced_product_name?: string | null;
    introduced_product_obj_detail?: SaProduct | null;
    reactivation: boolean;
    support_info: boolean;
    support_info_category_obj?: number | null;
    support_info_category_name?: string | null;
    support_info_category_obj_detail?: SaSupportCategory | null;
    referred_rm: boolean;

    transaction_value_snapshot: string;
    transaction_fee_snapshot: string;

    note?: string | null;

    handover_to_broker: boolean;
    broker_user?: number | null;
    broker_user_name?: string | null;
    broker_employee?: number | null;
    broker_employee_name?: string | null;
    broker_handover_note?: string | null;

    source_system?: string | null;
    data_status?: string | null;

    created_at?: string | null;
    updated_at?: string | null;
};

export type SaRecordListParams = {
    page?: string;
    q?: string;

    record_code?: string;
    account_no?: string;
    customer_name?: string;
    branch_name?: string;
    account_status?: string;
    vip_classification?: string;
    pic?: string;
    follow_no?: string;

    icp_group?: string;
    call_result?: string;
    interest_level?: string;

    introduced_product?: string;
    reactivation?: string;
    support_info?: string;
    handover_to_broker?: string;

    transaction_value_min?: string;
    transaction_value_max?: string;
    transaction_fee_min?: string;
    transaction_fee_max?: string;

    note?: string;

    call_date_from?: string;
    call_date_to?: string;
};

export type SaRecordFormMode = "create" | "edit";

export type SaRecordFormController = {
  form: SaRecordCreateFormState;

  setField: <K extends keyof SaRecordCreateFormState>(
    key: K,
    value: SaRecordCreateFormState[K]
  ) => void;

  callResults: SaCallResult[];
  interestLevels: SaInterestLevel[];
  icpGroups: SaIcpGroup[];
  accountStatusOptions: SaSelectOption[];
  vipClassificationOptions: SaSelectOption[];
  employeeOptions?: SaSelectOption[];

  accountSuggestions: SaCustomerAccountSuggestion[];
  accountSuggestionLoading: boolean;
  accountSuggestionError: string;
  accountDropdownOpen: boolean;
  setAccountDropdownOpen: (value: boolean) => void;
  handleAccountNoChange: (value: string) => void;
  selectCustomerAccountSuggestion: (account: SaCustomerAccountSuggestion) => void;

  loadingMaster: boolean;
  submitting: boolean;

  error: string;
  masterError: string;

  submit: () => Promise<void>;
  cancel: () => void;
};

export type SaRecordCreatePayload = {
    account_no: string;
    customer_name_snapshot?: string;
    branch_name_snapshot?: string;
    pic_name_snapshot?: string;
    account_status?: string;
    vip_classification?: string;

    customer_account?: number | null;
    customer?: number | null;
    company?: number | null;
    branch?: number | null;

    pic_user?: number | null;
    pic_employee?: number | null;

    call_date: string;
    follow_no: number;

    call_result: number;
    interest_level?: number | null;
    icp_group?: number | null;

    reactivation?: boolean;
    introduced_product?: boolean;
    introduced_product_obj?: number | null;
    introduced_product_name?: string | null;
    support_info?: boolean;
    support_info_category_obj?: number | null;
    support_info_category_name?: string | null;
    referred_rm?: boolean;

    handover_to_broker?: boolean;
    broker_user?: number | null;
    broker_employee?: number | null;
    broker_handover_note?: string;

    transaction_fee_snapshot?: string;
    transaction_value_snapshot?: string;

    note?: string;
    source_system?: string;
    data_status?: string;

};

export type SaRecordCreateFormState = {
    accountNo: string;
    customerNameSnapshot: string;
    branchNameSnapshot: string;
    picNameSnapshot: string;
    accountStatus: string;
    vipClassification: string;

    customerAccount?: string;
    customer?: string;
    company?: string;
    branch?: string;
    accountSelected?: boolean;

    callDate: string;
    followNo: string;

    callResult: string;
    interestLevel: string;
    icpGroup: string;

    introducedProduct: boolean;
    introducedProductId?: number | string | null;
    introducedProductName?: string | null;
    reactivation: boolean;
    supportInfo: boolean;
    supportInfoCategoryId?: number | string | null;
    supportInfoCategoryName?: string | null;
    referredRm: boolean;

    handoverToBroker: boolean;
    brokerEmployee: string;
    brokerUser: string;
    brokerHandoverNote: string;

    transactionValueSnapshot: string;
    transactionFeeSnapshot: string;

    note: string;
};

export type SaRecordAuditLogItem = {
    id: number;
    sa_record: number;

    action_type: "CREATE" | "UPDATE" | "DELETE" | string;

    old_data?: Record<string, unknown> | null;
    new_data?: Record<string, unknown> | null;
    changed_fields?: string[] | null;

    changed_by_user?: number | null;
    // changed_by_user_name?: string | null;

    changed_at?: string | null;
    created_at?: string | null;

    note?: string | null;
};

export type SaRecordUpdatePayload = Partial<SaRecordCreatePayload>;