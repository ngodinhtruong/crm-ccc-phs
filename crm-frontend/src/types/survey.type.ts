/** Kết quả gửi khảo sát ra kênh ngoài. */
export type SurveySendStatus = "SUCCESS" | "FAILED";

export type SurveyEntrySource = "MANUAL" | "IMPORT";

/** Một ticket để người nhập chọn khi tên khách khớp nhiều ticket trong ngày. */
export type SurveyTicketOption = {
  id: number;
  ticket_code: string;
  title?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  support_category?: string | null;
  status_name?: string | null;
  created_at?: string | null;
  /** Đã khảo sát thành công rồi thì không chọn được nữa. */
  has_survey: boolean;
};

/** Một dòng trong lịch sử khảo sát. */
export type SurveyLog = {
  id: number;
  ticket: number;
  ticket_code: string;
  ticket_title?: string | null;

  customer?: number | null;
  customer_name?: string | null;
  customer_name_text?: string | null;
  phone?: string | null;

  send_status: SurveySendStatus;
  send_status_label: string;
  sent_at?: string | null;

  message_name?: string | null;
  message_type?: string | null;
  message_template?: string | null;
  ticket_ref_text?: string | null;

  /** null = chưa khảo sát; 0 = khách chấm 0 điểm. */
  rating_score?: number | null;
  rating_note?: string | null;

  entry_source: SurveyEntrySource;
  created_by_name?: string | null;
  created_at?: string | null;
};

export type SurveyListParams = {
  q?: string;
  /** Chỉ lấy khảo sát của một ticket — dùng cho tab trong màn ticket. */
  ticket?: number;
  send_status?: SurveySendStatus;
  start_date?: string;
  end_date?: string;
  rated?: "true" | "false";
  page?: number;
  page_size?: number;

  // Lọc theo từng cột của bảng, giống màn ticket.
  ticket_code?: string;
  customer?: string;
  phone?: string;
  created_by?: string;
  entry_source?: SurveyEntrySource;
  /** Điểm cụ thể `"0".."5"`, hoặc `"unrated"` cho khách chưa chấm. */
  rating?: string;
};

/** Một ô lọc trên hàng lọc của bảng khảo sát. */
export type SurveyColumnFilters = {
  startDate: string;
  endDate: string;
  customer: string;
  phone: string;
  ticketCode: string;
  sendStatus: string;
  rating: string;
  entrySource: string;
  createdBy: string;
};

export const EMPTY_SURVEY_COLUMN_FILTERS: SurveyColumnFilters = {
  startDate: "",
  endDate: "",
  customer: "",
  phone: "",
  ticketCode: "",
  sendStatus: "",
  rating: "",
  entrySource: "",
  createdBy: "",
};

export type SurveySummary = {
  total: number;
  success: number;
  failed: number;
  rated: number;
  average_score: number | null;
};

/** Dữ liệu chung của một lần khảo sát, dùng cho cả nhập tay lẫn import. */
export type SurveyEntryPayload = {
  ticket: number;
  send_status: SurveySendStatus;
  sent_at?: string | null;
  rating_score?: number | null;
  rating_note?: string;
  customer_name_text?: string;
  phone?: string;
  message_name?: string;
  message_type?: string;
  message_template?: string;
  ticket_ref_text?: string;
};

/** Một dòng của file khảo sát sau khi backend đọc và gợi ý ticket. */
export type SurveyImportRow = Omit<SurveyEntryPayload, "ticket"> & {
  row_number: number;
  ticket_options: SurveyTicketOption[];
  /** Chỉ có giá trị khi đúng một ticket còn khảo sát được. */
  suggested_ticket: number | null;
};

export type SurveyImportPreview = {
  count: number;
  results: SurveyImportRow[];
};

export type SurveyImportResult = {
  created_count: number;
  error_count: number;
  errors: Array<{ row_number: number | null; detail: string }>;
};

export type SurveyTicketOptionParams = {
  customer_name?: string;
  phone?: string;
  /** Tháng tìm ticket, định dạng YYYY-MM. */
  month?: string;
};

/** Sửa một dòng khảo sát. Không có `ticket`: dòng đã nhập không đổi ticket. */
export type SurveyUpdatePayload = Partial<
  Omit<SurveyEntryPayload, "ticket" | "message_name">
> & {
  /** Lý do sửa, lưu vào nhật ký. */
  note?: string;
};

export type SurveyGranularity = "month" | "quarter" | "year";

export type SurveyMetrics = {
  total: number;
  failed: number;
  success: number;
  rated: number;
  /** Gửi thành công nhưng khách chưa chấm điểm. */
  unrated: number;
  response_rate: number;
  average_score: number;
  /** % khách chấm từ 4 điểm trở lên, trên tổng số khách đã chấm. */
  csat_percent: number;
};

export type SurveyCategoryRow = {
  category: string;
  sent: number;
  rated: number;
  response_rate: number;
  average_score: number;
  csat_percent: number;
};

export type SurveyComparisonRow = {
  key: string;
  label: string;
  unit: "percent" | "count" | "score";
  current: number;
  previous: number;
  /** null khi kỳ trước bằng 0 — không có phần trăm nào đúng. */
  change_percent: number | null;
  target: number;
};

/** Một kỳ trên biểu đồ so sánh. */
export type SurveySeriesItem = {
  code: string;
  /** Nhãn đầy đủ cho tooltip: "Tháng 07/2026". */
  label: string;
  /** Nhãn ngắn cho trục hoành: "T07/2026". */
  short_label: string;
  /** Kỳ đang xem; các kỳ còn lại chỉ là nền so sánh. */
  is_current: boolean;
  total: number;
  success: number;
  /** Gửi không tới được khách. `success + failed = total`. */
  failed: number;
  rated: number;
  unrated: number;
  /** Khách chấm từ 4★ trở lên — phần tử tạo nên CSAT (%). */
  satisfied: number;
  /** null = kỳ không gửi khảo sát nào, khác hẳn với gửi mà không ai trả lời. */
  response_rate: number | null;
  /** null = chưa ai chấm điểm trong kỳ. */
  average_score: number | null;
  csat_percent: number | null;
};

export type SurveyDashboard = {
  granularity: SurveyGranularity;
  period: { code: string; label: string; start: string; end: string };
  previous_period: { code: string; label: string };
  metrics: SurveyMetrics;
  previous_metrics: SurveyMetrics;
  comparison: SurveyComparisonRow[];
  categories: SurveyCategoryRow[];
  /** Các kỳ để so sánh: tháng trong năm, quý trong năm, hoặc 2 năm gần nhất. */
  series: SurveySeriesItem[];
};

/** Một lần sửa trong nhật ký của dòng khảo sát. */
export type SurveyAuditLog = {
  id: number;
  action_type: "CREATE" | "UPDATE";
  action_label: string;
  /** Chỉ có ở dòng UPDATE. */
  changed_fields: Record<
    string,
    { label: string; old: unknown; new: unknown }
  > | null;
  changed_by_name: string;
  changed_at: string;
  note?: string | null;
};
