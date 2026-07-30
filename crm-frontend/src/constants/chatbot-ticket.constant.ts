import { ChatbotTicketStatus } from "@/types/chatbot-ticket.type";

export const CHATBOT_TICKET_STATUS_LABELS: Record<
  ChatbotTicketStatus,
  string
> = {
  CREATED: "Mở",
  ACCEPTED: "Tiếp nhận",
  PROCESSING: "Đang xử lý",
  DONE_WAIT_CLOSE: "Đã xong (chờ đóng)",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
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
  { value: "DONE_WAIT_CLOSE", label: "Đã xong (chờ đóng)" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "CANCELLED", label: "Đã hủy" },
];

/**
 * Các bước của thanh tiến trình (theo thứ tự vòng đời ticket).
 *
 * Không còn bước "Chờ đóng" riêng: ticket vào "Đã xong (chờ đóng)" là đã bắt
 * đầu đếm một tiếng, hết giờ job SLA tự chuyển sang "Đã đóng".
 *
 * Cố ý không có "Đã hủy": hủy là lối ra khỏi luồng chứ không phải một bước.
 */
export const CHATBOT_TICKET_FLOW: ChatbotTicketStatus[] = [
  "CREATED",
  "ACCEPTED",
  "PROCESSING",
  "DONE_WAIT_CLOSE",
  "CLOSED",
];

/** Màu pill cho từng trạng thái. */
export const CHATBOT_TICKET_STATUS_PILL: Record<ChatbotTicketStatus, string> = {
  CREATED: "bg-slate-100 text-slate-600",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  PROCESSING: "bg-violet-100 text-violet-700",
  DONE_WAIT_CLOSE: "bg-teal-100 text-teal-700",
  CLOSED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};
