export type EkycCallStatus =
  | "Nghe máy"
  | "Không nghe máy"
  | "Thuê bao không tồn tại";

export type EkycCallResult =
  | "Khách hàng tắt máy ngang"
  | "KH không bấm phím"
  | "Khách hàng bấm phím";

export interface EkycRecord {
  id: number;
  customer?: number | null;
  customer_account?: number | null;
  account_number: string;
  customer_name: string;
  branch_name: string;
  manager_name: string;
  phone: string;
  call_date: string;
  follow_count: number;
  call_status: EkycCallStatus;
  call_result: EkycCallResult;
  note?: string | null;
  pic?: string | null;
  created_by_user?: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEkycPayload {
  account_number: string;
  customer?: number | null;
  customer_account?: number | null;
  customer_name?: string;
  branch_name?: string;
  manager_name?: string;
  phone?: string;
  call_date?: string;
  follow_count?: number;
  call_status: EkycCallStatus;
  call_result: EkycCallResult;
  note?: string;
}

export interface EkycCustomerLookup {
  found: boolean;
  customer_id?: number | null;
  customer_account_id?: number | null;
  account_number: string;
  customer_name?: string;
  branch_name?: string;
  manager_name?: string;
  phone?: string;
  message?: string;
  suggestions?: EkycCustomerLookup[];
}

export interface EkycListParams {
  [key: string]: unknown;
  page?: number;
  page_size?: number;
  q?: string;
  account_number?: string;
  customer_name?: string;
  manager_name?: string;
  phone?: string;
  follow_count?: number | string;
  call_status?: string;
  call_result?: string;
  branch_name?: string;
  call_date_from?: string;
  call_date_to?: string;
}

export interface EkycStatusBreakdown {
  status: EkycCallStatus;
  count: number;
}

export interface EkycResultBreakdown {
  result: EkycCallResult;
  count: number;
}

export interface EkycDailyTrend {
  date: string;
  count: number;
  called: number;
  not_called: number;
  lien_he_thanh_cong?: number;
  khong_lien_he_duoc?: number;
  khac_lien_he?: number;
  ket_noi_thanh_cong?: number;
  khong_ket_noi_duoc?: number;
  bam_phim?: number;
  khong_bam_phim?: number;
  tat_may_ngang?: number;
  khong_ket_noi_result?: number;
}

export interface EkycDashboardData {
  total_records: number;
  status_breakdown: EkycStatusBreakdown[];
  result_breakdown: EkycResultBreakdown[];
  daily_trends: EkycDailyTrend[];
  comparison?: any;
  recent_records?: EkycRecord[];
}

export interface EkycImportResponse {
  message: string;
  success_count: number;
  error_count: number;
  errors: string[];
}
