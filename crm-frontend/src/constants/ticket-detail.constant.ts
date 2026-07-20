import { TicketStatusCode } from "@/types/ticket.type";

export const TICKET_STATUS_LABELS: Record<TicketStatusCode, string> = {
  CREATED: "Mở",
  ACCEPTED: "Tiếp nhận",
  PROCESSING: "Đang xử lý",
  DONE_WAIT_CLOSE: "Đã xong",
  PENDING_CLOSE: "Chờ đóng",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
};

/** Các bước của thanh tiến trình (theo thứ tự vòng đời ticket). */
export const TICKET_STATUS_FLOW: TicketStatusCode[] = [
  "CREATED",
  "ACCEPTED",
  "PROCESSING",
  "DONE_WAIT_CLOSE",
  "PENDING_CLOSE",
  "CLOSED",
];

export const TICKET_STATUS_PILL: Record<TicketStatusCode, string> = {
  CREATED: "bg-slate-100 text-slate-600",
  ACCEPTED: "bg-sky-100 text-sky-700",
  PROCESSING: "bg-violet-100 text-violet-700",
  DONE_WAIT_CLOSE: "bg-teal-100 text-teal-700",
  PENDING_CLOSE: "bg-amber-100 text-amber-700",
  CLOSED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

/** Danh sách chọn trong modal/inline cập nhật tình trạng. */
export const TICKET_STATUS_OPTIONS: {
  value: TicketStatusCode;
  label: string;
}[] = [
  { value: "CREATED", label: "Mở" },
  { value: "ACCEPTED", label: "Tiếp nhận" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "DONE_WAIT_CLOSE", label: "Đã xong" },
  { value: "PENDING_CLOSE", label: "Chờ đóng" },
  { value: "CLOSED", label: "Đã đóng" },
];
