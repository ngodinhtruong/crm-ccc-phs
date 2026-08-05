import type { ReactNode } from "react";
import { CheckCircle2, CircleDollarSign, Trophy, XCircle } from "lucide-react";

import { KpiDashboardController } from "@/hooks/useKpiDashboard";
import { formatNumber } from "./KpiDashboardUtils";

function SummaryCard({
  label,
  value,
  description,
  accentColor = "emerald",
  children,
}: {
  label: string;
  value: string;
  description: string;
  accentColor?: "emerald" | "amber" | "sky" | "indigo";
  children: ReactNode;
}) {
  const colorMap = {
    emerald: "bg-emerald-50 text-[#059669] border-emerald-100/80",
    amber: "bg-amber-50 text-amber-600 border-amber-100/80",
    sky: "bg-sky-50 text-sky-600 border-sky-100/80",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100/80",
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:shadow-xs hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-800 tracking-tight">{value}</div>
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${colorMap[accentColor]} transition-transform group-hover:scale-105`}>
          {children}
        </div>
      </div>
      <div className="mt-2.5 text-xs text-slate-500 line-clamp-1">{description}</div>
    </div>
  );
}

export function KpiSummaryCards({
  dashboard,
}: {
  dashboard: KpiDashboardController;
}) {
  const summary = dashboard.activeSummary;
  const scores = dashboard.computedScores;

  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Tổng điểm"
        value={formatNumber(scores.totalScore)}
        description="Tổng điểm sau khi cộng Phần A và Phần B."
        accentColor="emerald"
      >
        <Trophy size={20} />
      </SummaryCard>

      <SummaryCard
        label="Phần A"
        value={formatNumber(scores.manualScore)}
        description="Điểm do Admin/SUP nhập đánh giá."
        accentColor="sky"
      >
        <CheckCircle2 size={20} />
      </SummaryCard>

      <SummaryCard
        label="Phần B"
        value={formatNumber(scores.autoScore)}
        description="Dữ liệu CRM tự động cập nhật định kỳ."
        accentColor="indigo"
      >
        <CircleDollarSign size={20} />
      </SummaryCard>

      <SummaryCard
        label="Điều kiện cổng"
        value={summary?.all_gates_passed ? "Đạt" : "Theo dõi"}
        description={
          summary?.all_gates_passed
            ? "Tất cả điều kiện cổng đang đạt."
            : "Có điều kiện cổng chưa đạt hoặc nguy cơ."
        }
        accentColor={summary?.all_gates_passed ? "emerald" : "amber"}
      >
        {summary?.all_gates_passed ? (
          <CheckCircle2 size={20} />
        ) : (
          <XCircle size={20} />
        )}
      </SummaryCard>
    </div>
  );
}

