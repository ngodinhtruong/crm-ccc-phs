export const FAILED_EKYC_STEPS = ["EKYC", "UPDATE_PASSWORD", "REGISTER_SERVICE", "VERIFY_OPEN_ACCOUNT", "UPDATE_INFO"] as const;
export const FAILED_EKYC_CALL_STATUSES = ["KHÔNG CALL", "Nghe máy", "Không nghe máy", "Thuê bao/Số không tồn tại"] as const;
export const FAILED_EKYC_CALL_RESULTS = ["Thành công", "KH cần thử lại", "Không thành công"] as const;

export type FailedEkycStep = typeof FAILED_EKYC_STEPS[number];
export type FailedEkycCallStatus = typeof FAILED_EKYC_CALL_STATUSES[number] | "";
export type FailedEkycCallResult = typeof FAILED_EKYC_CALL_RESULTS[number] | "";

export interface FailedEkycRecord {
  id: number; step: FailedEkycStep; branch_name: string; customer?: number | null; customer_account?: number | null;
  account_number: string; customer_name: string; email: string; phone: string; failed_at?: string | null;
  error_message: string; pic: string; call_date?: string | null; follow_count: number; call_status: FailedEkycCallStatus;
  call_result: FailedEkycCallResult; cs_comment: string; created_by_name?: string; created_at?: string | null; updated_at?: string | null;
}

export type FailedEkycPayload = Omit<FailedEkycRecord, "id" | "created_by_name" | "created_at" | "updated_at">;
export interface FailedEkycListParams { [key: string]: unknown; page?: number; page_size?: number; q?: string; step?: string; pic?: string; call_status?: string; call_result?: string; failed_date_from?: string; failed_date_to?: string; }
export interface FailedEkycImportResponse { message: string; success_count: number; error_count: number; errors: string[]; }
export interface FailedEkycDashboardData {
  total_records: number;
  status_breakdown: { call_status: string; count: number }[];
  result_breakdown: { call_result: string; count: number }[];
  step_breakdown: { step: string; count: number }[];
  daily_trends: {
    date: string; count: number; called: number; not_called: number; success: number; retry_required: number; failed: number;
    contact_success: number; contact_failed: number; guidance_success: number; guidance_failed: number; retry_later: number;
    system_test: number; no_answer: number; hung_up: number; invalid_number: number; call_back: number; blocked_number: number;
    customer_completed: number; customer_no_action: number;
  }[];
  no_call_details?: { category: string; count: number }[];
  top_errors?: { error: string; count: number }[];
  pic_performance?: { pic: string; total: number; contacted: number; successful: number }[];
  comparison?: { compare_mode: string; prev_total: number; total_growth_percent: number; prev_start_date: string; prev_end_date: string } | null;
  recent_records?: FailedEkycRecord[];
}
