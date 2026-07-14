import { SaAdminOverviewMetric } from "@/types/sale-admin-dashboard.type";

export function formatNumber(value?: string | number | null) {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(numberValue);
}

export function formatMoney(value?: string | number | null) {
  const numberValue = Number(value || 0);

  if (!numberValue) return "0 VND";

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(numberValue)} VND`;
}

export function formatMetricValue(metric: SaAdminOverviewMetric) {
  if (metric.unit === "VND") return formatMoney(metric.value);
  return formatNumber(metric.value);
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function getGrowthClass(value?: number | null) {
  if (value === null || value === undefined) return "bg-slate-100 text-slate-500";
  if (value > 0) return "bg-emerald-100 text-emerald-700";
  if (value < 0) return "bg-red-100 text-red-600";
  return "bg-slate-100 text-slate-600";
}

export function getMaxValue(values: Array<string | number | null | undefined>) {
  return Math.max(1, ...values.map((value) => Number(value || 0)));
}

export function getBarWidth(value: string | number | null | undefined, maxValue: number) {
  const numberValue = Number(value || 0);
  if (!numberValue || !maxValue) return "0%";
  return `${Math.min(100, Math.max(2, (numberValue / maxValue) * 100))}%`;
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
