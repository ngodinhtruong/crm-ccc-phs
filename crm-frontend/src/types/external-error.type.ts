export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ExternalErrorTypeCode =
  | "ORDER"
  | "LOGIN"
  | "DISPLAY"
  | "EKYC_ACCOUNT"
  | "PORTAL_SYSTEM"
  | "TRANSFER_PAYMENT"
  | "COMPLAINT"
  | "SPECIAL"
  | string;

export type ExternalErrorClassificationStatus =
  | "UNCLASSIFIED"
  | "CLASSIFIED"
  | "NEED_REVIEW"
  | "CONFIRMED"
  | "FAILED"
  | string;

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

  error_type_code?: ExternalErrorTypeCode | null;
  error_type_name?: string | null;
  error_type_label?: string | null;
  normalized_issue?: string | null;
  classification_confidence?: string | number | null;
  need_review?: boolean;
  classification_status?: ExternalErrorClassificationStatus | null;
  classification_error?: string | null;
  llm_model_id?: string | null;
  classified_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type ExternalErrorBatch = {
  id: number;
  batch_code: string;
  file_name?: string | null;
  source_type: "EXCEL" | "API" | "MANUAL" | string;
  total_rows: number;
  classified_rows: number;
  failed_rows: number;
  status: string;
  created_by_username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ExternalErrorListParams = {
  page?: string;
  q?: string;
  date_field?: "received_date" | "completed_date" | string;
  date_from?: string;
  date_to?: string;
  source?: string;
  device?: string;
  error_type?: string;
  issue?: string;
  status?: string;
  batch?: string;
  need_review?: string;
};

export type ExternalErrorChartItem = {
  label: string;
  value?: number;
  count?: number;
  percent?: number;
  [key: string]: string | number | null | undefined;
};

export type ExternalErrorChartResponse = {
  chart_type?: string;
  group_by?: string;
  breakdown_by?: string | null;
  total?: number;
  categories?: string[];
  interval?: string;
  date_field?: string;
  data: ExternalErrorChartItem[];
};

export type ExternalErrorSummary = {
  total_errors: number;
  classified_errors: number;
  unclassified_errors: number;
  need_review_errors: number;
  failed_errors: number;
  recurring_issue_count: number;
  classification_rate: number;
  by_source: ExternalErrorChartItem[];
  by_device: ExternalErrorChartItem[];
  by_error_type: ExternalErrorChartItem[];
};

export type ExternalErrorRecurringIssue = {
  normalized_issue: string;
  count: number;
  devices: string[];
  error_types: string[];
};

export type ExternalErrorRecurringResponse = {
  data: ExternalErrorRecurringIssue[];
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
  filters?: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ExternalErrorRawImportRow = {
  received_date?: string | null;
  completed_date?: string | null;
  source?: string | null;
  device?: string | null;
  result?: string | null;
  content?: string | null;
  cause?: string | null;
  solution?: string | null;
};

export type ExternalErrorRawImportPayload = {
  file_name?: string | null;
  source_type?: "EXCEL" | "API" | "MANUAL" | string;
  classify_now?: boolean;
  rows: ExternalErrorRawImportRow[];
};

export type ExternalErrorBulkClassifyPayload = {
  ids?: number[];
  all_matching?: boolean;
  force?: boolean;
};

export type ExternalErrorBulkClassifyResponse = {
  total?: number;
  success?: number;
  failed?: number;
  skipped?: number;
  [key: string]: unknown;
};
