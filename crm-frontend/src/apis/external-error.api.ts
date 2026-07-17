import api from "@/apis/axios-client";
import {
  ExternalErrorBatch,
  ExternalErrorBulkClassifyPayload,
  ExternalErrorBulkClassifyResponse,
  ExternalErrorChartResponse,
  ExternalErrorListParams,
  ExternalErrorRawImportPayload,
  ExternalErrorRecord,
  ExternalErrorRecurringResponse,
  ExternalErrorSummary,
  ExternalErrorWidget,
  PaginatedResponse,
} from "@/types/external-error.type";

const EXTERNAL_ERROR_RECORDS_ENDPOINT = "/api/external-errors/records/";
const EXTERNAL_ERROR_BATCHES_ENDPOINT = "/api/external-errors/batches/";
const EXTERNAL_ERROR_IMPORT_ENDPOINT = "/api/external-errors/import-raw/";
const EXTERNAL_ERROR_DASHBOARD_SUMMARY_ENDPOINT = "/api/external-errors/dashboard/summary/";
const EXTERNAL_ERROR_DASHBOARD_CHART_ENDPOINT = "/api/external-errors/dashboard/chart/";
const EXTERNAL_ERROR_DASHBOARD_RECURRING_ENDPOINT = "/api/external-errors/dashboard/recurring/";
const EXTERNAL_ERROR_DASHBOARD_WIDGETS_ENDPOINT = "/api/external-errors/dashboard/widgets/";

function normalizePaginated<T>(data: T[] | PaginatedResponse<T>): PaginatedResponse<T> {
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

export const externalErrorApi = {
  getRecords: async (
    params: ExternalErrorListParams = {}
  ): Promise<PaginatedResponse<ExternalErrorRecord>> => {
    const response = await api.get<ExternalErrorRecord[] | PaginatedResponse<ExternalErrorRecord>>(
      EXTERNAL_ERROR_RECORDS_ENDPOINT,
      { params }
    );

    return normalizePaginated(response.data);
  },

  getRecord: async (id: number | string): Promise<ExternalErrorRecord> => {
    const response = await api.get<ExternalErrorRecord>(`${EXTERNAL_ERROR_RECORDS_ENDPOINT}${id}/`);
    return response.data;
  },

  updateRecord: async (
    id: number | string,
    payload: Partial<ExternalErrorRecord>
  ): Promise<ExternalErrorRecord> => {
    const response = await api.patch<ExternalErrorRecord>(`${EXTERNAL_ERROR_RECORDS_ENDPOINT}${id}/`, payload);
    return response.data;
  },

  classifyRecord: async (
    id: number | string,
    force = false
  ): Promise<ExternalErrorRecord> => {
    const response = await api.post<ExternalErrorRecord>(`${EXTERNAL_ERROR_RECORDS_ENDPOINT}${id}/classify/`, { force });
    return response.data;
  },

  confirmRecord: async (id: number | string): Promise<ExternalErrorRecord> => {
    const response = await api.post<ExternalErrorRecord>(`${EXTERNAL_ERROR_RECORDS_ENDPOINT}${id}/confirm/`);
    return response.data;
  },

  bulkClassify: async (
    payload: ExternalErrorBulkClassifyPayload
  ): Promise<ExternalErrorBulkClassifyResponse> => {
    const response = await api.post<ExternalErrorBulkClassifyResponse>(
      `${EXTERNAL_ERROR_RECORDS_ENDPOINT}bulk-classify/`,
      payload
    );
    return response.data;
  },

  getBatches: async (): Promise<ExternalErrorBatch[]> => {
    const response = await api.get<ExternalErrorBatch[] | PaginatedResponse<ExternalErrorBatch>>(
      EXTERNAL_ERROR_BATCHES_ENDPOINT
    );

    return normalizePaginated(response.data).results;
  },

  importRaw: async (payload: ExternalErrorRawImportPayload): Promise<ExternalErrorBatch> => {
    const response = await api.post<ExternalErrorBatch>(EXTERNAL_ERROR_IMPORT_ENDPOINT, payload);
    return response.data;
  },

  getSummary: async (params: ExternalErrorListParams = {}): Promise<ExternalErrorSummary> => {
    const response = await api.get<ExternalErrorSummary>(EXTERNAL_ERROR_DASHBOARD_SUMMARY_ENDPOINT, { params });
    return response.data;
  },

  getChart: async (
    params: ExternalErrorListParams & Record<string, string | number | boolean | undefined> = {}
  ): Promise<ExternalErrorChartResponse> => {
    const response = await api.get<ExternalErrorChartResponse>(EXTERNAL_ERROR_DASHBOARD_CHART_ENDPOINT, { params });
    return response.data;
  },

  getRecurring: async (
    params: ExternalErrorListParams & { min_count?: string; limit?: string } = {}
  ): Promise<ExternalErrorRecurringResponse> => {
    const response = await api.get<ExternalErrorRecurringResponse>(EXTERNAL_ERROR_DASHBOARD_RECURRING_ENDPOINT, { params });
    return response.data;
  },

  getWidgets: async (): Promise<ExternalErrorWidget[]> => {
    const response = await api.get<ExternalErrorWidget[] | PaginatedResponse<ExternalErrorWidget>>(
      EXTERNAL_ERROR_DASHBOARD_WIDGETS_ENDPOINT
    );
    return normalizePaginated(response.data).results;
  },
};
