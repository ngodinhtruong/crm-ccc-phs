import { ChatbotMessage, PaginatedResponse } from "@/types/chatbot-dashboard.type";

export type { PaginatedResponse };

/** Trạng thái xử lý của ticket chatbot (workflow CCC). */
export type ChatbotTicketStatus =
  | "CHO_TIEP_NHAN"
  | "TIEP_NHAN"
  | "CHUYEN_PHONG_BAN"
  | "DANG_XU_LY"
  | "DA_XONG"
  | "CHO_HUY";

export type ChatbotTicketLinkStatus = "LINKED" | "UNLINKED";

/** Một ticket sinh ra từ chatbot. Khớp với TicketChatbotSerializer bên Django. */
export type ChatbotTicket = {
  id: number;

  ticket_code: string;
  title?: string | null;
  source_ref_id?: string | null;

  contact_info?: string | null;
  contact_type?: string | null;
  phone?: string | null;
  email?: string | null;
  account_number?: string | null;

  customer?: number | null;
  customer_account?: number | null;
  customer_name?: string | null;
  link_status: ChatbotTicketLinkStatus;
  link_status_label?: string | null;

  dashboard_category?: string | null;
  category_label?: string | null;
  reason?: string | null;
  request_content?: string | null;
  full_conversation?: string | null;
  handling_solution?: string | null;

  status: ChatbotTicketStatus;
  status_label?: string | null;
  channel?: string | null;

  owner_user?: number | null;
  owner_username?: string | null;
  assigned_employee?: number | null;
  assigned_employee_name?: string | null;
  assigned_employee_department?: string | null;
  handling_branch?: number | null;
  handling_branch_name?: string | null;
  assigned_unit?: number | null;
  assigned_unit_name?: string | null;

  sla_policy?: number | null;
  sla_policy_name?: string | null;
  priority?: number | null;
  priority_name?: string | null;
  send_survey?: boolean;

  accepted_at?: string | null;
  done_at?: string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type OptionItem = { id: number; name: string };
export type StatusOption = { value: ChatbotTicketStatus; label: string };

export type ChatbotTicketOptions = {
  statuses: StatusOption[];
  sla_policies: OptionItem[];
  priorities: OptionItem[];
  branches: OptionItem[];
  units: OptionItem[];
  users: OptionItem[];
};

/** Payload cập nhật ticket từ modal 'Cập nhật tình trạng'. */
export type ChatbotTicketUpdatePayload = {
  status?: ChatbotTicketStatus;
  owner_user?: number | null;
  assigned_unit?: number | null;
  handling_branch?: number | null;
  sla_policy?: number | null;
  priority?: number | null;
  send_survey?: boolean;
  handling_solution?: string;
};

export type ChatbotTicketDetail = {
  ticket: ChatbotTicket;
  messages: ChatbotMessage[];
};

export type ChatbotTicketListParams = {
  status?: ChatbotTicketStatus | "";
  link_status?: ChatbotTicketLinkStatus | "";
  mine?: boolean;
  unassigned?: boolean;
  q?: string;
  page?: number;
  page_size?: number;
};
