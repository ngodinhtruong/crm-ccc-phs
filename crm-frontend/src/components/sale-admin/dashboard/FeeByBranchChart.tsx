"use client";

import { SimpleBarChart } from "@/components/sale-admin/dashboard/SimpleBarChart";
import {
  formatMoney,
  getPeriodLabel,
  getPreviousPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminBranchFeeChartRow } from "@/types/sale-admin-dashboard.type";

export function FeeByBranchChart({
  rows,
  month,
  year,
  periodLabel,
  previousLabel,
}: {
  rows: SaAdminBranchFeeChartRow[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
  previousLabel?: string;
}) {
  const current = periodLabel || getPeriodLabel(month, year);
  const previous = previousLabel || rows[0]?.previous_label || getPreviousPeriodLabel(month, year);

  return (
    <SimpleBarChart
      title="Phí theo chi nhánh"
      description={`${previous} vs ${current}`}
      layout="vertical"
      height={300}
      rows={rows.slice(0, 10).map((row) => ({
        key: row.branch_id || row.branch_name,
        label: row.branch_name,
        value: row.current_fee,
        secondValue: row.previous_fee,
        valueLabel: formatMoney(row.current_fee),
        secondValueLabel: formatMoney(row.previous_fee),
        currentLabel: current,
        secondLabel: previous,
      }))}
      emptyText="Chưa có dữ liệu phí theo chi nhánh."
    />
  );
}
