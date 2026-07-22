import type {
  ExternalErrorClassificationStatus,
} from "@/types/external-error.type";

export type ExternalErrorFilterOption = {
  label: string;
  value: string;
};

/**
 * Bảng màu dùng chung cho biểu đồ lỗi bên ngoài.
 */
export const CHART_COLORS = [
  "#0284c7",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#4f46e5",
  "#64748b",
] as const;

export const CLASSIFICATION_STATUS_LABEL: Record<
  ExternalErrorClassificationStatus,
  string
> = {
  UNCLASSIFIED: "Chưa phân loại",
  CLASSIFIED: "Đã phân loại",
  NEED_REVIEW: "Cần kiểm tra",
  CONFIRMED: "Đã xác nhận",
  FAILED: "Lỗi phân loại",
};

/**
 * Giữ tương thích với ExternalErrorDashboardPage.tsx hiện tại.
 */
export const CLASSIFICATION_STATUS_OPTIONS: ExternalErrorFilterOption[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "UNCLASSIFIED", label: "Chưa phân loại" },
  { value: "CLASSIFIED", label: "Đã phân loại" },
  { value: "NEED_REVIEW", label: "Cần kiểm tra" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "FAILED", label: "Lỗi phân loại" },
];

/**
 * Danh sách fallback để dashboard cũ tiếp tục hoạt động.
 *
 * Trang quản lý danh mục và luồng phân loại mới vẫn đọc nhóm/mã lỗi động
 * từ API. Constant này chỉ dành cho component dashboard cũ chưa được đổi
 * sang tải catalog từ backend.
 */
export const EXTERNAL_ERROR_TYPE_OPTIONS: ExternalErrorFilterOption[] = [
  { value: "", label: "Tất cả nhóm lỗi" },
  { value: "ORDER", label: "Lệnh Đặt" },
  { value: "LOGIN", label: "Đăng Nhập" },
  { value: "DISPLAY", label: "Hiển Thị" },
  { value: "EKYC_ACCOUNT", label: "eKYC / Tài Khoản" },
  { value: "PORTAL_SYSTEM", label: "Portal / Hệ Thống" },
  {
    value: "TRANSFER_PAYMENT",
    label: "Chuyển Khoản / Thanh Toán",
  },
  { value: "COMPLAINT", label: "Khiếu Nại" },
  { value: "SPECIAL", label: "Đặc Biệt" },
];

/**
 * Các option tương thích bổ sung cho những component dashboard/filter cũ.
 */
export const DATE_FIELD_OPTIONS: ExternalErrorFilterOption[] = [
  { value: "received_date", label: "Ngày nhận" },
  { value: "completed_date", label: "Ngày hoàn thành" },
];

export const NEED_REVIEW_OPTIONS: ExternalErrorFilterOption[] = [
  { value: "", label: "Tất cả" },
  { value: "true", label: "Cần kiểm tra" },
  { value: "false", label: "Không cần kiểm tra" },
];

export function toChartValue(
  value?: number | string | null,
  fallback = 0
): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numeric =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatNumber(
  value?: number | string | null,
  fallback = "0"
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numeric = toChartValue(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatPercent(
  value?: number | string | null,
  fractionDigits = 1
): string {
  if (value === null || value === undefined || value === "") {
    return "0%";
  }

  const numeric = toChartValue(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return "0%";
  }

  return `${numeric.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatConfidence(
  value?: number | string | null
): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return `${numeric.toFixed(2)}%`;
}

export function statusBadgeClass(
  status: ExternalErrorClassificationStatus
): string {
  switch (status) {
    case "CLASSIFIED":
      return "bg-sky-100 text-sky-700";
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-700";
    case "NEED_REVIEW":
      return "bg-amber-100 text-amber-700";
    case "FAILED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}