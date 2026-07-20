import { BarChart3, Layers3, ListOrdered } from "lucide-react";

import { AnalyticsPanel } from "@/components/chatbot-dashboard/charts/AnalyticsPanel";
import { CategoryRankBars } from "@/components/chatbot-dashboard/charts/CategoryRankBars";
import { MetricBars } from "@/components/chatbot-dashboard/charts/MetricBars";
import { TopicRankingList } from "@/components/chatbot-dashboard/charts/TopicRankingList";
import {
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";

export function OverviewTab({
  overview,
  onOpenTickets,
}: {
  overview: ChatbotOverviewResponse;
  onOpenTickets: (options: TicketOpenOptions) => void;
}) {
  const { charts, quick_lists: quickLists } = overview;

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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TopFaqTable rows={quickLists.top_faqs} />
      </div>
    </div>
  );
}

function TopFaqTable({ rows }: { rows: ChatbotFaqItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <h3 className="text-sm font-bold text-slate-800">
          FAQ được hỏi nhiều nhất
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Chủ đề khách hàng hỏi nhiều nhất trong kỳ.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-slate-50 text-slate-600">
              <th className="px-3 font-semibold">#</th>
              <th className="px-3 font-semibold">Chủ đề</th>
              <th className="px-3 font-semibold">Số lượt hỏi</th>
              <th className="px-3 font-semibold">Số phiên</th>
              <th className="px-3 font-semibold">Gần nhất</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="h-20 text-center text-slate-500">
                  Chưa có câu hỏi nào được gán chủ đề.
                </td>
              </tr>
            )}

            {rows.map((item, index) => (
              <tr
                key={item.category}
                className="h-12 border-b border-slate-100"
              >
                <td className="px-3 text-slate-500">{index + 1}</td>
                <td className="px-3 font-medium text-slate-700">
                  {item.category}
                </td>
                <td className="px-3 font-semibold text-sky-600">
                  {item.hit_count}
                </td>
                <td className="px-3">{item.session_count}</td>
                <td className="px-3 whitespace-nowrap">
                  {formatDateTime(item.latest_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
