import api from "@/apis/axios-client";
import { getListData } from "@/utils/response.util";
import { SlaSelectOption } from "@/types/sla.type";

/** Một lý do vượt SLA trong danh mục (bảng sla_breach_reasons). */
export type SlaBreachReasonOption = {
  id: number;
  reason_code?: string;
  reason_name?: string;
};

/**
 * Master data dùng để đổ dropdown nên phải lấy HẾT, không phân trang.
 * Backend mặc định 20 dòng/trang → thiếu là dropdown mất lựa chọn.
 */
const PAGE_SIZE = 1000;

async function fetchAll<T = unknown>(path: string): Promise<T[]> {
  const response = await api.get(path, { params: { page_size: PAGE_SIZE } });
  return getListData<T>(response.data);
}

export const masterDataApi = {
  getBranches: () => fetchAll("/api/master-data/branches/"),

  getEmployees: () => fetchAll("/api/master-data/employees/"),

  getTicketStatuses: () => fetchAll("/api/master-data/ticket-statuses/"),

  getTicketPriorities: () => fetchAll("/api/master-data/ticket-priorities/"),

  getTicketSources: () => fetchAll("/api/master-data/ticket-sources/"),

  getTicketCategories: (): Promise<SlaSelectOption[]> =>
    fetchAll<SlaSelectOption>("/api/master-data/ticket-categories/"),

  getTicketClassifications: () =>
    fetchAll("/api/master-data/ticket-classifications/"),

  getProcessingUnits: (): Promise<SlaSelectOption[]> =>
    fetchAll<SlaSelectOption>("/api/master-data/processing-units/"),

  getSlaPolicies: () => fetchAll("/api/master-data/sla-policies/"),

  getSlaBreachReasons: (): Promise<SlaBreachReasonOption[]> =>
    fetchAll<SlaBreachReasonOption>("/api/master-data/sla-breach-reasons/"),
};

export const masterDataService = masterDataApi;
