import { BarChart3, Layers3, ListOrdered } from "lucide-react";

import { AnalyticsPanel } from "@/components/chatbot-dashboard/charts/AnalyticsPanel";
import { CategoryRankBars } from "@/components/chatbot-dashboard/charts/CategoryRankBars";
import { MetricBars } from "@/components/chatbot-dashboard/charts/MetricBars";
import { TopicRankingList } from "@/components/chatbot-dashboard/charts/TopicRankingList";
import {
  ChatbotOverviewResponse,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";

export function OverviewTab({
  overview,
  onOpenTickets,
}: {
  overview: ChatbotOverviewResponse;
  onOpenTickets: (options: TicketOpenOptions) => void;
}) {
  // Bảng "FAQ được hỏi nhiều nhất" đã chuyển hẳn sang tab FAQ, không hiển thị
  // ở tab Tổng quan nữa.
  const { charts } = overview;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Phân loại xử lý"
            description="Chatbot tự xử lý / Chuyển CCC / Chờ / Rác"
            icon={<BarChart3 size={18} />}
          >
            <MetricBars
              data={charts.process_classification}
              onItemClick={(item) =>
                onOpenTickets({ title: item.name, status: item.code })
              }
            />
          </AnalyticsPanel>
        </div>

        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Vấn đề CCC xử lý"
            description="Chủ đề của các phiên đã chuyển CCC, xếp theo số phiên"
            icon={<ListOrdered size={18} />}
          >
            <CategoryRankBars
              data={charts.ccc_issue_pie}
              onItemClick={(item) =>
                onOpenTickets({
                  title: `CCC — ${item.name}`,
                  status: "CCC",
                  dashboard_category: item.name,
                })
              }
            />
          </AnalyticsPanel>
        </div>

        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Phân loại theo chủ đề"
            description="Gồm cả phiên chatbot tự xử lý và phiên chuyển CCC"
            icon={<Layers3 size={18} />}
          >
            <TopicRankingList
              data={charts.topic_bar}
              onItemClick={(item) =>
                onOpenTickets({
                  title: `Chủ đề — ${item.name}`,
                  status: "TOPIC",
                  dashboard_category: item.name,
                })
              }
            />
          </AnalyticsPanel>
        </div>
      </div>
    </div>
  );
}
