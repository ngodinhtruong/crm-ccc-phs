import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import { KpiPeriodItem, PaginatedResponse } from "@/types/kpi-dashboard.type";
import {
  KpiRankingParams,
  KpiRankingResponse,
} from "@/types/kpi-ranking.type";

const KPI_PERIOD_ENDPOINT = "/api/kpis/periods/";
const KPI_SUMMARY_ENDPOINT = "/api/kpis/summaries/";

function toList<T>(data: T[] | PaginatedResponse<T>): T[] {
  return getListData<T>(data);
}

export const kpiRankingApi = {
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

  getRanking: async (params: KpiRankingParams): Promise<KpiRankingResponse> => {
    const response = await api.get<KpiRankingResponse>(
      `${KPI_SUMMARY_ENDPOINT}ranking/`,
      {
        params: cleanParams({
          profile_code: "SA",
          ...params,
        }),
      }
    );

    return response.data;
  },
};
