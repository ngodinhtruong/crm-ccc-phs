import api from "@/apis/axios-client";
import type { PaginatedResponse } from "@/types/chatbot-dashboard.type";
import type {
  SurveyAuditLog,
  SurveyDashboard,
  SurveyEntryPayload,
  SurveyGranularity,
  SurveyImportPreview,
  SurveyImportResult,
  SurveyListParams,
  SurveyLog,
  SurveySummary,
  SurveyTicketOption,
  SurveyTicketOptionParams,
  SurveyUpdatePayload,
} from "@/types/survey.type";

// Khảo sát gắn với ticket nên nằm trong nhóm API của ticket.
const SURVEYS_ENDPOINT = "/api/tickets/surveys/";

export const surveyApi = {
  list(params: SurveyListParams = {}) {
    return api
      .get<PaginatedResponse<SurveyLog>>(SURVEYS_ENDPOINT, { params })
      .then((res) => res.data);
  },

  summary(params: SurveyListParams = {}) {
    return api
      .get<SurveySummary>(`${SURVEYS_ENDPOINT}summary/`, { params })
      .then((res) => res.data);
  },

  /** Số liệu CSAT của một kỳ, kèm kỳ liền trước để so sánh. */
  dashboard(params: { granularity: SurveyGranularity; period: string }) {
    return api
      .get<SurveyDashboard>(`${SURVEYS_ENDPOINT}dashboard/`, { params })
      .then((res) => res.data);
  },

  detail(id: number) {
    return api.get<SurveyLog>(`${SURVEYS_ENDPOINT}${id}/`).then((res) => res.data);
  },

  /** Gõ tên khách -> ticket của khách đó trong tháng. */
  ticketOptions(params: SurveyTicketOptionParams) {
    return api
      .get<{ results: SurveyTicketOption[] }>(
        `${SURVEYS_ENDPOINT}ticket-options/`,
        { params }
      )
      .then((res) => res.data.results);
  },

  create(payload: SurveyEntryPayload) {
    return api.post<SurveyLog>(SURVEYS_ENDPOINT, payload).then((res) => res.data);
  },

  update(id: number, payload: SurveyUpdatePayload) {
    return api
      .patch<SurveyLog>(`${SURVEYS_ENDPOINT}${id}/`, payload)
      .then((res) => res.data);
  },

  /** Ai đã sửa dòng này và sửa những gì. */
  auditLogs(id: number) {
    return api
      .get<SurveyAuditLog[]>(`${SURVEYS_ENDPOINT}${id}/audit-logs/`)
      .then((res) => res.data);
  },

  /** Đọc file và gợi ý ticket cho từng dòng — chưa ghi gì xuống DB. */
  importPreview(file: File) {
    const form = new FormData();
    form.append("file", file);

    return api
      .post<SurveyImportPreview>(`${SURVEYS_ENDPOINT}import-preview/`, form)
      .then((res) => res.data);
  },

  /** Ghi các dòng đã được người nhập gán ticket. */
  importCommit(rows: Array<SurveyEntryPayload & { row_number?: number }>) {
    return api
      .post<SurveyImportResult>(`${SURVEYS_ENDPOINT}import-commit/`, { rows })
      .then((res) => res.data);
  },
};
