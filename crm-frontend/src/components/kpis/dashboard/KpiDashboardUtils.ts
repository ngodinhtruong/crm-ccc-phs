import { KpiGateDashboardStatus, KpiProgressStatus } from "@/types/kpi-dashboard.type";

export function formatNumber(value?: string | number | null, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getProgressColorClass(status: KpiProgressStatus) {
  if (status === "GREEN") return "bg-emerald-500";
  if (status === "YELLOW") return "bg-amber-400";
  if (status === "RED") return "bg-red-500";
  return "bg-slate-300";
}

export function getProgressBadgeClass(status: KpiProgressStatus) {
  if (status === "GREEN") return "bg-emerald-100 text-emerald-700";
  if (status === "YELLOW") return "bg-amber-100 text-amber-700";
  if (status === "RED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

export function getProgressLabel(status: KpiProgressStatus) {
  if (status === "GREEN") return "Đạt";
  if (status === "YELLOW") return "Cần bám sát";
  if (status === "RED") return "Rủi ro";
  return "Chưa có dữ liệu";
}

export function getGateBadgeClass(status: KpiGateDashboardStatus) {
  if (status === "PASSED") return "bg-emerald-100 text-emerald-700";
  if (status === "RISK") return "bg-amber-100 text-amber-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

export function getGateStatusLabel(status: KpiGateDashboardStatus) {
  if (status === "PASSED") return "Đã đạt";
  if (status === "RISK") return "Đang có nguy cơ";
  if (status === "FAILED") return "Chưa đạt";
  return "Chưa có dữ liệu";
}

export function getFrequencyLabel(value?: string | null) {
  if (value === "DAILY") return "Ngày";
  if (value === "WEEKLY") return "Tuần";
  if (value === "MONTHLY") return "Tháng";
  if (value === "QUARTERLY") return "Quý";
  if (value === "HALF_YEARLY") return "6 tháng";
  if (value === "YEARLY") return "Năm";
  if (value === "ON_EVENT") return "Khi phát sinh";

  return value || "-";
}

export function getUnitLabel(value?: string | null) {
  if (value === "COUNT") return "Số lượng";
  if (value === "PERCENT") return "%";
  if (value === "VND") return "VND";

  return value || "-";
}
