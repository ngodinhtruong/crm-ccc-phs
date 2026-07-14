import type { ReactNode } from "react";
import { CheckCircle2, CircleDollarSign, Trophy, XCircle } from "lucide-react";

import { KpiDashboardController } from "@/hooks/useKpiDashboard";
import { formatNumber } from "./KpiDashboardUtils";

function SummaryCard({
  label,
  value,
  description,
  children,
}: {
  label: string;
  value: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
        </div>
        {children}
      </div>
      <div className="mt-2 text-xs text-slate-500">{description}</div>
    </div>
  );
}

export function KpiSummaryCards({
  dashboard,
}: {
  dashboard: KpiDashboardController;
}) {
  const summary = dashboard.activeSummary;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Tổng điểm"
        value={formatNumber(summary?.total_score)}
        description="Tổng điểm sau khi cộng Phần A và Phần B."
      >
        <Trophy size={22} className="text-sky-600" />
      </SummaryCard>

      <SummaryCard
        label="Phần A"
        value={formatNumber(summary?.manual_score)}
        description="Điểm do Admin nhập, SA chỉ xem."
      >
        <CheckCircle2 size={22} className="text-emerald-600" />
      </SummaryCard>

      <SummaryCard
        label="Phần B"
        value={formatNumber(summary?.auto_score)}
        description="Dữ liệu CRM tự động cập nhật định kỳ."
      >
        <CircleDollarSign size={22} className="text-sky-600" />
      </SummaryCard>

      <SummaryCard
        label="Điều kiện cổng"
        value={summary?.all_gates_passed ? "Đạt" : "Theo dõi"}
        description={
          summary?.all_gates_passed
            ? "Tất cả điều kiện cổng đang đạt."
            : "Có điều kiện cổng chưa đạt hoặc có nguy cơ."
        }
      >
        {summary?.all_gates_passed ? (
          <CheckCircle2 size={22} className="text-emerald-600" />
        ) : (
          <XCircle size={22} className="text-amber-600" />
        )}
      </SummaryCard>
    </div>
  );
}
