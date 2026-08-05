import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import {
  CreateEkycPayload,
  EkycCustomerLookup,
  EkycDashboardData,
  EkycImportResponse,
  EkycListParams,
  EkycRecord,
} from "@/types/ekyc.type";
import { PaginatedResponse } from "@/types/customer.type";

export const ekycApi = {
  getRecords: async (
    params: EkycListParams = {}
  ): Promise<PaginatedResponse<EkycRecord>> => {
    const response = await api.get<PaginatedResponse<EkycRecord>>(
      "/api/ekyc/records/",
      {
        params: cleanParams(params),
      }
    );
    return response.data;
  },

  getRecordById: async (id: number): Promise<EkycRecord> => {
    const response = await api.get<EkycRecord>(`/api/ekyc/records/${id}/`);
    return response.data;
  },

  createRecord: async (payload: CreateEkycPayload): Promise<EkycRecord> => {
    const response = await api.post<EkycRecord>(
      "/api/ekyc/records/",
      payload
    );
    return response.data;
  },

  updateRecord: async (
    id: number,
    payload: Partial<CreateEkycPayload>
  ): Promise<EkycRecord> => {
    const response = await api.patch<EkycRecord>(
      `/api/ekyc/records/${id}/`,
      payload
    );
    return response.data;
  },

  deleteRecord: async (id: number): Promise<void> => {
    await api.delete(`/api/ekyc/records/${id}/`);
  },

  lookupCustomer: async (
    accountNumber: string
  ): Promise<EkycCustomerLookup> => {
    const response = await api.get<EkycCustomerLookup>(
      "/api/ekyc/records/lookup-customer/",
      {
        params: { account_number: accountNumber },
      }
    );
    return response.data;
  },

  getSuggestions: async (query: string): Promise<EkycCustomerLookup[]> => {
    const response = await api.get<EkycCustomerLookup[]>(
      "/api/ekyc/records/lookup-customer/",
      {
        params: { q: query },
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  importExcel: async (file: File): Promise<EkycImportResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<EkycImportResponse>(
      "/api/ekyc/records/import-excel/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  downloadTemplate: async (): Promise<void> => {
    const response = await api.get("/api/ekyc/records/download-template/", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "eKYC_Import_Template.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  getDashboard: async (
    params: {
      call_date_from?: string;
      call_date_to?: string;
      granularity?: string;
      compare_mode?: string;
    } = {}
  ): Promise<EkycDashboardData> => {
    const response = await api.get<EkycDashboardData>(
      "/api/ekyc/records/dashboard/",
      {
        params: cleanParams(params),
      }
    );
    return response.data;
  },

  exportExcel: async (params: EkycListParams = {}): Promise<void> => {
    const response = await api.get("/api/ekyc/records/export-excel/", {
      params: cleanParams(params),
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `eKYC_Export_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
