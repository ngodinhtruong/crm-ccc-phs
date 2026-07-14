import { SimpleBarChart } from "@/components/sale-admin/dashboard/SimpleBarChart";
import { SaAdminTopEmployeeRow } from "@/types/sale-admin-dashboard.type";

export function TopEmployeeChart({ rows }: { rows: SaAdminTopEmployeeRow[] }) {
  return (
    <SimpleBarChart
      title="Số TK kích hoạt theo nhân viên"
      description="Top 7 nhân viên, so sánh số tài khoản kích hoạt và tổng cuộc gọi."
      rows={rows.map((row) => ({
        key: row.user_id,
        label: row.employee_name,
        value: row.reactivated_accounts,
        secondValue: row.total_calls,
        valueLabel: `${row.reactivated_accounts} TK kích hoạt`,
        secondValueLabel: `${row.total_calls} cuộc gọi`,
        secondLabel: "Tổng cuộc gọi",
      }))}
    />
  );
}
