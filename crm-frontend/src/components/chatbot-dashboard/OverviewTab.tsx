import {
  BarChart3,
  Bot,
  Clock,
  Layers3,
  MessageSquareWarning,
  PieChart,
  Ticket,
  UserRoundCheck,
} from "lucide-react";

import { AnalyticsPanel } from "@/components/chatbot-dashboard/charts/AnalyticsPanel";
import { CategoryShareList } from "@/components/chatbot-dashboard/charts/CategoryShareList";
import { MetricBars } from "@/components/chatbot-dashboard/charts/MetricBars";
import { TopicRankingList } from "@/components/chatbot-dashboard/charts/TopicRankingList";
import {
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  ChatbotTicketItem,
  SummaryBucket,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";
import { shortText } from "@/utils/text.util";

export function OverviewTab({
  overview,
  onOpenTickets,
}: {
  overview: ChatbotOverviewResponse;
  onOpenTickets: (options: TicketOpenOptions) => void;
}) {
  const { summary, charts, quick_lists: quickLists } = overview;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          bucket={summary.total_received}
          subtitle="Toàn bộ lượt hỏi & phiên trong kỳ"
          icon={<Bot size={22} />}
          iconClassName="bg-sky-100 text-sky-600"
          showRate={false}
          onClick={() =>
            onOpenTickets({ title: "Tổng tiếp nhận", status: "ALL" })
          }
        />

        <KpiCard
          bucket={summary.bot_done}
          subtitle="Chatbot trả lời xong, không cần CCC"
          icon={<UserRoundCheck size={22} />}
          iconClassName="bg-emerald-100 text-emerald-600"
          onClick={() =>
            onOpenTickets({ title: "Chatbot tự xử lý", status: "BOT_DONE" })
          }
        />

        <KpiCard
          bucket={summary.ccc}
          subtitle="Đã xin được thông tin, tạo ticket"
          icon={<Ticket size={22} />}
          iconClassName="bg-amber-100 text-amber-600"
          onClick={() =>
            onOpenTickets({ title: "Chuyển CCC xử lý", status: "CCC" })
          }
        />

        <KpiCard
          bucket={summary.pending}
          subtitle="Chatbot đã hỏi nhưng KH chưa cung cấp"
          icon={<Clock size={22} />}
          iconClassName="bg-sky-100 text-sky-600"
          onClick={() =>
            onOpenTickets({
              title: "Chờ thông tin khách hàng",
              status: "PENDING",
            })
          }
        />

        <KpiCard
          bucket={summary.spam}
          subtitle="Câu chào hỏi & không liên quan"
          icon={<MessageSquareWarning size={22} />}
          iconClassName="bg-rose-100 text-rose-600"
          onClick={() =>
            onOpenTickets({ title: "Câu hỏi rác", status: "SPAM" })
          }
        />
      </div>

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
            description="Chủ đề của các phiên đã chuyển CCC"
            icon={<PieChart size={18} />}
          >
            <CategoryShareList
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
        <LatestCccTable rows={quickLists.latest_ccc_tickets} />
        <TopFaqTable rows={quickLists.top_faqs} />
      </div>
    </div>
  );
}

function KpiCard({
  bucket,
  subtitle,
  icon,
  iconClassName,
  showRate = true,
  onClick,
}: {
  bucket: SummaryBucket;
  subtitle: string;
  icon: React.ReactNode;
  iconClassName: string;
  showRate?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
            {bucket.label}
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-800">
              {bucket.value}
            </span>
            <span className="text-xs font-normal text-slate-500">lượt</span>

            <span className="text-slate-300">/</span>

            <span className="text-xl font-bold text-slate-700">
              {bucket.session_count}
            </span>
            <span className="text-xs font-normal text-slate-500">phiên</span>
          </div>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        {showRate && (
          <span className="font-semibold text-slate-700">
            {bucket.rate}% ·{" "}
          </span>
        )}
        {subtitle}
      </div>
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
          Các phiên mới nhất đã chuyển sang CCC.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-slate-50 text-slate-600">
              <th className="px-3 font-semibold">Mã ticket</th>
              <th className="px-3 font-semibold">Session</th>
              <th className="px-3 font-semibold">Chủ đề</th>
              <th className="px-3 font-semibold">Nội dung</th>
              <th className="px-3 font-semibold">Ngày</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="h-20 text-center text-slate-500">
                  Không có dữ liệu.
                </td>
              </tr>
            )}

            {rows.map((item) => (
              <tr key={item.id} className="h-12 border-b border-slate-100">
                <td className="px-3 font-semibold text-sky-600">
                  {item.ticket_code || "-"}
                </td>
                <td className="px-3 font-mono text-[11px] text-slate-600">
                  {shortText(item.session_id, 12)}
                </td>
                <td className="px-3">{item.category_label || "-"}</td>
                <td className="px-3 text-slate-600">
                  {shortText(item.reason || item.last_question, 60)}
                </td>
                <td className="px-3 whitespace-nowrap">
                  {formatDateTime(item.started_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
