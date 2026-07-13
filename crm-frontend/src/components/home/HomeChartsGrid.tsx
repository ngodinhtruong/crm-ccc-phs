import {
  BarChartCard,
  PieChartCard,
} from "@/components/dashboard/DashboardCharts";
import { HomeDashboard } from "@/types/dashboard.type";

export function HomeChartsGrid({
  dashboard,
}: {
  dashboard: HomeDashboard;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <BarChartCard
        title="[PHS] Báo cáo tổng số lượng ticket theo kênh tiếp nhận trong tuần"
        items={dashboard.source_summary}
        footer={`Số bản ghi: ${dashboard.total_tickets}`}
      />

      <BarChartCard
        title="[PHS] Báo cáo tổng số lượng ticket theo danh mục hỗ trợ trong tuần"
        items={dashboard.category_summary}
        footer={`Số bản ghi: ${dashboard.total_tickets}`}
      />

      <PieChartCard
        title="[PHS] Báo cáo tổng số lượng ticket theo loại KH trong tháng"
        items={dashboard.customer_type_summary}
      />
    </div>
  );
}