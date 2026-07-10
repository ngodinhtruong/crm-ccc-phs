import api from "@/apis/axios-client";
import { getListData } from "@/utils/response.util";
import { SlaSelectOption } from "@/types/sla.type";

export const masterDataApi = {
  getBranches: async () => {
    const response = await api.get("/api/master-data/branches/");
    return getListData(response.data);
  },

  getEmployees: async () => {
    const response = await api.get("/api/master-data/employees/");
    return getListData(response.data);
  },

  getTicketStatuses: async () => {
    const response = await api.get("/api/master-data/ticket-statuses/");
    return getListData(response.data);
  },

  getTicketPriorities: async () => {
    const response = await api.get("/api/master-data/ticket-priorities/");
    return getListData(response.data);
  },

  getTicketSources: async () => {
    const response = await api.get("/api/master-data/ticket-sources/");
    return getListData(response.data);
  },

  getTicketCategories: async (): Promise<SlaSelectOption[]> => {
    const response = await api.get("/api/master-data/ticket-categories/");
    return getListData<SlaSelectOption>(response.data);
  },

  getTicketClassifications: async () => {
    const response = await api.get("/api/master-data/ticket-classifications/");
    return getListData(response.data);
  },

  getProcessingUnits: async (): Promise<SlaSelectOption[]> => {
    const response = await api.get("/api/master-data/processing-units/");
    return getListData<SlaSelectOption>(response.data);
  },

  getSlaPolicies: async () => {
    const response = await api.get("/api/master-data/sla-policies/");
    return getListData(response.data);
  },

  getSlaBreachReasons: async () => {
    const response = await api.get("/api/master-data/sla-breach-reasons/");
    return getListData(response.data);
  },
};

export const masterDataService = masterDataApi;