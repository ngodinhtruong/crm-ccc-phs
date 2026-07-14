import { SimpleBarChart } from "@/components/sale-admin/dashboard/SimpleBarChart";
import { formatMoney } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminProductFeeRow } from "@/types/sale-admin-dashboard.type";

export function ProductFeeChart({ rows }: { rows: SaAdminProductFeeRow[] }) {
  return (
    <SimpleBarChart
      title="Phí GD theo sản phẩm"
      description="Cơ cấu phí giao dịch phát sinh từ các tài khoản đã tái kích hoạt."
      rows={rows.map((row) => ({
        key: row.product_code,
        label: row.product_name,
        value: row.transaction_fee,
        valueLabel: formatMoney(row.transaction_fee),
      }))}
    />
  );
}
