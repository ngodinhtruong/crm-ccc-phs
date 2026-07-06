import api from "./api";

export const masterDataService = {
  getBranches: async () => {
    const response = await api.get("/api/master-data/branches/");
    return response.data;
  },

  getEmployees: async () => {
    const response = await api.get("/api/master-data/employees/");
    return response.data;
  },

  getTicketStatuses: async () => {
    const response = await api.get("/api/master-data/ticket-statuses/");
    return response.data;
  },

  getTicketPriorities: async () => {
    const response = await api.get("/api/master-data/ticket-priorities/");
    return response.data;
  },

  getTicketSources: async () => {
    const response = await api.get("/api/master-data/ticket-sources/");
    return response.data;
  },

  getTicketCategories: async () => {
    const response = await api.get("/api/master-data/ticket-categories/");
    return response.data;
  },

  getTicketClassifications: async () => {
    const response = await api.get("/api/master-data/ticket-classifications/");
    return response.data;
  },

  getSlaPolicies: async () => {
    const response = await api.get("/api/master-data/sla-policies/");
    return response.data;
  },

  getSlaBreachReasons: async () => {
    const response = await api.get("/api/master-data/sla-breach-reasons/");
    return response.data;
  },
};