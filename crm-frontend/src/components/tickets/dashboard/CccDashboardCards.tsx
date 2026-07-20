"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  ShieldCheck,
  Ticket,
  TimerReset,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { CccDashboardOverview, CccDashboardPreviousPeriod } from "@/types/ccc-dashboard.type";
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
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          {description && (
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className={`flex h-9 w-9 items-center justify-center rounded-md ring-1 ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export function CccDashboardCards({
  overview,
  previousPeriod,
}: {
  overview: CccDashboardOverview;
  previousPeriod?: CccDashboardPreviousPeriod | null;
}) {
  const reportTotal = overview.report_total_tickets ?? overview.total_tickets;
  const reportProcessed = overview.report_processed_tickets ?? overview.resolved_tickets;
  const reportCancelled = overview.report_cancelled_tickets ?? overview.cancelled_tickets;
  const reportTransferred = overview.report_transferred_tickets ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Tổng số ticket"
        value={formatNumber(reportTotal)}
        description={`Kỳ trước: ${formatNumber(previousPeriod?.total_tickets || 0)} ticket`}
        icon={Ticket}
        tone="sky"
      />

      <MetricCard
        title="Ticket đã xử lý"
        value={formatNumber(reportProcessed)}
        description={`Tỷ lệ xử lý: ${formatPercent(overview.resolved_percentage)} · Trừ khảo sát eKYC/spam`}
        icon={CheckCircle2}
        tone="emerald"
      />

      <MetricCard
        title="Spam / Đã hủy"
        value={formatNumber(reportCancelled)}
        description={`Tỷ lệ hủy: ${formatPercent(overview.cancelled_percentage)}`}
        icon={XCircle}
        tone="red"
      />

      <MetricCard
        title="Chuyển PBLQ xử lý"
        value={formatNumber(reportTransferred)}
        description="Ticket có đơn vị xử lý khác TT.CSKH/CCC."
        icon={FileWarning}
        tone="amber"
      />

      <MetricCard
        title="Ticket có SLA"
        value={formatNumber(overview.sla?.total_with_sla || 0)}
        description={`Đúng hạn: ${formatNumber(overview.sla?.on_time || 0)} · Trễ hạn: ${formatNumber(overview.sla?.overdue || 0)}`}
        icon={ShieldCheck}
        tone="violet"
      />

      <MetricCard
        title="SLA trễ hạn"
        value={formatNumber(overview.overdue_sla)}
        description={`Tỷ lệ đúng hạn: ${formatPercent(overview.sla?.sla_rate || 0)}`}
        icon={AlertTriangle}
        tone={overview.overdue_sla > 0 ? "red" : "emerald"}
      />

      <MetricCard
        title="Thời gian xử lý TB"
        value={formatDuration(overview.average_resolution_minutes)}
        description={`P75: ${formatDuration(overview.resolution_p75_minutes)} · P90: ${formatDuration(overview.resolution_p90_minutes)}`}
        icon={TimerReset}
        tone="slate"
      />

      <MetricCard
        title="Đang xử lý"
        value={formatNumber(overview.pending_processing)}
        description="Ticket chưa đóng / chưa hủy trong kỳ lọc."
        icon={Clock3}
        tone="amber"
      />
    </div>
  );
}
