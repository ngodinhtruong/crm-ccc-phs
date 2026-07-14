import { SimpleBarChart } from "@/components/sale-admin/dashboard/SimpleBarChart";
import { formatMoney } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminBranchFeeChartRow } from "@/types/sale-admin-dashboard.type";

export function FeeByBranchChart({ rows }: { rows: SaAdminBranchFeeChartRow[] }) {
  return (
    <SimpleBarChart
      title="Biểu đồ phí theo chi nhánh"
      description="So sánh phí giao dịch giữa tháng hiện tại và tháng trước theo từng chi nhánh."
      rows={rows.slice(0, 10).map((row) => ({
        key: row.branch_id,
        label: row.branch_name,
        value: row.current_fee,
        secondValue: row.previous_fee,
        valueLabel: formatMoney(row.current_fee),
        secondValueLabel: formatMoney(row.previous_fee),
      }))}
    />
  );
}
