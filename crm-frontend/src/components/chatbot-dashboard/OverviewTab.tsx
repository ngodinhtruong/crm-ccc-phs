"use client";

import { ChatbotDashboardCharts } from "@/components/chatbot-dashboard/ChatbotDashboardCharts";
import { ChatbotOverviewResponse } from "@/types/chatbot-dashboard.type";

// Mốc thời gian không còn đi qua đây: bộ chọn đã dời lên DashboardToolbar,
// backend trả sẵn dữ liệu theo mốc nên các biểu đồ chỉ việc vẽ.
// onOpenTickets cũng đã bỏ: prop này khai báo từ đầu nhưng chưa bao giờ được
// dùng — mở danh sách phiên đang do KpiCards ở trang cha đảm nhận.
export function OverviewTab({
  overview,
  onlyTrendChart = false,
}: {
  overview: ChatbotOverviewResponse;
  onlyTrendChart?: boolean;
}) {
  return (
    <div className="space-y-6">
      <ChatbotDashboardCharts
        charts={overview.charts}
        faqs={overview.quick_lists?.top_faqs}
        topFaqsSkipped={overview.quick_lists?.top_faqs_skipped}
        onlyTrendChart={onlyTrendChart}
      />
    </div>
  );
}
