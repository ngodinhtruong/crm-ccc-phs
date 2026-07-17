import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";
import {
  PaginatedResponse,
  SaCallResult,
  SaIcpGroup,
  SaInterestLevel,
  SaRecordItem,
  SaRecordListParams,
  SaRecordCreatePayload,
  SaRecordAuditLogItem,
  SaRecordUpdatePayload,
  SaCustomerAccountSuggestion,
  SaSelectOption,
} from "@/types/sale-admin.type";

const SA_RECORD_ENDPOINT = "/api/sale-admin/records/";
const SA_RECORD_AUDIT_LOG_ENDPOINT = "/api/sale-admin/record-audit-logs/";
const SA_CALL_RESULT_ENDPOINT = "/api/sale-admin/call-results/";
const SA_INTEREST_LEVEL_ENDPOINT = "/api/sale-admin/interest-levels/";
const SA_ICP_GROUP_ENDPOINT = "/api/sale-admin/icp-groups/";
const SA_ACCOUNT_SUGGESTION_ENDPOINT = "/api/sale-admin/customer-account-suggestions/";
const SA_ACCOUNT_STATUS_OPTION_ENDPOINT = "/api/sale-admin/account-status-options/";
const SA_VIP_CLASSIFICATION_OPTION_ENDPOINT = "/api/sale-admin/vip-classification-options/";

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

export const saleAdminApi = {
  getSaRecords: async (
    params: SaRecordListParams = {}
  ): Promise<PaginatedResponse<SaRecordItem>> => {
    const response = await api.get<PaginatedResponse<SaRecordItem> | SaRecordItem[]>(
      SA_RECORD_ENDPOINT,
      {
        params: cleanParams(params),
      }
    );



    return normalizePaginated(response.data);
  },

  getCallResults: async (): Promise<SaCallResult[]> => {
    const response = await api.get<SaCallResult[] | PaginatedResponse<SaCallResult>>(
      SA_CALL_RESULT_ENDPOINT
    );

    return getListData<SaCallResult>(response.data);
  },

  getInterestLevels: async (): Promise<SaInterestLevel[]> => {
    const response = await api.get<
      SaInterestLevel[] | PaginatedResponse<SaInterestLevel>
    >(SA_INTEREST_LEVEL_ENDPOINT);

    return getListData<SaInterestLevel>(response.data);
  },

  getIcpGroups: async (): Promise<SaIcpGroup[]> => {
    const response = await api.get<SaIcpGroup[] | PaginatedResponse<SaIcpGroup>>(
      SA_ICP_GROUP_ENDPOINT
    );

    return getListData<SaIcpGroup>(response.data);
  },

  searchCustomerAccounts: async (
    keyword: string
  ): Promise<SaCustomerAccountSuggestion[]> => {
    const response = await api.get<
      { count: number; results: SaCustomerAccountSuggestion[] } | SaCustomerAccountSuggestion[]
    >(SA_ACCOUNT_SUGGESTION_ENDPOINT, {
      params: cleanParams({ q: keyword }),
    });

    return getListData<SaCustomerAccountSuggestion>(response.data);
  },

  getAccountStatusOptions: async (): Promise<SaSelectOption[]> => {
    const response = await api.get<
      { count: number; results: SaSelectOption[] } | SaSelectOption[]
    >(SA_ACCOUNT_STATUS_OPTION_ENDPOINT);

    return getListData<SaSelectOption>(response.data);
  },

  getVipClassificationOptions: async (): Promise<SaSelectOption[]> => {
    const response = await api.get<
      { count: number; results: SaSelectOption[] } | SaSelectOption[]
    >(SA_VIP_CLASSIFICATION_OPTION_ENDPOINT);

    return getListData<SaSelectOption>(response.data);
  },
  createSaRecord: async (
    payload: SaRecordCreatePayload
  ): Promise<SaRecordItem> => {
    const response = await api.post<SaRecordItem>(
      SA_RECORD_ENDPOINT,
      payload
    );

    return response.data;
  },
  getSaRecord: async (id: number | string): Promise<SaRecordItem> => {
    const response = await api.get<SaRecordItem>(
      `${SA_RECORD_ENDPOINT}${id}/`
    );

    return response.data;
  },

  updateSaRecord: async (
    id: number | string,
    payload: SaRecordUpdatePayload
  ): Promise<SaRecordItem> => {
    const response = await api.patch<SaRecordItem>(
      `${SA_RECORD_ENDPOINT}${id}/`,
      payload
    );

    return response.data;
  },

  getSaRecordAuditLogs: async (
    saRecordId: number | string
  ): Promise<SaRecordAuditLogItem[]> => {
    const response = await api.get<
      SaRecordAuditLogItem[] | PaginatedResponse<SaRecordAuditLogItem>
    >(SA_RECORD_AUDIT_LOG_ENDPOINT, {
      params: {
        sa_record: saRecordId,
      },
    });

    return getListData<SaRecordAuditLogItem>(response.data);
  },
};

export const saleAdminService = saleAdminApi;