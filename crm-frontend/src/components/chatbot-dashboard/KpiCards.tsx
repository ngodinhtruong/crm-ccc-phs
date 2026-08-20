"use client";

import {
  Bot,
  Clock,
  MessageSquareWarning,
  Ticket,
  TrendingUp,
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
    /*
      Luôn giữ 6 KPI trên cùng một hàng. Breakpoint cũ chỉ dùng 5 cột từ
      `2xl` (>= 1536px), nên laptop 1366px bị chia thành 3 + 2 card.
      Khi vùng nội dung hẹp hơn 1000px, hàng KPI cuộn ngang thay vì wrap.
    */
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="grid min-w-[1000px] grid-cols-6 gap-2 xl:gap-3">
        <KpiCard
          bucket={summary.total_received}
          subtitle="Toàn bộ phiên tương tác trong kỳ"
          icon={<Bot size={18} />}
          iconClassName="bg-sky-100 text-sky-600"
          showRate={false}
          onClick={() =>
            onOpenTickets({ title: "Tổng tiếp nhận", status: "ALL" })
          }
        />

        <KpiCard
          bucket={summary.bot_done}
          subtitle="Chatbot trả lời xong, không cần CCC"
          icon={<UserRoundCheck size={18} />}
          iconClassName="bg-emerald-100 text-emerald-600"
          onClick={() =>
            onOpenTickets({ title: "Chatbot tự xử lý", status: "BOT_DONE" })
          }
        />

        <KpiCard
          bucket={summary.ccc}
          subtitle="Đã xin được thông tin, tạo ticket"
          icon={<Ticket size={18} />}
          iconClassName="bg-amber-100 text-amber-600"
          onClick={() =>
            onOpenTickets({ title: "Chuyển CCC xử lý", status: "CCC" })
          }
        />

        <KpiCard
          bucket={summary.research}
          subtitle="Bot phân tích CP, khuyến nghị thị trường"
          icon={<TrendingUp size={18} />}
          iconClassName="bg-violet-100 text-violet-600"
          onClick={() =>
            onOpenTickets({
              title: "Phân tích / khuyến nghị",
              status: "RESEARCH",
            })
          }
        />

        <KpiCard
          bucket={summary.pending}
          subtitle="Chatbot đã hỏi nhưng KH chưa cung cấp"
          icon={<Clock size={18} />}
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
          icon={<MessageSquareWarning size={18} />}
          iconClassName="bg-rose-100 text-rose-600"
          onClick={() => onOpenTickets({ title: "Câu hỏi rác", status: "SPAM" })}
        />
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
      className="group h-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {bucket.label}
          </div>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold leading-none text-slate-800">
              {bucket.session_count}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">phiên</span>
          </div>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">
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