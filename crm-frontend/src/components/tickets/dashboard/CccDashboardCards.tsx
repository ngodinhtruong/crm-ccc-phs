"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Link2,
  Repeat2,
  TimerReset,
  Ticket,
  Unlink2,
  type LucideIcon,
} from "lucide-react";

import { CccDashboardOverview } from "@/types/ccc-dashboard.type";
import { formatDuration, formatNumber, formatPercent } from "./CccDashboardUtils";

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "sky",
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: "sky" | "emerald" | "amber" | "red" | "violet" | "slate";
}) {
  const toneClass = {
    sky: "bg-sky-50 text-sky-600 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    red: "bg-red-50 text-red-600 ring-red-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    slate: "bg-slate-50 text-slate-600 ring-slate-100",
  }[tone];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          {description && (
            <p className="mt-1 text-[11px] text-slate-500">{description}</p>
          )}
        </div>

        <div className={`rounded-xl p-2 ring-1 ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export function CccDashboardCards({ overview }: { overview: CccDashboardOverview }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Total Tickets"
        value={formatNumber(overview.total_tickets)}
        description="Tổng ticket tiếp nhận trong kỳ"
        icon={Ticket}
        tone="sky"
      />

      <MetricCard
        title="Resolved Tickets"
        value={formatNumber(overview.resolved_tickets)}
        description={`Đã đóng · ${formatPercent(overview.resolved_percentage)}`}
        icon={CheckCircle2}
        tone="emerald"
      />

      <MetricCard
        title="Pending / Processing"
        value={formatNumber(overview.pending_processing)}
        description="Đang xử lý hoặc chờ phản hồi"
        icon={Clock3}
        tone="amber"
      />

      <MetricCard
        title="Overdue SLA"
        value={formatNumber(overview.overdue_sla)}
        description="Ticket có nguy cơ/quá hạn SLA"
        icon={AlertTriangle}
        tone="red"
      />

      <MetricCard
        title="Có TK liên kết"
        value={formatNumber(overview.linked_tickets)}
        description={formatPercent(overview.linked_percentage)}
        icon={Link2}
        tone="emerald"
      />

      <MetricCard
        title="Chưa có TK liên kết"
        value={formatNumber(overview.unlinked_tickets)}
        description={formatPercent(overview.unlinked_percentage)}
        icon={Unlink2}
        tone="amber"
      />

      <MetricCard
        title="Recurring Issues"
        value={formatNumber(overview.recurring_issue_count)}
        description="Số lượt ticket thuộc vấn đề lặp lại"
        icon={Repeat2}
        tone="violet"
      />

      <MetricCard
        title="Thời gian xử lý TB"
        value={formatDuration(overview.average_resolution_minutes)}
        description="Tính trên ticket đã đóng"
        icon={TimerReset}
        tone="slate"
      />
    </div>
  );
}
