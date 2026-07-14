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
