import { OutcomeCode } from "@/types/chatbot-dashboard.type";

export const CHATBOT_TICKET_STATUS_OPTIONS: {
  value: OutcomeCode;
  label: string;
}[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "BOT_DONE", label: "Chatbot tự xử lý" },
  { value: "CCC", label: "Chuyển CCC xử lý" },
  { value: "PENDING", label: "Chờ thông tin khách hàng" },
  { value: "SPAM", label: "Câu hỏi rác" },
  { value: "TOPIC", label: "Có chủ đề (Chatbot + CCC)" },
];

/** Màu của từng nhóm xử lý, dùng chung cho pill và biểu đồ cột. */
export const OUTCOME_STYLES: Record<
  string,
  { pill: string; bar: string }
> = {
  BOT_DONE: {
    pill: "bg-emerald-100 text-emerald-700",
    bar: "from-emerald-500 to-emerald-400",
  },
  CCC: {
    pill: "bg-amber-100 text-amber-700",
    bar: "from-amber-500 to-orange-400",
  },
  PENDING: {
    pill: "bg-sky-100 text-sky-700",
    bar: "from-sky-500 to-cyan-400",
  },
  SPAM: {
    pill: "bg-rose-100 text-rose-700",
    bar: "from-rose-500 to-rose-400",
  },
};

export const DEFAULT_OUTCOME_STYLE = {
  pill: "bg-slate-100 text-slate-600",
  bar: "from-slate-400 to-slate-300",
};

/**
 * Màu pill theo NHÃN trạng thái ticket chatbot (status_label từ backend).
 *
 * Backend trả nhãn tiếng Việt nên map theo nhãn. "Mở" tô đỏ đậm vì đó là
 * ticket chưa ai tiếp nhận — thứ cần chú ý nhất trong danh sách.
 */
export const TICKET_STATUS_PILL: Record<string, string> = {
  Mở: "bg-rose-600 text-white",
  "Tiếp nhận": "bg-sky-100 text-sky-700",
  "Đang xử lý": "bg-violet-100 text-violet-700",
  "Đã xong": "bg-teal-100 text-teal-700",
  "Chờ đóng": "bg-orange-100 text-orange-700",
  "Đã đóng": "bg-emerald-100 text-emerald-700",
};

export const DEFAULT_TICKET_STATUS_PILL = "bg-slate-100 text-slate-600";

/** Class pill cho một nhãn trạng thái, có fallback khi gặp nhãn lạ. */
export function ticketStatusPillClass(label?: string | null): string {
  return (
    (label && TICKET_STATUS_PILL[label]) || DEFAULT_TICKET_STATUS_PILL
  );
}
