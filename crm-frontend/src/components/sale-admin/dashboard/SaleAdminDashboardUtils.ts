import { SaAdminOverviewMetric } from "@/types/sale-admin-dashboard.type";

export const SA_DASHBOARD_COLORS = {
  primary: "#10b981",
  primarySoft: "#ecfdf5",
  slate: "#64748b",
  slateSoft: "#f8fafc",
  green: "#10b981",
  greenSoft: "#ecfdf5",
  amber: "#f59e0b",
  amberSoft: "#fffbeb",
  purple: "#8b5cf6",
  purpleSoft: "#f5f3ff",
  red: "#ef4444",
  redSoft: "#fef2f2",
  orange: "#f97316",
  orangeSoft: "#fff7ed",
};

export const CHART_COLORS = [
  SA_DASHBOARD_COLORS.primary,
  SA_DASHBOARD_COLORS.green,
  SA_DASHBOARD_COLORS.amber,
  SA_DASHBOARD_COLORS.purple,
  SA_DASHBOARD_COLORS.orange,
  SA_DASHBOARD_COLORS.slate,
];

export function toNumber(value?: string | number | null) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatNumber(value?: string | number | null) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatCompactNumber(value?: string | number | null) {
  const numberValue = toNumber(value);

  if (Math.abs(numberValue) >= 1_000_000_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(numberValue / 1_000_000_000)}B`;
  }

  if (Math.abs(numberValue) >= 1_000_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(numberValue / 1_000_000)}M`;
  }

  if (Math.abs(numberValue) >= 1_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(numberValue / 1_000)}K`;
  }

  return formatNumber(numberValue);
}

export function formatMoney(value?: string | number | null) {
  const numberValue = toNumber(value);

  if (!numberValue) return "0 VND";

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(numberValue)} VND`;
}

export function formatCompactMoney(value?: string | number | null) {
  const numberValue = toNumber(value);
  if (!numberValue) return "0";
  return formatCompactNumber(numberValue);
}

export function formatMetricValue(metric: SaAdminOverviewMetric) {
  if (metric.unit === "VND") return formatMoney(metric.value);
  return formatNumber(metric.value);
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function getGrowthClass(value?: number | null) {
  if (value === null || value === undefined) return "bg-slate-100 text-slate-500 ring-slate-200";
  if (value > 0) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (value < 0) return "bg-red-50 text-red-600 ring-red-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function getMaxValue(values: Array<string | number | null | undefined>) {
  return Math.max(1, ...values.map((value) => toNumber(value)));
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

export function formatDateLabel(value?: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function isFullMonthRange(dateFrom?: string, dateTo?: string) {
  if (!dateFrom || !dateTo) return false;

  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;

  const firstDay = from.getDate() === 1;
  const lastDay = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();

  return firstDay && sameMonth && to.getDate() === lastDay;
}

export function getDateRangeLabel(dateFrom?: string, dateTo?: string, fallback?: string | null) {
  if (dateFrom && dateTo) {
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);

    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      const isFromStart = from.getDate() === 1;
      const isToEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).getDate() === 1;

      if (isFromStart && isToEnd) {
        if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
          return `T${from.getMonth() + 1}/${from.getFullYear()}`;
        }
        return `T${from.getMonth() + 1}/${from.getFullYear()} - T${to.getMonth() + 1}/${to.getFullYear()}`;
      }

      return `${formatDateLabel(dateFrom)} - ${formatDateLabel(dateTo)}`;
    }
  }

  if (fallback) return fallback;
  return "-";
}

export function getPeriodLabel(month?: string | number, year?: string | number) {
  if (!month || !year) return "-";
  return `T${Number(month)}/${year}`;
}

export function getPreviousPeriodLabel(month?: string | number, year?: string | number) {
  if (!month || !year) return "Kỳ trước";
  const date = new Date(Number(year), Number(month) - 2, 1);
  return `T${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function getMetricTheme(key: string) {
  const normalized = key.toLowerCase();

  if (normalized.includes("call")) {
    return {
      icon: "phone",
      border: "border-emerald-100",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100 text-[#059669]",
      value: "text-slate-900",
      accent: "bg-[#10b981]",
    };
  }

  if (normalized.includes("activated") || normalized.includes("reactivated")) {
    return {
      icon: "refresh",
      border: "border-emerald-100",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100 text-emerald-600",
      value: "text-slate-900",
      accent: "bg-emerald-500",
    };
  }

  if (normalized.includes("value") || normalized.includes("amount")) {
    return {
      icon: "dollar",
      border: "border-amber-100",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100 text-amber-600",
      value: "text-slate-900",
      accent: "bg-amber-500",
    };
  }

  return {
    icon: "trend",
    border: "border-violet-100",
    bg: "bg-violet-50",
    iconBg: "bg-violet-100 text-violet-600",
    value: "text-slate-900",
    accent: "bg-violet-500",
  };
}
