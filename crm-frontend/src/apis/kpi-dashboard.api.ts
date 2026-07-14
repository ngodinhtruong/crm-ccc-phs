import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
  KpiDashboardParams,
  KpiMetricContributionParams,
  KpiMetricContributionResponse,
  KpiGroupItem,
  KpiPeriodItem,
  KpiPeriodMetricItem,
  KpiProfileItem,
  KpiSectionItem,
  KpiUserGateResultItem,
  KpiUserMetricResultItem,
  KpiUserSummaryItem,
  PaginatedResponse,
} from "@/types/kpi-dashboard.type";

const KPI_PERIOD_ENDPOINT = "/api/kpis/periods/";
const KPI_PROFILE_ENDPOINT = "/api/kpis/profiles/";
const KPI_SECTION_ENDPOINT = "/api/kpis/sections/";
const KPI_GROUP_ENDPOINT = "/api/kpis/groups/";
const KPI_METRIC_ENDPOINT = "/api/kpis/metrics/";
const KPI_RESULT_ENDPOINT = "/api/kpis/results/";
const KPI_GATE_RESULT_ENDPOINT = "/api/kpis/gate-results/";
const KPI_SUMMARY_ENDPOINT = "/api/kpis/summaries/";

function toList<T>(data: T[] | PaginatedResponse<T>): T[] {
  return getListData<T>(data);
}

export const kpiDashboardApi = {
  getPeriods: async (): Promise<KpiPeriodItem[]> => {
    const response = await api.get<KpiPeriodItem[] | PaginatedResponse<KpiPeriodItem>>(
      KPI_PERIOD_ENDPOINT,
      {
        params: {
          ordering: "-year,-month,-id",
        },
      }
    );

    return toList(response.data);
  },

  getProfiles: async (periodId: string): Promise<KpiProfileItem[]> => {
    const response = await api.get<KpiProfileItem[] | PaginatedResponse<KpiProfileItem>>(
      KPI_PROFILE_ENDPOINT,
      {
        params: cleanParams({ period: periodId, is_active: "true" }),
      }
    );

    return toList(response.data);
  },

  getSections: async (params: KpiDashboardParams): Promise<KpiSectionItem[]> => {
    const response = await api.get<KpiSectionItem[] | PaginatedResponse<KpiSectionItem>>(
      KPI_SECTION_ENDPOINT,
      {
        params: cleanParams(params),
      }
    );

    return toList(response.data);
  },

  getGroups: async (params: KpiDashboardParams): Promise<KpiGroupItem[]> => {
    const response = await api.get<KpiGroupItem[] | PaginatedResponse<KpiGroupItem>>(
      KPI_GROUP_ENDPOINT,
      {
        params: cleanParams(params),
      }
    );

    return toList(response.data);
  },

  getMetrics: async (params: KpiDashboardParams): Promise<KpiPeriodMetricItem[]> => {
    const response = await api.get<
      KpiPeriodMetricItem[] | PaginatedResponse<KpiPeriodMetricItem>
    >(KPI_METRIC_ENDPOINT, {
      params: cleanParams({ ...params, is_active: "true" }),
    });

    return toList(response.data);
  },

  getResults: async (
    params: KpiDashboardParams
  ): Promise<KpiUserMetricResultItem[]> => {
    const response = await api.get<
      KpiUserMetricResultItem[] | PaginatedResponse<KpiUserMetricResultItem>
    >(KPI_RESULT_ENDPOINT, {
      params: cleanParams(params),
    });

    return toList(response.data);
  },

  getGateResults: async (
    params: KpiDashboardParams
  ): Promise<KpiUserGateResultItem[]> => {
    const response = await api.get<
      KpiUserGateResultItem[] | PaginatedResponse<KpiUserGateResultItem>
    >(KPI_GATE_RESULT_ENDPOINT, {
      params: cleanParams(params),
    });

    return toList(response.data);
  },

  getSummaries: async (params: KpiDashboardParams): Promise<KpiUserSummaryItem[]> => {
    const response = await api.get<
      KpiUserSummaryItem[] | PaginatedResponse<KpiUserSummaryItem>
    >(KPI_SUMMARY_ENDPOINT, {
      params: cleanParams(params),
    });

    return toList(response.data);
  },

  getMetricContributions: async (
    params: KpiMetricContributionParams
  ): Promise<KpiMetricContributionResponse> => {
    const response = await api.get<KpiMetricContributionResponse>(
      `${KPI_RESULT_ENDPOINT}metric-contributions/`,
      {
        params: cleanParams(params),
      }
    );

    return response.data;
  },

  calculateAuto: async (payload: {
    period: number | string;
    profile_code?: string;
    user?: number | string;
  }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(
      `${KPI_RESULT_ENDPOINT}calculate-auto/`,
      cleanParams(payload)
    );

    return response.data;
  },

  calculateSummary: async (payload: {
    period: number | string;
    profile_code?: string;
    user?: number | string;
  }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(
      `${KPI_SUMMARY_ENDPOINT}calculate/`,
      cleanParams(payload)
    );

    return response.data;
  },
};
