import {
  CccDashboardBranchChartItem,
  CccDashboardCategoryChartItem,
  CccDashboardRootCauseItem,
  CccDashboardSourceChartItem,
  CccDashboardStatusChartItem,
} from "@/types/ccc-dashboard.type";

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

export function formatPercent(value?: number | null) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value || 0)}%`;
}

export function formatDecimal(value?: number | null, maximumFractionDigits = 2) {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN").format(date);
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

export function formatDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined) return "-";

  if (minutes < 60) return `${Math.round(minutes)} phút`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours < 24) {
    return remainingMinutes
      ? `${hours} giờ ${remainingMinutes} phút`
      : `${hours} giờ`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours ? `${days} ngày ${remainingHours} giờ` : `${days} ngày`;
}

export function formatDays(value?: number | null) {
  if (value === null || value === undefined) return "-";

  if (value <= 0) return "0 phút";

  if (value < 1) {
    const totalMinutes = value * 24 * 60;
    if (totalMinutes < 60) {
      return `${Math.round(totalMinutes)} phút`;
    }
    const hours = value * 24;
    return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} giờ`;
  }

  return `${formatDecimal(value, 1)} ngày`;
}

export type SimpleChartItem = {
  key: string;
  label: string;
  count: number;
  percentage?: number | null;
};

export function categoryLabel(item: CccDashboardCategoryChartItem) {
  return item.support_category__category_name || "Chưa có danh mục";
}

export function sourceLabel(item: CccDashboardSourceChartItem) {
  return item.source__source_name || "Chưa có nguồn";
}

export function statusLabel(item: CccDashboardStatusChartItem) {
  return item.current_status__status_name || "Chưa có trạng thái";
}

export function branchLabel(item: CccDashboardBranchChartItem) {
  return item.handling_branch__branch_name || "Chưa có chi nhánh";
}

export function rootCauseLabel(item: CccDashboardRootCauseItem) {
  return item.name || item.error_type_name || item.error_group_name || "Chưa xác định";
}

export function toMonthLabel(value?: string | null) {
  if (!value) return "-";

  if (value.startsWith("Tháng")) return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return `Tháng ${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(item: {
  month_label?: string | null;
  period_label?: string | null;
  month_str?: string | null;
  month?: string | null;
}) {
  return item.month_label || item.period_label || toMonthLabel(item.month_str || item.month);
}

export function ensureFiniteNumber(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

export type ChartViewMode = "TREND_OVER_TIME" | "TOTAL_OVERALL";
export type GranularityMode = "MONTH" | "QUARTER" | "YEAR";
export type CompareMode = "NONE" | "YOY" | "QOQ";

export function parsePeriodDate(periodKey?: string | null): Date | null {
  if (!periodKey) return null;
  const match = String(periodKey).match(/(\d{4})[-/](\d{1,2})/);
  if (match) {
    return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, 1);
  }
  const date = new Date(periodKey);
  if (!Number.isNaN(date.getTime())) return date;
  return null;
}

export function getQuarterLabel(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q}/${date.getFullYear()}`;
}

export function getYearLabel(date: Date): string {
  return `${date.getFullYear()}`;
}

export function calculateGrowthRate(currentVal: number, compareVal: number): number | null {
  if (compareVal === 0) {
    return currentVal > 0 ? 100 : 0;
  }
  return Number((((currentVal - compareVal) / compareVal) * 100).toFixed(1));
}

export function pivot100PercentStacked<T>(
  items: T[],
  getDimension: (item: T) => string,
  getMonth: (item: T) => string,
  getValue: (item: T) => number
) {
  const dimensions = Array.from(new Set(items.map(getDimension))).filter(Boolean);
  const months = Array.from(new Set(items.map(getMonth))).filter(Boolean);
  const map = new Map<string, Record<string, number>>();

  for (const item of items) {
    const month = getMonth(item);
    const dimension = getDimension(item);
    const value = getValue(item);

    if (!map.has(month)) {
      map.set(month, {});
    }

    map.get(month)![dimension] = (map.get(month)![dimension] || 0) + value;
  }

  const rows: Record<string, number | string>[] = [];

  for (const month of months) {
    const monthData = map.get(month) || {};
    let monthTotal = 0;
    for (const dim of dimensions) {
      monthTotal += monthData[dim] || 0;
    }

    const row: Record<string, number | string> = { month };
    for (const dim of dimensions) {
      const val = monthData[dim] || 0;
      row[dim] = monthTotal > 0 ? Number(((val / monthTotal) * 100).toFixed(1)) : 0;
      row[`${dim}_raw`] = val;
    }
    row._total = monthTotal;
    rows.push(row);
  }

  return { dimensions, months, rows };
}

export function aggregateTotalOverall<T>(
  items: T[],
  getDimension: (item: T) => string,
  getValue: (item: T) => number
) {
  const map = new Map<string, number>();
  let grandTotal = 0;

  for (const item of items) {
    const dim = getDimension(item);
    const val = getValue(item);
    map.set(dim, (map.get(dim) || 0) + val);
    grandTotal += val;
  }

  return Array.from(map.entries()).map(([name, value]) => ({
    name,
    value,
    percentage: grandTotal > 0 ? Number(((value / grandTotal) * 100).toFixed(1)) : 0,
  }));
}

export function filterDataByMonth<T>(
  items: T[],
  getMonth: (item: T) => string,
  targetMonth?: string
) {
  if (!targetMonth) return items;
  return items.filter((item) => getMonth(item) === targetMonth);
}

