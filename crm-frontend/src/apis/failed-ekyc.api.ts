import api from "@/apis/axios-client";
import { cleanParams } from "@/utils/api-param.util";
import { PaginatedResponse } from "@/types/customer.type";
import { FailedEkycDashboardData, FailedEkycImportResponse, FailedEkycListParams, FailedEkycPayload, FailedEkycRecord } from "@/types/failed-ekyc.type";

const base = "/api/failed-ekyc/records/";
function saveBlob(data: BlobPart, filename: string) { const url = URL.createObjectURL(new Blob([data])); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

export const failedEkycApi = {
  async getRecords(params: FailedEkycListParams = {}) { return (await api.get<PaginatedResponse<FailedEkycRecord>>(base, { params: cleanParams(params) })).data; },
  async createRecord(payload: FailedEkycPayload) { return (await api.post<FailedEkycRecord>(base, payload)).data; },
  async updateRecord(id: number, payload: Partial<FailedEkycPayload>) { return (await api.patch<FailedEkycRecord>(`${base}${id}/`, payload)).data; },
  async deleteRecord(id: number) { await api.delete(`${base}${id}/`); },
  async lookupCustomer(account_number: string) { return (await api.get(`${base}lookup-customer/`, { params: { account_number } })).data; },
  async getDashboard(params: FailedEkycListParams = {}) { return (await api.get<FailedEkycDashboardData>(`${base}dashboard/`, { params: cleanParams(params) })).data; },
  async importExcel(file: File) { const body = new FormData(); body.append("file", file); return (await api.post<FailedEkycImportResponse>(`${base}import-excel/`, body)).data; },
  async downloadTemplate() { const res = await api.get(`${base}download-template/`, { responseType: "blob" }); saveBlob(res.data, "Failed_eKYC_Import_Template.xlsx"); },
  async exportExcel(params: FailedEkycListParams = {}) { const res = await api.get(`${base}export-excel/`, { params: cleanParams(params), responseType: "blob" }); saveBlob(res.data, `Failed_eKYC_Export_${Date.now()}.xlsx`); },
};
