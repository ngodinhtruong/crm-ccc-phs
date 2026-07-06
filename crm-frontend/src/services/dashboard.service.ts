import api from "./api";

export type DashboardOverviewItem = {
  key: string;
  label: string;
  value: number;
  href: string;
};

export type DashboardQuickSetting = {
  key: string;
  title: string;
  description: string;
  href: string;
  value: number;
  icon: string;
};

export type TicketStatusSummary = {
  current_status__status_code: string | null;
  current_status__status_name: string | null;
  count: number;
};

export type DashboardSummary = {
  overview: DashboardOverviewItem[];
  quick_settings: DashboardQuickSetting[];
  ticket_status_summary: TicketStatusSummary[];
};

export type HomeTicket = {
  id: number;
  ticket_code: string;
  branch_name: string;
  classification_name: string;
  company_name: string;
  status_name: string;
  description: string;
  source_name: string;
};

export type ChartItem = {
  label: string;
  count: number;
};

export type HomeDashboard = {
  latest_tickets: HomeTicket[];
  source_summary: ChartItem[];
  category_summary: ChartItem[];
  customer_type_summary: ChartItem[];
  total_tickets: number;
};

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get("/api/dashboard/summary/");
    return response.data;
  },

  getHome: async (): Promise<HomeDashboard> => {
    const response = await api.get("/api/dashboard/home/");
    return response.data;
  },
};