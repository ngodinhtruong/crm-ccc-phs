import { ExternalErrorClassificationStatus, ExternalErrorTypeCode } from "@/types/external-error.type";

export const EXTERNAL_ERROR_TYPE_OPTIONS = [
  { value: "ORDER", label: "Lệnh Đặt" },
  { value: "LOGIN", label: "Đăng Nhập" },
  { value: "DISPLAY", label: "Hiển Thị" },
  { value: "EKYC_ACCOUNT", label: "eKYC / Tài Khoản" },
  { value: "PORTAL_SYSTEM", label: "Portal / Hệ Thống" },
  { value: "TRANSFER_PAYMENT", label: "Chuyển Khoản / Thanh Toán" },
  { value: "COMPLAINT", label: "Khiếu Nại" },
  { value: "SPECIAL", label: "Đặc Biệt" },
];

export const CLASSIFICATION_STATUS_OPTIONS = [
  { value: "UNCLASSIFIED", label: "Chưa phân loại" },
  { value: "CLASSIFIED", label: "Đã phân loại" },
  { value: "NEED_REVIEW", label: "Cần kiểm tra" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "FAILED", label: "Lỗi phân loại" },
];

export const CHART_COLORS = [
  "#0097cf",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#64748b",
  "#ec4899",
];

export function formatNumber(value?: number | string | null, digits = 0) {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export function formatPercent(value?: number | string | null) {
  return `${formatNumber(value, 1)}%`;
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getErrorTypeLabel(value?: ExternalErrorTypeCode | string | null) {
  if (!value) return "-";
  return EXTERNAL_ERROR_TYPE_OPTIONS.find((item) => item.value === value)?.label || value;
}

export function getClassificationStatusLabel(value?: ExternalErrorClassificationStatus | string | null) {
  if (!value) return "-";
  return CLASSIFICATION_STATUS_OPTIONS.find((item) => item.value === value)?.label || value;
}

export function toChartValue(value?: number | string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function truncateText(value?: string | null, max = 80) {
  const text = String(value || "").trim();
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
