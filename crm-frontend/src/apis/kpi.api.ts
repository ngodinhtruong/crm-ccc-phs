import api from "@/apis/axios-client";
import {
  KpiConfigMutationResponse,
  KpiCreateMonthlyPayload,
  KpiCreateMonthlyResponse,
  KpiGateConfigPayload,
  KpiGateDefinitionItem,
  KpiGateDefinitionPayload,
  KpiGroupItem,
  KpiGroupPayload,
  KpiMetricDefinitionItem,
  KpiMetricDefinitionPayload,
  KpiMetricPayload,
  KpiPeriodDetail,
  KpiPeriodGateConfigItem,
  KpiPeriodItem,
  KpiPeriodMetricItem,
  KpiRewardTierConfigItem,
  KpiRewardTierPayload,
  KpiSaveWeightConfigPayload,
  KpiSaveWeightConfigResponse,
  KpiWeightValidation,
  PaginatedResponse,
} from "@/types/kpi.type";

const KPI_PERIOD_ENDPOINT = "/api/kpis/periods/";
const KPI_GROUP_ENDPOINT = "/api/kpis/groups/";
const KPI_METRIC_ENDPOINT = "/api/kpis/metrics/";
const KPI_GATE_CONFIG_ENDPOINT = "/api/kpis/gate-configs/";
const KPI_REWARD_TIER_ENDPOINT = "/api/kpis/reward-tiers/";
const KPI_METRIC_DEFINITION_ENDPOINT = "/api/kpis/metric-definitions/";
const KPI_GATE_DEFINITION_ENDPOINT = "/api/kpis/gate-definitions/";

function getListData<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;

  return data.results;
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

  validateWeights: async (periodId: number | string): Promise<KpiWeightValidation> => {
    const response = await api.post<KpiWeightValidation & { detail?: string }>(
      `${KPI_PERIOD_ENDPOINT}${periodId}/validate-weights/`
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
      payload
    );

    return response.data;
  },

  updateMetric: async (
    id: number | string,
    payload: Partial<KpiMetricPayload>
  ): Promise<KpiConfigMutationResponse<KpiPeriodMetricItem>> => {
    const response = await api.patch<KpiConfigMutationResponse<KpiPeriodMetricItem>>(
      `${KPI_METRIC_ENDPOINT}${id}/`,
      payload
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

  getMetricDefinitions: async (
    params: Record<string, string> = {}
  ): Promise<KpiMetricDefinitionItem[]> => {
    const response = await api.get<
      KpiMetricDefinitionItem[] | PaginatedResponse<KpiMetricDefinitionItem>
    >(KPI_METRIC_DEFINITION_ENDPOINT, { params });

    return getListData(response.data);
  },

  createMetricDefinition: async (
    payload: KpiMetricDefinitionPayload
  ): Promise<KpiMetricDefinitionItem> => {
    const response = await api.post<KpiMetricDefinitionItem>(
      KPI_METRIC_DEFINITION_ENDPOINT,
      payload
    );

    return response.data;
  },

  updateMetricDefinition: async (
    id: number | string,
    payload: Partial<KpiMetricDefinitionPayload>
  ): Promise<KpiMetricDefinitionItem> => {
    const response = await api.patch<KpiMetricDefinitionItem>(
      `${KPI_METRIC_DEFINITION_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  deleteMetricDefinition: async (id: number | string): Promise<KpiMetricDefinitionItem> => {
    const response = await api.delete<KpiMetricDefinitionItem>(
      `${KPI_METRIC_DEFINITION_ENDPOINT}${id}/`
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
};