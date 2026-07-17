"use client";

import { SimpleBarChart } from "@/components/sale-admin/dashboard/SimpleBarChart";
import { getPeriodLabel } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminTopEmployeeRow } from "@/types/sale-admin-dashboard.type";

export function TopEmployeeChart({
  rows,
  month,
  year,
  periodLabel,
}: {
  rows: SaAdminTopEmployeeRow[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
}) {
  return (
    <SimpleBarChart
      title="Số TK kích hoạt theo NV"
      description={`Top ${rows.length} nhân viên · ${periodLabel || getPeriodLabel(month, year)}`}
      layout="vertical"
      height={300}
      rows={rows.map((row) => ({
        key: row.user_id || row.employee_name,
        label: row.employee_name,
        value: row.reactivated_accounts,
        secondValue: row.total_calls,
        valueLabel: `${row.reactivated_accounts} TK kích hoạt`,
        secondValueLabel: `${row.total_calls} cuộc gọi`,
        currentLabel: "TK kích hoạt",
        secondLabel: "Tổng cuộc gọi",
      }))}
      emptyText="Chưa có dữ liệu nhân viên kích hoạt."
    />
  );
}
