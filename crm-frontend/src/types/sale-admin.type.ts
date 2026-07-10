export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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
  reactivation: boolean;
  support_info: boolean;
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