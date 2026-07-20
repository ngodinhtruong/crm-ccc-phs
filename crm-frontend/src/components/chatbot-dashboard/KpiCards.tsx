"use client";

import {
  Bot,
  Clock,
  MessageSquareWarning,
  Ticket,
  UserRoundCheck,
} from "lucide-react";

import {
  ChatbotOverviewResponse,
  SummaryBucket,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";

/**
 * Hàng thẻ KPI của dashboard chatbot — hiển thị ở tab Tổng quan.
 *
 * Tách khỏi OverviewTab để panel hàng chờ chèn được ngay bên dưới,
 * đồng thời giữ OverviewTab gọn, chỉ còn phần biểu đồ.
 * Bấm vào thẻ sẽ mở tab Ticket đã lọc sẵn theo nhóm tương ứng.
 */
export function KpiCards({
  summary,
  onOpenTickets,
}: {
  summary: ChatbotOverviewResponse["summary"];
  onOpenTickets: (options: TicketOpenOptions) => void;
}) {
  return (
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
        onClick={() => onOpenTickets({ title: "Câu hỏi rác", status: "SPAM" })}
      />
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
