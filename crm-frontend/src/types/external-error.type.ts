export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ExternalErrorClassificationStatus =
  | "UNCLASSIFIED"
  | "CLASSIFIED"
  | "NEED_REVIEW"
  | "CONFIRMED"
  | "FAILED";

export type ExternalErrorSourceType = "EXCEL" | "API" | "MANUAL";

export const PROCESSING_STATUS_OPTIONS = [
  { value: "Tiếp nhận", label: "Tiếp nhận" },
  { value: "Đang xử lý", label: "Đang xử lý" },
  { value: "Đã xử lý", label: "Đã xử lý" },
];

export type ExternalErrorRecordAuditLog = {
  id: number;
  record: number;
  action_type: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: Record<string, { old: any; new: any }> | null;
  changed_by_user: number | null;
  changed_by_username: string | null;
  changed_at: string;
  note: string | null;
};

export type ExternalErrorGroup = {
  id: number;
  group_code: string;
  group_name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  error_code_count: number;
  created_at?: string;
  updated_at?: string;
};

export type ExternalErrorGroupPayload = {
  group_code: string;
  group_name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type ExternalErrorCode = {
  id: number;
  group: number;
  group_code: string;
  group_name: string;
  error_code: string;
  error_name: string;
  description?: string | null;
  keywords: string[];
  examples: string[];
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ExternalErrorCodePayload = {
  group: number;
  error_code: string;
  error_name: string;
  description?: string;
  keywords?: string[];
  examples?: string[];
  sort_order?: number;
  is_active?: boolean;
};

export type ExternalErrorCauseGroup = {
  id: number;
  cause_code: string;
  cause_name: string;
  description?: string | null;
  keywords: string[];
  examples: string[];
  sort_order: number;
  is_active: boolean;
  record_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type ExternalErrorCauseGroupPayload = {
  cause_code: string;
  cause_name: string;
  description?: string;
  keywords?: string[];
  examples?: string[];
  sort_order?: number;
  is_active?: boolean;
};

export type ExternalErrorBatch = {
  id: number;
  batch_code: string;
  file_name?: string | null;
  source_type: ExternalErrorSourceType;
  total_rows: number;
  classified_rows: number;
  failed_rows: number;
  status: "IMPORTED" | "CLASSIFYING" | "CLASSIFIED" | "FAILED";
  created_by?: number | null;
  created_by_username?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ExternalErrorRecord = {
  id: number;
  batch?: number | null;
  batch_code?: string | null;
  received_date?: string | null;
  completed_date?: string | null;

  raw_source?: string | null;
  raw_device?: string | null;
  raw_result?: string | null;
  raw_content?: string | null;
  raw_cause?: string | null;
  raw_solution?: string | null;

  clean_source?: string | null;
  clean_device?: string | null;
  clean_result?: string | null;
  clean_content?: string | null;
  clean_cause?: string | null;
  clean_solution?: string | null;

  error_code?: number | null;
  error_code_value?: string | null;
  error_code_name?: string | null;
  error_group_id?: number | null;
  error_group_code?: string | null;
  error_group_name?: string | null;

  // Alias tương thích dashboard/frontend cũ.
  error_type_code?: string | null;
  error_type_name?: string | null;
  error_type_label?: string | null;

  normalized_issue?: string | null;
  classification_confidence?: number | string | null;
  need_review: boolean;
  classification_status: ExternalErrorClassificationStatus;
  classification_error?: string | null;
  llm_model_id?: string | null;
  classified_at?: string | null;

  cause_group?: number | null;
  cause_group_code?: string | null;
  cause_group_name?: string | null;
  normalized_cause?: string | null;
  cause_classification_confidence?: number | string | null;
  cause_need_review: boolean;
  cause_classification_status: ExternalErrorClassificationStatus;
  cause_classification_error?: string | null;
  cause_llm_model_id?: string | null;
  cause_classified_at?: string | null;

  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type ExternalErrorManualCreatePayload = {
  received_date: string;
  completed_date?: string;
  source?: string;
  device?: string;
  result?: string;
  content: string;
  cause?: string;
  solution?: string;
  auto_classify?: boolean;
};

export type ExternalErrorListParams = {
  page?: string;
  page_size?: string;
  q?: string;
  date_field?: string;
  date_from?: string;
  date_to?: string;
  source?: string;
  device?: string;
  issue?: string;
  status?: string;
  batch?: string;
  need_review?: string;

  error_group?: string;
  error_group_code?: string;
  error_code?: string;
  error_code_name?: string;

  cause?: string;
  cause_group?: string;
  cause_group_code?: string;
  normalized_cause?: string;
  cause_text?: string;
  cause_status?: string;
  cause_need_review?: string;

  // Alias cũ.
  error_type?: string;
  error_type_code?: string;
};

export type ExternalErrorBulkClassifyPayload = {
  ids?: number[];
  all_matching?: boolean;
  force?: boolean;
};

export type ExternalErrorBulkClassifyResponse = {
  detail?: string;
  task_id?: string;
  total: number;
  classified: number;
  need_review?: number;
  failed: number;
  errors?: Array<{ id: number; error: string }>;
};

export type ExternalErrorRawImportRow = {
  received_date: string;
  completed_date?: string | null;
  source?: string | null;
  device?: string | null;
  result?: string | null;
  content: string;
  cause?: string | null;
  solution?: string | null;
};

export type ExternalErrorRawImportPayload = {
  file_name?: string;
  source_type?: ExternalErrorSourceType;
  classify_now?: boolean;
  rows: ExternalErrorRawImportRow[];
};

export type ExternalErrorExcelImportPayload = {
  file: File;
  sheet_name?: string;
  auto_classify?: boolean;
};

export type ExternalErrorImportSkippedRow = {
  row: number;
  reason: string;
};

export type ExternalErrorImportSummary = {
  sheet_name: string;
  source_rows: number;
  imported_rows: number;
  skipped_rows: number;
  skipped_details: ExternalErrorImportSkippedRow[];
  auto_classify: boolean;
  classification_queued?: boolean;
  classification_task_id?: string | null;
  classification_queue_error?: string | null;
};

export type ExternalErrorExcelImportResponse = {
  batch: ExternalErrorBatch;
  import_summary: ExternalErrorImportSummary;
};

export type ExternalErrorChartItem = {
  label: string;
  value?: number;
  count?: number;
  percent?: number;
  [key: string]: string | number | undefined;
};

export type ExternalErrorSummary = {
  total_errors: number;
  classified_errors: number;
  unclassified_errors: number;
  need_review_errors: number;
  failed_errors: number;
  recurring_issue_count: number;
  classification_rate: number;
  cause_classified_errors?: number;
  cause_unclassified_errors?: number;
  cause_need_review_errors?: number;
  cause_failed_errors?: number;
  cause_classification_rate?: number;
  by_source: ExternalErrorChartItem[];
  by_device: ExternalErrorChartItem[];
  by_error_type?: ExternalErrorChartItem[];
  by_error_group?: ExternalErrorChartItem[];
  by_error_code?: ExternalErrorChartItem[];
  by_cause?: ExternalErrorChartItem[];
  by_cause_group?: ExternalErrorChartItem[];
};

export type ExternalErrorChartResponse = {
  chart_type: string;
  group_by?: string;
  breakdown_by?: string | null;
  interval?: string;
  date_field?: string;
  total?: number;
  categories?: string[];
  data: ExternalErrorChartItem[];
};

export type ExternalErrorRecurringItem = {
  normalized_issue: string;
  count: number;
  devices: string[];
  error_types?: string[];
  error_groups?: string[];
  error_codes?: string[];
  cause_groups?: string[];
  solutions?: string[];
};

// Alias giữ tương thích với các component dashboard hiện tại.
export type ExternalErrorRecurringIssue = ExternalErrorRecurringItem;

export type ExternalErrorRecurringResponse = {
  data: ExternalErrorRecurringItem[];
  min_count: number;
};

export type ExternalErrorWidget = {
  id: number;
  title: string;
  widget_type: string;
  group_by: string;
  breakdown_by?: string | null;
  metric: string;
  sort_by: string;
  sort_direction: string;
  limit: number;
  filters: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
};
export type ExternalErrorDashboardOverviewCharts = {
  by_device?: ExternalErrorChartResponse;
  by_source?: ExternalErrorChartResponse;
  by_error_type?: ExternalErrorChartResponse;
  trend?: ExternalErrorChartResponse;
  stacked_month_device?: ExternalErrorChartResponse;
  stacked_device_error_type?: ExternalErrorChartResponse;
  cause_donut?: ExternalErrorChartResponse;
  stacked_device_cause?: ExternalErrorChartResponse;
};

export type ExternalErrorDashboardOverview = {
  summary: ExternalErrorSummary;
  charts: ExternalErrorDashboardOverviewCharts;
  recurring: ExternalErrorRecurringResponse;
};

