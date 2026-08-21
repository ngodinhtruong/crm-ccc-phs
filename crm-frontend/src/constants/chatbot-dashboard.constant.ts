import { GranularityChoice, OutcomeCode } from "@/types/chatbot-dashboard.type";

/** Nhãn của mọi mốc, kể cả mốc không có nút bấm (ngày/tuần). */
export const GRANULARITY_LABELS: Record<GranularityChoice, string> = {
  auto: "Tự động",
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
  quarter: "Quý",
  year: "Năm",
};

/**
 * Nút chọn mốc trên thanh công cụ — chỉ ba mốc dài kỳ.
 *
 * Ngày và tuần vẫn chạy bình thường nhưng chỉ đến từ bộ lọc nâng cao: người
 * dùng chọn khoảng nào thì backend tự suy mốc theo khoảng đó. Không mở nút
 * riêng để tránh bấm "Ngày" trên khoảng 2 năm rồi ra 700 cột.
 */
const GRANULARITY_BUTTONS: GranularityChoice[] = ["month", "quarter", "year"];

export const GRANULARITY_OPTIONS = GRANULARITY_BUTTONS.map((key) => ({
  key,
  label: GRANULARITY_LABELS[key],
}));

export const CHATBOT_TICKET_STATUS_OPTIONS: {
  value: OutcomeCode;
  label: string;
}[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "BOT_DONE", label: "Chatbot tự xử lý" },
  { value: "CCC", label: "Chuyển CCC xử lý" },
  { value: "RESEARCH", label: "Phân tích / khuyến nghị" },
  { value: "PENDING", label: "Chờ thông tin khách hàng" },
  { value: "SPAM", label: "Câu hỏi rác" },
  { value: "TOPIC", label: "Có chủ đề (Chatbot + CCC)" },
];

export const CHANNEL_OPTIONS = [
  { value: "xpro", label: "XPro" },
  { value: "zalo", label: "Zalo" },
  { value: "website", label: "Website" },
  { value: "mobile", label: "Mobile" },
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
  RESEARCH: {
    pill: "bg-violet-100 text-violet-700",
    bar: "from-violet-500 to-violet-400",
  },
  PENDING: {
    pill: "bg-sky-100 text-sky-700",
    bar: "from-sky-500 to-cyan-400",
  },
  SPAM: {
    pill: "bg-rose-100 text-rose-700",
    bar: "from-rose-500 to-rose-400",
  },
  // Xám trung tính: đây là lỗ hổng dữ liệu, không phải một kết quả xử lý.
  UNCLASSIFIED: {
    pill: "bg-slate-200 text-slate-700",
    bar: "from-slate-400 to-slate-300",
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
  "Đã xong (chờ đóng)": "bg-teal-100 text-teal-700",
  "Đã đóng": "bg-emerald-100 text-emerald-700",
  "Đã hủy": "bg-rose-100 text-rose-700",

  // Nhãn cũ: lịch sử ticket lưu chuỗi nhãn tại thời điểm đổi trạng thái, nên
  // các dòng ghi trước khi đổi tên vẫn cần tô đúng màu.
  "Đã xong": "bg-teal-100 text-teal-700",
  "Chờ đóng": "bg-orange-100 text-orange-700",
};

export const DEFAULT_TICKET_STATUS_PILL = "bg-slate-100 text-slate-600";

/** Class pill cho một nhãn trạng thái, có fallback khi gặp nhãn lạ. */
export function ticketStatusPillClass(label?: string | null): string {
  return (
    (label && TICKET_STATUS_PILL[label]) || DEFAULT_TICKET_STATUS_PILL
  );
}
