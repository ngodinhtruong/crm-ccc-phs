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
  return (
    item.name ||
    item.error_type_name ||
    item.error_group_name ||
    "Chưa xác định"
  );
}
