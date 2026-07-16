import { ChatbotTicketStatus } from "@/types/chatbot-ticket.type";

export const CHATBOT_TICKET_STATUS_LABELS: Record<
  ChatbotTicketStatus,
  string
> = {
  CHO_TIEP_NHAN: "Chờ tiếp nhận",
  TIEP_NHAN: "Tiếp nhận",
  CHUYEN_PHONG_BAN: "Chuyển phòng ban",
  DANG_XU_LY: "Đang xử lý",
  DA_XONG: "Đã xong (Chờ đóng)",
  CHO_HUY: "Chờ hủy",
};

/** Bộ lọc trạng thái ở màn danh sách. */
export const CHATBOT_TICKET_STATUS_FILTER: {
  value: ChatbotTicketStatus | "";
  label: string;
}[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "CHO_TIEP_NHAN", label: "Chờ tiếp nhận" },
  { value: "TIEP_NHAN", label: "Tiếp nhận" },
  { value: "CHUYEN_PHONG_BAN", label: "Chuyển phòng ban" },
  { value: "DANG_XU_LY", label: "Đang xử lý" },
  { value: "DA_XONG", label: "Đã xong (Chờ đóng)" },
  { value: "CHO_HUY", label: "Chờ hủy" },
];

/** Các bước của thanh tiến trình (theo thứ tự), giống ảnh giao diện ticket. */
export const CHATBOT_TICKET_FLOW: ChatbotTicketStatus[] = [
  "TIEP_NHAN",
  "CHUYEN_PHONG_BAN",
  "DANG_XU_LY",
  "DA_XONG",
];

/** Màu pill cho từng trạng thái. */
export const CHATBOT_TICKET_STATUS_PILL: Record<ChatbotTicketStatus, string> = {
  CHO_TIEP_NHAN: "bg-slate-100 text-slate-600",
  TIEP_NHAN: "bg-sky-100 text-sky-700",
  CHUYEN_PHONG_BAN: "bg-indigo-100 text-indigo-700",
  DANG_XU_LY: "bg-violet-100 text-violet-700",
  DA_XONG: "bg-emerald-100 text-emerald-700",
  CHO_HUY: "bg-rose-100 text-rose-700",
};

/** Nút hành động đổi trạng thái ở trang chi tiết (giống cột nút bên phải trong ảnh). */
export const CHATBOT_TICKET_ACTIONS: {
  status: ChatbotTicketStatus;
  label: string;
  className: string;
}[] = [
  {
    status: "TIEP_NHAN",
    label: "Tiếp nhận",
    className: "bg-sky-500 hover:bg-sky-600",
  },
  {
    status: "CHUYEN_PHONG_BAN",
    label: "Chuyển phòng ban",
    className: "bg-indigo-500 hover:bg-indigo-600",
  },
  {
    status: "DANG_XU_LY",
    label: "Đang xử lý",
    className: "bg-violet-500 hover:bg-violet-600",
  },
  {
    status: "DA_XONG",
    label: "Đã xong",
    className: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    status: "CHO_HUY",
    label: "Chờ hủy",
    className: "bg-rose-500 hover:bg-rose-600",
  },
];
