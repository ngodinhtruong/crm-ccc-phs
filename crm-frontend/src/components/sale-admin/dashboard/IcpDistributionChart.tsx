import { SimpleBarChart } from "@/components/sale-admin/dashboard/SimpleBarChart";
import { SaAdminIcpDistributionRow } from "@/types/sale-admin-dashboard.type";

export function IcpDistributionChart({ rows }: { rows: SaAdminIcpDistributionRow[] }) {
  return (
    <SimpleBarChart
      title="Tỷ lệ Tiềm năng / Không Tiềm năng"
      description="Biểu đồ cột phân bổ khách hàng theo nhóm ICP từ SA Records."
      rows={rows.map((row) => ({
        key: `${row.icp_type}-${row.icp_code || row.label}`,
        label: row.icp_code ? `${row.icp_code} - ${row.label}` : row.label,
        value: row.count,
        valueLabel: `${row.count} KH · ${row.percent.toFixed(1)}%`,
      }))}
      emptyText="Chưa có dữ liệu ICP."
    />
  );
}
