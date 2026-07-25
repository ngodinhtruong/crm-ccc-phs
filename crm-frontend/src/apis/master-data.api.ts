import api from "@/apis/axios-client";
import { SlaSelectOption } from "@/types/sla.type";
import {
  MembershipResponsibilityOption,
  UserOrganizationUnitOption,
} from "@/types/user.type";
import { cleanParams } from "@/utils/api-param.util";
import { getListData } from "@/utils/response.util";

/** Một lý do vượt SLA trong danh mục (bảng sla_breach_reasons). */
export type SlaBreachReasonOption = {
  id: number;
  reason_code?: string;
  reason_name?: string;
};

/**
 * Master data dùng để đổ dropdown nên phải lấy HẾT, không phân trang.
 * Backend mặc định phân trang, vì vậy luôn gửi page_size đủ lớn.
 */
const PAGE_SIZE = 1000;

async function fetchAll<T = unknown>(
  path: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const response = await api.get(path, {
    params: cleanParams({
      page_size: PAGE_SIZE,
      ...params,
    }),
  });

  return getListData<T>(response.data);
}

export const masterDataApi = {
  getBranches: () => fetchAll("/api/master-data/branches/"),

  getEmployees: (params: Record<string, unknown> = {}) =>
    fetchAll("/api/master-data/employees/", params),

  getOrganizationUnits: (
    params: {
      branch?: number | string;
      parent?: number | string;
      unit_type?: string;
      is_active?: boolean | string;
      is_ticket_assignable?: boolean | string;
      roots_only?: boolean | string;
      q?: string;
    } = {}
  ): Promise<UserOrganizationUnitOption[]> =>
    fetchAll<UserOrganizationUnitOption>(
      "/api/master-data/organization-units/",
      params
    ),

  getMembershipResponsibilityChoices: async (): Promise<
    MembershipResponsibilityOption[]
  > => {
    const response = await api.get<MembershipResponsibilityOption[]>(
      "/api/master-data/employee-organization-memberships/responsibility-choices/"
    );

    return response.data;
  },

  getTicketStatuses: () => fetchAll("/api/master-data/ticket-statuses/"),

  getTicketPriorities: () => fetchAll("/api/master-data/ticket-priorities/"),

  getTicketSources: () => fetchAll("/api/master-data/ticket-sources/"),

  getTicketCategories: (): Promise<SlaSelectOption[]> =>
    fetchAll<SlaSelectOption>("/api/master-data/ticket-categories/"),

  getTicketClassifications: () =>
    fetchAll("/api/master-data/ticket-classifications/"),

  // Alias API cũ vẫn được backend giữ trong giai đoạn chuyển đổi.
  getProcessingUnits: (): Promise<SlaSelectOption[]> =>
    fetchAll<SlaSelectOption>("/api/master-data/processing-units/"),

  getSlaPolicies: () => fetchAll("/api/master-data/sla-policies/"),

  getSlaBreachReasons: (): Promise<SlaBreachReasonOption[]> =>
    fetchAll<SlaBreachReasonOption>("/api/master-data/sla-breach-reasons/"),
};

export const masterDataService = masterDataApi;
