import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
  PaginatedResponse,
  SlaListParams,
  SlaPolicyItem,
  SlaPolicyPayload,
} from "@/types/sla.type";

const SLA_POLICY_ENDPOINT = "/api/sla/policies/";

export const slaApi = {
  getSlaPolicies: async (
    params: SlaListParams = {}
  ): Promise<PaginatedResponse<SlaPolicyItem>> => {
    const response = await api.get<PaginatedResponse<SlaPolicyItem>>(
      SLA_POLICY_ENDPOINT,
      {
        params: cleanParams(params),
      }
    );

    const data = response.data;

    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data,
      };
    }

    return data;
  },

  createSlaPolicy: async (
    payload: SlaPolicyPayload
  ): Promise<SlaPolicyItem> => {
    const response = await api.post<SlaPolicyItem>(
      SLA_POLICY_ENDPOINT,
      payload
    );

    return response.data;
  },

  getSlaPolicy: async (id: number | string): Promise<SlaPolicyItem> => {
    const response = await api.get<SlaPolicyItem>(
      `${SLA_POLICY_ENDPOINT}${id}/`
    );

    return response.data;
  },

  updateSlaPolicy: async (
    id: number | string,
    payload: Partial<SlaPolicyPayload>
  ): Promise<SlaPolicyItem> => {
    const response = await api.patch<SlaPolicyItem>(
      `${SLA_POLICY_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  getSlaPoliciesAsList: async (): Promise<SlaPolicyItem[]> => {
    const response = await api.get(SLA_POLICY_ENDPOINT);
    return getListData<SlaPolicyItem>(response.data);
  },
};

export const slaService = slaApi;