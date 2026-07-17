import api from "@/apis/axios-client";
import {
  KpiAdminTargetsResponse,
  KpiAdminReportResponse,
  KpiAdminRankingResponse,
  KpiAdminQueryParams,
  KpiAdminMutationResponse,
  KpiAdminMetaResponse,
  KpiAdminDashboardResponse,
  KpiAdminCopyPreviousPayload,
  KpiAdminCopyEmployeePayload,
  KpiAdminBulkTargetPayload,
  KpiConfigMutationResponse,
  KpiCreateMonthlyPayload,
  KpiCreateMonthlyResponse,
  KpiGateConfigPayload,
  KpiGateDefinitionItem,
  KpiGateDefinitionPayload,
  KpiGroupItem,
  KpiGroupPayload,
  KpiMetricPayload,
  KpiPeriodDetail,
  KpiPeriodGateConfigItem,
  KpiPeriodItem,
  KpiPeriodMetricItem,
  KpiPeriodPayload,
  KpiProfileItem,
  KpiProfilePayload,
  KpiRewardTierConfigItem,
  KpiRewardTierPayload,
  KpiSaveWeightConfigPayload,
  KpiSaveWeightConfigResponse,
  KpiSectionItem,
  KpiSectionPayload,
  KpiValidateWeightPayload,
  KpiWeightValidation,
  PaginatedResponse,
} from "@/types/kpi.type";

const KPI_PERIOD_ENDPOINT = "/api/kpis/periods/";
const KPI_PROFILE_ENDPOINT = "/api/kpis/profiles/";
const KPI_SECTION_ENDPOINT = "/api/kpis/sections/";
const KPI_GROUP_ENDPOINT = "/api/kpis/groups/";
const KPI_METRIC_ENDPOINT = "/api/kpis/metrics/";
const KPI_GATE_CONFIG_ENDPOINT = "/api/kpis/gate-configs/";
const KPI_REWARD_TIER_ENDPOINT = "/api/kpis/reward-tiers/";
const KPI_GATE_DEFINITION_ENDPOINT = "/api/kpis/gate-definitions/";
const KPI_ADMIN_META_ENDPOINT = "/api/kpis/admin/meta/";
const KPI_ADMIN_PERIOD_OPTIONS_ENDPOINT = "/api/kpis/admin/period-options/";
const KPI_ADMIN_DASHBOARD_ENDPOINT = "/api/kpis/admin/dashboard/";
const KPI_ADMIN_RANKING_ENDPOINT = "/api/kpis/admin/ranking/";
const KPI_ADMIN_REPORT_ENDPOINT = "/api/kpis/admin/report/";
const KPI_ADMIN_TARGETS_ENDPOINT = "/api/kpis/admin/targets/";
const KPI_ADMIN_TARGETS_BULK_UPDATE_ENDPOINT = "/api/kpis/admin/targets/bulk-update/";
const KPI_ADMIN_TARGETS_COPY_PREVIOUS_ENDPOINT = "/api/kpis/admin/targets/copy-from-previous-period/";
const KPI_ADMIN_TARGETS_COPY_EMPLOYEE_ENDPOINT = "/api/kpis/admin/targets/copy-from-employee/";

function getListData<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;

  return data.results;
}

function normalizeMetricPayload(payload: Partial<KpiMetricPayload>) {
  return {
    period: payload.period,
    profile: payload.profile,
    group: payload.group,
    metric_code: payload.metric_code,
    metric_name: payload.metric_name,
    weight_percent: payload.weight_percent,
    // work_description: payload.work_description ?? "",
    measurement_formula:
      payload.measurement_formula?.trim() || "Chưa cấu hình công thức tính",
    target_text: payload.target_text ?? "",
    target_value: payload.target_value ?? null,
    target_unit: payload.target_unit ?? null,
    frequency: payload.frequency ?? "",
    is_active: payload.is_active,
  };
}

export const kpiApi = {
  getPeriods: async (params: Record<string, string> = {}): Promise<KpiPeriodItem[]> => {
    const response = await api.get<KpiPeriodItem[] | PaginatedResponse<KpiPeriodItem>>(
      KPI_PERIOD_ENDPOINT,
      { params }
    );

    return getListData(response.data);
  },

  getPeriodDetail: async (id: number | string): Promise<KpiPeriodDetail> => {
    const response = await api.get<KpiPeriodDetail>(`${KPI_PERIOD_ENDPOINT}${id}/`);

    return response.data;
  },

  createMonthlyPeriod: async (
    payload: KpiCreateMonthlyPayload
  ): Promise<KpiCreateMonthlyResponse> => {
    const response = await api.post<KpiCreateMonthlyResponse>(
      `${KPI_PERIOD_ENDPOINT}create-monthly/`,
      payload
    );

    return response.data;
  },

  updatePeriod: async (
    id: number | string,
    payload: KpiPeriodPayload
  ): Promise<KpiConfigMutationResponse<KpiPeriodItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiPeriodItem>>(
      `${KPI_PERIOD_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deletePeriod: async (
    id: number | string
  ): Promise<{ detail: string; changed: boolean }> => {
    const response = await api.delete<{ detail: string; changed: boolean }>(
      `${KPI_PERIOD_ENDPOINT}${id}/`
    );

    return response.data;
  },

  validateWeights: async (
    periodId: number | string,
    payload: KpiValidateWeightPayload = {}
  ): Promise<KpiWeightValidation> => {
    const response = await api.post<KpiWeightValidation & { detail?: string }>(
      `${KPI_PERIOD_ENDPOINT}${periodId}/validate-weights/`,
      payload
    );

    return {
      valid: response.data.valid,
      errors: response.data.errors || [],
    };
  },

  saveWeightConfig: async (
    periodId: number | string,
    payload: KpiSaveWeightConfigPayload
  ): Promise<KpiSaveWeightConfigResponse> => {
    const response = await api.post<KpiSaveWeightConfigResponse>(
      `${KPI_PERIOD_ENDPOINT}${periodId}/save-weight-config/`,
      payload
    );

    return response.data;
  },

  getProfiles: async (
    params: Record<string, string> = {}
  ): Promise<KpiProfileItem[]> => {
    const response = await api.get<KpiProfileItem[] | PaginatedResponse<KpiProfileItem>>(
      KPI_PROFILE_ENDPOINT,
      { params }
    );

    return getListData(response.data);
  },

  createProfile: async (
    payload: KpiProfilePayload
  ): Promise<KpiConfigMutationResponse<KpiProfileItem>> => {
    const response = await api.post<KpiConfigMutationResponse<KpiProfileItem>>(
      KPI_PROFILE_ENDPOINT,
      payload
    );

    return response.data;
  },

  updateProfile: async (
    id: number | string,
    payload: Partial<KpiProfilePayload>
  ): Promise<KpiConfigMutationResponse<KpiProfileItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiProfileItem>>(
      `${KPI_PROFILE_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deleteProfile: async (
    id: number | string
  ): Promise<KpiConfigMutationResponse<KpiProfileItem>> => {
    const response = await api.delete<KpiConfigMutationResponse<KpiProfileItem>>(
      `${KPI_PROFILE_ENDPOINT}${id}/`
    );

    return response.data;
  },

  getSections: async (
    params: Record<string, string> = {}
  ): Promise<KpiSectionItem[]> => {
    const response = await api.get<KpiSectionItem[] | PaginatedResponse<KpiSectionItem>>(
      KPI_SECTION_ENDPOINT,
      { params }
    );

    return getListData(response.data);
  },

  createSection: async (
    payload: KpiSectionPayload
  ): Promise<KpiConfigMutationResponse<KpiSectionItem>> => {
    const response = await api.post<KpiConfigMutationResponse<KpiSectionItem>>(
      KPI_SECTION_ENDPOINT,
      payload
    );

    return response.data;
  },

  updateSection: async (
    id: number | string,
    payload: Partial<KpiSectionPayload>
  ): Promise<KpiConfigMutationResponse<KpiSectionItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiSectionItem>>(
      `${KPI_SECTION_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deleteSection: async (
    id: number | string
  ): Promise<KpiConfigMutationResponse<KpiSectionItem>> => {
    const response = await api.delete<KpiConfigMutationResponse<KpiSectionItem>>(
      `${KPI_SECTION_ENDPOINT}${id}/`
    );

    return response.data;
  },

  getGroups: async (params: Record<string, string> = {}): Promise<KpiGroupItem[]> => {
    const response = await api.get<KpiGroupItem[] | PaginatedResponse<KpiGroupItem>>(
      KPI_GROUP_ENDPOINT,
      { params }
    );

    return getListData(response.data);
  },

  createGroup: async (
    payload: KpiGroupPayload
  ): Promise<KpiConfigMutationResponse<KpiGroupItem>> => {
    const response = await api.post<KpiConfigMutationResponse<KpiGroupItem>>(
      KPI_GROUP_ENDPOINT,
      payload
    );

    return response.data;
  },

  updateGroup: async (
    id: number | string,
    payload: Partial<KpiGroupPayload>
  ): Promise<KpiConfigMutationResponse<KpiGroupItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiGroupItem>>(
      `${KPI_GROUP_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deleteGroup: async (
    id: number | string
  ): Promise<KpiConfigMutationResponse<KpiGroupItem>> => {
    const response = await api.delete<KpiConfigMutationResponse<KpiGroupItem>>(
      `${KPI_GROUP_ENDPOINT}${id}/`
    );

    return response.data;
  },

  getMetrics: async (
    params: Record<string, string> = {}
  ): Promise<KpiPeriodMetricItem[]> => {
    const response = await api.get<
      KpiPeriodMetricItem[] | PaginatedResponse<KpiPeriodMetricItem>
    >(KPI_METRIC_ENDPOINT, { params });

    return getListData(response.data);
  },

  createMetric: async (
    payload: KpiMetricPayload
  ): Promise<KpiConfigMutationResponse<KpiPeriodMetricItem>> => {
    const response = await api.post<KpiConfigMutationResponse<KpiPeriodMetricItem>>(
      KPI_METRIC_ENDPOINT,
      normalizeMetricPayload(payload)
    );

    return response.data;
  },

  updateMetric: async (
    id: number | string,
    payload: Partial<KpiMetricPayload>
  ): Promise<KpiConfigMutationResponse<KpiPeriodMetricItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiPeriodMetricItem>>(
      `${KPI_METRIC_ENDPOINT}${id}/`,
      normalizeMetricPayload(payload)
    );

    return response.data;
  },

  deleteMetric: async (
    id: number | string
  ): Promise<KpiConfigMutationResponse<KpiPeriodMetricItem>> => {
    const response = await api.delete<KpiConfigMutationResponse<KpiPeriodMetricItem>>(
      `${KPI_METRIC_ENDPOINT}${id}/`
    );

    return response.data;
  },

  getGateConfigs: async (
    params: Record<string, string> = {}
  ): Promise<KpiPeriodGateConfigItem[]> => {
    const response = await api.get<
      KpiPeriodGateConfigItem[] | PaginatedResponse<KpiPeriodGateConfigItem>
    >(KPI_GATE_CONFIG_ENDPOINT, { params });

    return getListData(response.data);
  },

  createGateConfig: async (
    payload: KpiGateConfigPayload
  ): Promise<KpiConfigMutationResponse<KpiPeriodGateConfigItem>> => {
    const response = await api.post<KpiConfigMutationResponse<KpiPeriodGateConfigItem>>(
      KPI_GATE_CONFIG_ENDPOINT,
      payload
    );

    return response.data;
  },

  updateGateConfig: async (
    id: number | string,
    payload: Partial<KpiGateConfigPayload>
  ): Promise<KpiConfigMutationResponse<KpiPeriodGateConfigItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiPeriodGateConfigItem>>(
      `${KPI_GATE_CONFIG_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deleteGateConfig: async (
    id: number | string
  ): Promise<KpiConfigMutationResponse<KpiPeriodGateConfigItem>> => {
    const response = await api.delete<KpiConfigMutationResponse<KpiPeriodGateConfigItem>>(
      `${KPI_GATE_CONFIG_ENDPOINT}${id}/`
    );

    return response.data;
  },

  getRewardTiers: async (
    params: Record<string, string> = {}
  ): Promise<KpiRewardTierConfigItem[]> => {
    const response = await api.get<
      KpiRewardTierConfigItem[] | PaginatedResponse<KpiRewardTierConfigItem>
    >(KPI_REWARD_TIER_ENDPOINT, { params });

    return getListData(response.data);
  },

  createRewardTier: async (
    payload: KpiRewardTierPayload
  ): Promise<KpiConfigMutationResponse<KpiRewardTierConfigItem>> => {
    const response = await api.post<KpiConfigMutationResponse<KpiRewardTierConfigItem>>(
      KPI_REWARD_TIER_ENDPOINT,
      payload
    );

    return response.data;
  },

  updateRewardTier: async (
    id: number | string,
    payload: Partial<KpiRewardTierPayload>
  ): Promise<KpiConfigMutationResponse<KpiRewardTierConfigItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiRewardTierConfigItem>>(
      `${KPI_REWARD_TIER_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deleteRewardTier: async (
    id: number | string
  ): Promise<KpiConfigMutationResponse<KpiRewardTierConfigItem>> => {
    const response = await api.delete<KpiConfigMutationResponse<KpiRewardTierConfigItem>>(
      `${KPI_REWARD_TIER_ENDPOINT}${id}/`
    );

    return response.data;
  },

  getGateDefinitions: async (
    params: Record<string, string> = {}
  ): Promise<KpiGateDefinitionItem[]> => {
    const response = await api.get<
      KpiGateDefinitionItem[] | PaginatedResponse<KpiGateDefinitionItem>
    >(KPI_GATE_DEFINITION_ENDPOINT, { params });

    return getListData(response.data);
  },

  createGateDefinition: async (
    payload: KpiGateDefinitionPayload
  ): Promise<KpiGateDefinitionItem> => {
    const response = await api.post<KpiGateDefinitionItem>(
      KPI_GATE_DEFINITION_ENDPOINT,
      payload
    );

    return response.data;
  },

  updateGateDefinition: async (
    id: number | string,
    payload: Partial<KpiGateDefinitionPayload>
  ): Promise<KpiGateDefinitionItem> => {
    const response = await api.patch<KpiGateDefinitionItem>(
      `${KPI_GATE_DEFINITION_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deleteGateDefinition: async (id: number | string): Promise<KpiGateDefinitionItem> => {
    const response = await api.delete<KpiGateDefinitionItem>(
      `${KPI_GATE_DEFINITION_ENDPOINT}${id}/`
    );

    return response.data;
  },


  getKpiAdminPeriodOptions: async (
    params: Record<string, string> = {}
  ): Promise<KpiPeriodItem[]> => {
    const response = await api.get<KpiPeriodItem[]>(KPI_ADMIN_PERIOD_OPTIONS_ENDPOINT, {
      params: { limit: "48", ...params },
    });

    return response.data;
  },


  getKpiAdminMeta: async (
    params: KpiAdminQueryParams = {}
  ): Promise<KpiAdminMetaResponse> => {
    const response = await api.get<KpiAdminMetaResponse>(KPI_ADMIN_META_ENDPOINT, { params });
    return response.data;
  },

  getKpiAdminDashboard: async (
    params: KpiAdminQueryParams = {}
  ): Promise<KpiAdminDashboardResponse> => {
    const response = await api.get<KpiAdminDashboardResponse>(
      KPI_ADMIN_DASHBOARD_ENDPOINT,
      { params }
    );
    return response.data;
  },

  getKpiAdminRanking: async (
    params: KpiAdminQueryParams = {}
  ): Promise<KpiAdminRankingResponse> => {
    const response = await api.get<KpiAdminRankingResponse>(KPI_ADMIN_RANKING_ENDPOINT, {
      params,
    });
    return response.data;
  },

  getKpiAdminReport: async (
    params: KpiAdminQueryParams = {}
  ): Promise<KpiAdminReportResponse> => {
    const response = await api.get<KpiAdminReportResponse>(KPI_ADMIN_REPORT_ENDPOINT, {
      params,
    });
    return response.data;
  },

  getKpiAdminTargets: async (
    params: KpiAdminQueryParams = {}
  ): Promise<KpiAdminTargetsResponse> => {
    const response = await api.get<KpiAdminTargetsResponse>(KPI_ADMIN_TARGETS_ENDPOINT, {
      params,
    });
    return response.data;
  },

  bulkUpdateKpiAdminTargets: async (
    payload: KpiAdminBulkTargetPayload
  ): Promise<KpiAdminMutationResponse> => {
    const response = await api.post<KpiAdminMutationResponse>(
      KPI_ADMIN_TARGETS_BULK_UPDATE_ENDPOINT,
      payload
    );
    return response.data;
  },

  copyKpiAdminTargetsFromPreviousPeriod: async (
    payload: KpiAdminCopyPreviousPayload
  ): Promise<KpiAdminMutationResponse> => {
    const response = await api.post<KpiAdminMutationResponse>(
      KPI_ADMIN_TARGETS_COPY_PREVIOUS_ENDPOINT,
      payload
    );
    return response.data;
  },

  copyKpiAdminTargetsFromEmployee: async (
    payload: KpiAdminCopyEmployeePayload
  ): Promise<KpiAdminMutationResponse> => {
    const response = await api.post<KpiAdminMutationResponse>(
      KPI_ADMIN_TARGETS_COPY_EMPLOYEE_ENDPOINT,
      payload
    );
    return response.data;
  },

  /**
   * Deprecated compatibility method.
   * Backend mới không còn KPI master, nên luôn trả mảng rỗng.
   */
  getMetricDefinitions: async (): Promise<[]> => {
    return [];
  },
};
