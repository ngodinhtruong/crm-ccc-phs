import {
  BarChart3,
  Bot,
  Layers3,
  MessageSquareWarning,
  PieChart,
  Ticket,
  UserRoundCheck,
} from "lucide-react";

import {
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  ChatbotTicketItem,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";
import { AnalyticsPanel } from "@/components/chatbot-dashboard/charts/AnalyticsPanel";
import { MetricBars } from "@/components/chatbot-dashboard/charts/MetricBars";
import { CategoryShareList } from "@/components/chatbot-dashboard/charts/CategoryShareList";
import { TopicRankingList } from "@/components/chatbot-dashboard/charts/TopicRankingList";
import { formatDateTime } from "@/utils/date.util";
import { shortText } from "@/utils/text.util";

export function OverviewTab({
  overview,
  onOpenTickets,
}: {
  overview: ChatbotOverviewResponse;
  onOpenTickets: (options: TicketOpenOptions) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <KpiCard
          title="Tổng tiếp nhận"
          value={
            <div className="flex items-baseline gap-2">
              <span>
                {overview.summary.total_received.value}
                <span className="ml-1 text-sm font-normal text-slate-500">lượt</span>
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xl font-bold">
                {overview.summary.total_received.session_count ?? "-"}
                <span className="ml-1 text-xs font-normal text-slate-500">phiên</span>
              </span>
            </div>
          }
          subtitle="Tổng lượt chat & phiên trong kỳ"
          icon={<Bot size={22} />}
          iconClassName="bg-sky-100 text-sky-600"
          onClick={() =>
            onOpenTickets({
              title: "Tổng tiếp nhận",
              status: "ALL",
            })
          }
        />

        <KpiCard
          title="Chatbot tự xử lý"
          value={overview.summary.bot_done.value}
          subtitle={`${overview.summary.bot_done.rate || 0}% so với tổng tiếp nhận`}
          icon={<UserRoundCheck size={22} />}
          iconClassName="bg-emerald-100 text-emerald-600"
          onClick={() =>
            onOpenTickets({
              title: "Chatbot tự xử lý",
              status: "BOT_DONE",
            })
          }
        />

        <KpiCard
          title="Chuyển CCC xử lý"
          value={overview.summary.ccc.value}
          subtitle={`${overview.summary.ccc.rate || 0}% so với tổng tiếp nhận`}
          icon={<Ticket size={22} />}
          iconClassName="bg-amber-100 text-amber-600"
          onClick={() =>
            onOpenTickets({
              title: "Chuyển CCC xử lý",
              status: "CCC",
            })
          }
        />

        <KpiCard
          title="Câu hỏi rác / Timeout"
          value={overview.summary.spam.value}
          subtitle={`${overview.summary.spam.rate || 0}% so với tổng tiếp nhận`}
          icon={<MessageSquareWarning size={22} />}
          iconClassName="bg-rose-100 text-rose-600"
          onClick={() =>
            onOpenTickets({
              title: "Câu hỏi rác / Timeout",
              status: "SPAM",
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Phân loại xử lý"
            description="So sánh Chatbot tự xử lý / Chuyển CCC / Rác"
            icon={<BarChart3 size={18} />}
          >
            <MetricBars
              data={overview.charts.process_classification || []}
              onItemClick={(item) => {
                const status =
                  item.code === "SPAM_TIMEOUT"
                    ? "SPAM"
                    : item.code === "CCC"
                    ? "CCC"
                    : item.code === "BOT_DONE"
                    ? "BOT_DONE"
                    : "ALL";

                onOpenTickets({
                  title: item.name,
                  status,
                });
              }}
            />
          </AnalyticsPanel>
        </div>

        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Vấn đề CCC xử lý"
            description="Phân bổ các phiên chuyển sang CCC"
            icon={<PieChart size={18} />}
          >
            <CategoryShareList
              data={overview.charts.ccc_issue_pie || []}
              onItemClick={(item) =>
                onOpenTickets({
                  title: `CCC - ${item.name}`,
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
            description="Tổng hợp theo chủ đề toàn bộ session"
            icon={<Layers3 size={18} />}
          >
            <TopicRankingList
              data={overview.charts.topic_bar || []}
              onItemClick={(item) =>
                onOpenTickets({
                  title: `Chủ đề - ${item.name}`,
                  status: "ALL",
                  dashboard_category: item.name,
                })
              }
            />
          </AnalyticsPanel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LatestCccTable rows={overview.quick_lists.latest_ccc_tickets || []} />
        <TopFaqTable rows={overview.quick_lists.top_faqs || []} />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
  onClick,
}: {
  title: string;
  value: number | React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  iconClassName: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </div>

          <div className="mt-3 text-3xl font-bold text-slate-800">{value}</div>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 text-sm text-slate-500">{subtitle}</div>
    </button>
  );
}

function LatestCccTable({ rows }: { rows: ChatbotTicketItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <h3 className="text-sm font-bold text-slate-800">
          Vấn đề cần CCC xử lý
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Các phiên mới nhất được chuyển sang CCC.
        </p>
      </div>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-slate-50 text-slate-600">
            <th className="px-3">Mã ticket</th>
            <th className="px-3">Session</th>
            <th className="px-3">Lý do</th>
            <th className="px-3">Thời gian</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="h-20 text-center text-slate-500">
                Không có dữ liệu.
              </td>
            </tr>
          )}

          {rows.map((item) => (
            <tr key={item.id} className="h-12 border-b border-slate-100">
              <td className="px-3 font-semibold text-sky-600">
                {item.ticket_code || "-"}
              </td>
              <td className="px-3">{item.session_id}</td>
              <td className="px-3">
                {shortText(item.reason || item.last_question, 60)}
              </td>
              <td className="px-3">{formatDateTime(item.started_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
          Câu hỏi FAQ có tần suất cao nhất.
        </p>
      </div>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-slate-50 text-slate-600">
            <th className="px-3">Câu hỏi</th>
            <th className="px-3">Số lần hỏi</th>
            <th className="px-3">Lần gần nhất</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="h-20 text-center text-slate-500">
                Không có dữ liệu.
              </td>
            </tr>
          )}

          {rows.map((item, index) => (
            <tr
              key={`${item.question}-${index}`}
              className="h-12 border-b border-slate-100"
            >
              <td className="px-3">{shortText(item.question, 80)}</td>
              <td className="px-3 font-semibold text-sky-600">
                {item.hit_count}
              </td>
              <td className="px-3">{formatDateTime(item.latest_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}