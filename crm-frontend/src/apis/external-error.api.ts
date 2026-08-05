import api from "@/apis/axios-client";
import {
  ExternalErrorBatch,
  ExternalErrorBulkClassifyPayload,
  ExternalErrorBulkClassifyResponse,
  ExternalErrorChartResponse,
  ExternalErrorDashboardOverview,
  ExternalErrorCauseGroup,
  ExternalErrorCauseGroupPayload,
  ExternalErrorCode,
  ExternalErrorCodePayload,
  ExternalErrorExcelImportPayload,
  ExternalErrorExcelImportResponse,
  ExternalErrorGroup,
  ExternalErrorGroupPayload,
  ExternalErrorListParams,
  ExternalErrorManualCreatePayload,
  ExternalErrorRawImportPayload,
  ExternalErrorRecord,
  ExternalErrorRecordAuditLog,
  ExternalErrorRecurringResponse,
  ExternalErrorSummary,
  ExternalErrorWidget,
  PaginatedResponse,
} from "@/types/external-error.type";

const RECORDS_ENDPOINT = "/api/external-errors/records/";
const BATCHES_ENDPOINT = "/api/external-errors/batches/";
const GROUPS_ENDPOINT = "/api/external-errors/groups/";
const ERROR_CODES_ENDPOINT = "/api/external-errors/error-codes/";
const CAUSE_GROUPS_ENDPOINT = "/api/external-errors/cause-groups/";
const IMPORT_EXCEL_ENDPOINT = "/api/external-errors/import-excel/";
const IMPORT_RAW_ENDPOINT = "/api/external-errors/import-raw/";
const DASHBOARD_SUMMARY_ENDPOINT = "/api/external-errors/dashboard/summary/";
const DASHBOARD_OVERVIEW_ENDPOINT = "/api/external-errors/dashboard/overview/";
const DASHBOARD_CHART_ENDPOINT = "/api/external-errors/dashboard/chart/";
const DASHBOARD_RECURRING_ENDPOINT = "/api/external-errors/dashboard/recurring/";
const DASHBOARD_WIDGETS_ENDPOINT = "/api/external-errors/dashboard/widgets/";

function normalizePaginated<T>(
  data: T[] | PaginatedResponse<T>
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }

  return data;
}

type CatalogParams = {
  q?: string;
  group?: string | number;
  group_code?: string;
  is_active?: string | boolean;
};

export const externalErrorApi = {
  getGroups: async (
    params: CatalogParams = {}
  ): Promise<ExternalErrorGroup[]> => {
    const response = await api.get<
      ExternalErrorGroup[] | PaginatedResponse<ExternalErrorGroup>
    >(GROUPS_ENDPOINT, { params });

    return normalizePaginated(response.data).results;
  },

  createGroup: async (
    payload: ExternalErrorGroupPayload
  ): Promise<ExternalErrorGroup> => {
    const response = await api.post<ExternalErrorGroup>(
      GROUPS_ENDPOINT,
      payload
    );
    return response.data;
  },

  updateGroup: async (
    id: number,
    payload: Partial<ExternalErrorGroupPayload>
  ): Promise<ExternalErrorGroup> => {
    const response = await api.patch<ExternalErrorGroup>(
      `${GROUPS_ENDPOINT}${id}/`,
      payload
    );
    return response.data;
  },

  deactivateGroup: async (id: number): Promise<void> => {
    await api.delete(`${GROUPS_ENDPOINT}${id}/`);
  },

  getErrorCodes: async (
    params: CatalogParams = {}
  ): Promise<ExternalErrorCode[]> => {
    const response = await api.get<
      ExternalErrorCode[] | PaginatedResponse<ExternalErrorCode>
    >(ERROR_CODES_ENDPOINT, { params });

    return normalizePaginated(response.data).results;
  },

  createErrorCode: async (
    payload: ExternalErrorCodePayload
  ): Promise<ExternalErrorCode> => {
    const response = await api.post<ExternalErrorCode>(
      ERROR_CODES_ENDPOINT,
      payload
    );
    return response.data;
  },

  updateErrorCode: async (
    id: number,
    payload: Partial<ExternalErrorCodePayload>
  ): Promise<ExternalErrorCode> => {
    const response = await api.patch<ExternalErrorCode>(
      `${ERROR_CODES_ENDPOINT}${id}/`,
      payload
    );
    return response.data;
  },

  deactivateErrorCode: async (id: number): Promise<void> => {
    await api.delete(`${ERROR_CODES_ENDPOINT}${id}/`);
  },

  getCauseGroups: async (
    params: CatalogParams = {}
  ): Promise<ExternalErrorCauseGroup[]> => {
    const response = await api.get<
      ExternalErrorCauseGroup[] | PaginatedResponse<ExternalErrorCauseGroup>
    >(CAUSE_GROUPS_ENDPOINT, { params });

    return normalizePaginated(response.data).results;
  },

  createCauseGroup: async (
    payload: ExternalErrorCauseGroupPayload
  ): Promise<ExternalErrorCauseGroup> => {
    const response = await api.post<ExternalErrorCauseGroup>(
      CAUSE_GROUPS_ENDPOINT,
      payload
    );
    return response.data;
  },

  updateCauseGroup: async (
    id: number,
    payload: Partial<ExternalErrorCauseGroupPayload>
  ): Promise<ExternalErrorCauseGroup> => {
    const response = await api.patch<ExternalErrorCauseGroup>(
      `${CAUSE_GROUPS_ENDPOINT}${id}/`,
      payload
    );
    return response.data;
  },

  deactivateCauseGroup: async (id: number): Promise<void> => {
    await api.delete(`${CAUSE_GROUPS_ENDPOINT}${id}/`);
  },

  getRecords: async (
    params: ExternalErrorListParams = {}
  ): Promise<PaginatedResponse<ExternalErrorRecord>> => {
    const response = await api.get<
      ExternalErrorRecord[] | PaginatedResponse<ExternalErrorRecord>
    >(RECORDS_ENDPOINT, { params });

    return normalizePaginated(response.data);
  },

  getRecord: async (
    id: number | string
  ): Promise<ExternalErrorRecord> => {
    const response = await api.get<ExternalErrorRecord>(
      `${RECORDS_ENDPOINT}${id}/`
    );
    return response.data;
  },

  getAuditLogs: async (
    id: number | string
  ): Promise<ExternalErrorRecordAuditLog[]> => {
    const response = await api.get<ExternalErrorRecordAuditLog[]>(
      `${RECORDS_ENDPOINT}${id}/audit-logs/`
    );
    return response.data;
  },

  updateRecord: async (
    id: number | string,
    payload: Partial<ExternalErrorRecord>
  ): Promise<ExternalErrorRecord> => {
    const response = await api.patch<ExternalErrorRecord>(
      `${RECORDS_ENDPOINT}${id}/`,
      payload
    );
    return response.data;
  },

  createRecord: async (
    payload: ExternalErrorManualCreatePayload
  ): Promise<ExternalErrorRecord> => {
    const response = await api.post<ExternalErrorRecord>(
      RECORDS_ENDPOINT,
      payload
    );
    return response.data;
  },

  classifyRecord: async (
    id: number | string,
    force = false
  ): Promise<ExternalErrorRecord> => {
    const response = await api.post<ExternalErrorRecord>(
      `${RECORDS_ENDPOINT}${id}/classify/`,
      { force }
    );
    return response.data;
  },

  confirmRecord: async (
    id: number | string,
    errorCodeId: number
  ): Promise<ExternalErrorRecord> => {
    const response = await api.post<ExternalErrorRecord>(
      `${RECORDS_ENDPOINT}${id}/confirm/`,
      { error_code: errorCodeId }
    );
    return response.data;
  },

  classifyCauseRecord: async (
    id: number | string,
    force = false
  ): Promise<ExternalErrorRecord> => {
    const response = await api.post<ExternalErrorRecord>(
      `${RECORDS_ENDPOINT}${id}/classify-cause/`,
      { force }
    );
    return response.data;
  },

  confirmCause: async (
    id: number | string,
    causeGroupId: number,
    normalizedCause?: string
  ): Promise<ExternalErrorRecord> => {
    const response = await api.post<ExternalErrorRecord>(
      `${RECORDS_ENDPOINT}${id}/confirm-cause/`,
      {
        cause_group: causeGroupId,
        normalized_cause: normalizedCause,
      }
    );
    return response.data;
  },

  bulkClassify: async (
    payload: ExternalErrorBulkClassifyPayload
  ): Promise<ExternalErrorBulkClassifyResponse> => {
    const response = await api.post<ExternalErrorBulkClassifyResponse>(
      `${RECORDS_ENDPOINT}bulk-classify/`,
      payload
    );
    return response.data;
  },

  bulkClassifyCauses: async (
    payload: ExternalErrorBulkClassifyPayload
  ): Promise<ExternalErrorBulkClassifyResponse> => {
    const response = await api.post<ExternalErrorBulkClassifyResponse>(
      `${RECORDS_ENDPOINT}bulk-classify-causes/`,
      payload
    );
    return response.data;
  },

  getBatches: async (): Promise<ExternalErrorBatch[]> => {
    const response = await api.get<
      ExternalErrorBatch[] | PaginatedResponse<ExternalErrorBatch>
    >(BATCHES_ENDPOINT);

    return normalizePaginated(response.data).results;
  },

  classifyBatch: async (
    batchId: number
  ): Promise<{ detail: string; task_id: string; batch: ExternalErrorBatch }> => {
    const response = await api.post(
      `${BATCHES_ENDPOINT}${batchId}/classify/`
    );
    return response.data;
  },

  importExcel: async (
    payload: ExternalErrorExcelImportPayload
  ): Promise<ExternalErrorExcelImportResponse> => {
    const formData = new FormData();
    formData.append("file", payload.file);

    if (payload.sheet_name?.trim()) {
      formData.append("sheet_name", payload.sheet_name.trim());
    }

    formData.append(
      "auto_classify",
      String(payload.auto_classify ?? true)
    );

    const response = await api.post<ExternalErrorExcelImportResponse>(
      IMPORT_EXCEL_ENDPOINT,
      formData,
      {
        // Batch có thể chạy LLM lâu hơn request thông thường.
        timeout: 300000,

        // Không tự đặt Content-Type ở đây. Browser sẽ tự tạo
        // multipart/form-data kèm boundary chính xác.
        transformRequest: [
          (data, headers) => {
            headers.delete("Content-Type");
            return data;
          },
        ],
      }
    );

    return response.data;
  },

  // Giữ lại cho tích hợp API nội bộ cũ; giao diện mới không dùng JSON import.
  importRaw: async (
    payload: ExternalErrorRawImportPayload
  ): Promise<ExternalErrorBatch> => {
    const response = await api.post<ExternalErrorBatch>(
      IMPORT_RAW_ENDPOINT,
      payload
    );
    return response.data;
  },

  getDashboardOverview: async (
    params: ExternalErrorListParams & { refresh?: boolean } = {}
  ): Promise<ExternalErrorDashboardOverview> => {
    const response = await api.get<ExternalErrorDashboardOverview>(
      DASHBOARD_OVERVIEW_ENDPOINT,
      { params }
    );
    return response.data;
  },

  getSummary: async (
    params: ExternalErrorListParams = {}
  ): Promise<ExternalErrorSummary> => {
    const response = await api.get<ExternalErrorSummary>(
      DASHBOARD_SUMMARY_ENDPOINT,
      { params }
    );
    return response.data;
  },

  getChart: async (
    params: ExternalErrorListParams &
      Record<string, string | number | boolean | undefined> = {}
  ): Promise<ExternalErrorChartResponse> => {
    const response = await api.get<ExternalErrorChartResponse>(
      DASHBOARD_CHART_ENDPOINT,
      { params }
    );
    return response.data;
  },

  getRecurring: async (
    params: ExternalErrorListParams & {
      min_count?: string;
      limit?: string;
    } = {}
  ): Promise<ExternalErrorRecurringResponse> => {
    const response = await api.get<ExternalErrorRecurringResponse>(
      DASHBOARD_RECURRING_ENDPOINT,
      { params }
    );
    return response.data;
  },

  getWidgets: async (): Promise<ExternalErrorWidget[]> => {
    const response = await api.get<
      ExternalErrorWidget[] | PaginatedResponse<ExternalErrorWidget>
    >(DASHBOARD_WIDGETS_ENDPOINT);

    return normalizePaginated(response.data).results;
  },
};
