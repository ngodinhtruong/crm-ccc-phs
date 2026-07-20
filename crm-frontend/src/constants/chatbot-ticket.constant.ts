import { ChatbotTicketStatus } from "@/types/chatbot-ticket.type";

export const CHATBOT_TICKET_STATUS_LABELS: Record<
  ChatbotTicketStatus,
  string
> = {
  CREATED: "Mở",
  ACCEPTED: "Tiếp nhận",
  PROCESSING: "Đang xử lý",
  DONE_WAIT_CLOSE: "Đã xong",
  PENDING_CLOSE: "Chờ đóng",
  CLOSED: "Đã đóng",
};

/** Bộ lọc trạng thái ở màn danh sách. */
export const CHATBOT_TICKET_STATUS_FILTER: {
  value: ChatbotTicketStatus | "";
  label: string;
}[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "CREATED", label: "Mở" },
  { value: "ACCEPTED", label: "Tiếp nhận" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "DONE_WAIT_CLOSE", label: "Đã xong" },
  { value: "PENDING_CLOSE", label: "Chờ đóng" },
  { value: "CLOSED", label: "Đã đóng" },
];

/** Các bước của thanh tiến trình (theo thứ tự vòng đời ticket). */
export const CHATBOT_TICKET_FLOW: ChatbotTicketStatus[] = [
  "CREATED",
  "ACCEPTED",
  "PROCESSING",
  "DONE_WAIT_CLOSE",
  "PENDING_CLOSE",
  "CLOSED",
];

/** Màu pill cho từng trạng thái. */
export const CHATBOT_TICKET_STATUS_PILL: Record<ChatbotTicketStatus, string> = {
  CREATED: "bg-slate-100 text-slate-600",
  ACCEPTED: "bg-sky-100 text-sky-700",
  PROCESSING: "bg-violet-100 text-violet-700",
  DONE_WAIT_CLOSE: "bg-teal-100 text-teal-700",
  PENDING_CLOSE: "bg-amber-100 text-amber-700",
  CLOSED: "bg-emerald-100 text-emerald-700",
};
