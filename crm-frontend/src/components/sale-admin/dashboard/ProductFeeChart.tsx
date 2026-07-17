"use client";

import { SimpleBarChart } from "@/components/sale-admin/dashboard/SimpleBarChart";
import {
  formatMoney,
  getPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminProductFeeRow } from "@/types/sale-admin-dashboard.type";

export function ProductFeeChart({
  rows,
  month,
  year,
  periodLabel,
}: {
  rows: SaAdminProductFeeRow[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
}) {
  return (
    <SimpleBarChart
      title="Phí GD theo sản phẩm"
      description={periodLabel || getPeriodLabel(month, year)}
      rows={rows.slice(0, 8).map((row) => ({
        key: row.product_code,
        label: row.product_name,
        value: row.transaction_fee,
        valueLabel: formatMoney(row.transaction_fee),
        currentLabel: "Phí GD",
      }))}
      height={260}
      emptyText="Chưa có dữ liệu phí theo sản phẩm."
    />
  );
}
