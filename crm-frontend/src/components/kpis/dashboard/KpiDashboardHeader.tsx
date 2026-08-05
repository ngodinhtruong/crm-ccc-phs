"use client";

import { useState } from "react";
import { Filter, RefreshCw, RotateCw, UserRound, X } from "lucide-react";

import { KpiDashboardController } from "@/hooks/useKpiDashboard";
import { formatDateTime } from "./KpiDashboardUtils";

function getProfileLabel(profileCode?: string) {
  if (profileCode === "SA") return "KPI SA";
  if (profileCode === "SA_SUP") return "KPI SUP";

  return profileCode || "-";
}

export function KpiDashboardHeaderActions({
  dashboard,
}: {
  dashboard: KpiDashboardController;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  const viewingEmployee =
    dashboard.scope === "BRANCH" && dashboard.selectedEmployeeName;

  const activeFilterCount = dashboard.selectedPeriodId ? 1 : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Bộ lọc Popover Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          <Filter size={14} className="text-slate-500" />
          Bộ lọc
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[#10b981] px-1.5 py-0.2 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {filterOpen && (
          <div className="absolute right-0 top-10 z-50 w-[360px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Bộ lọc KPI
              </span>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Kỳ KPI
                </label>
                <select
                  value={dashboard.selectedPeriodId}
                  onChange={(e) => dashboard.setSelectedPeriodId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
                >
                  <option value="">Chọn kỳ KPI</option>
                  {dashboard.periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.period_code} - {period.period_name} ({period.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Đối tượng xem
                </label>
                <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700">
                  <UserRound size={14} className="text-[#059669]" />
                  {viewingEmployee ? dashboard.selectedEmployeeName : "KPI cá nhân của tôi"}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Bộ KPI áp dụng
                </label>
                <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700">
                  {getProfileLabel(dashboard.selectedProfileCode)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                <div>
                  Kỳ chốt điểm:{" "}
                  <strong className="text-slate-800">
                    {dashboard.selectedPeriod
                      ? `${dashboard.selectedPeriod.start_date} → ${dashboard.selectedPeriod.end_date}`
                      : "-"}
                  </strong>
                </div>
                <div className="mt-1">
                  Cập nhật:{" "}
                  <strong className="text-slate-800">
                    {formatDateTime(dashboard.lastUpdatedAt)}
                  </strong>
                </div>
                <div className="mt-1 text-slate-400 font-medium">
                  Tự động cập nhật nền mỗi 60 giây
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="h-8 rounded-lg bg-[#10b981] px-4 text-xs font-bold text-white hover:bg-[#059669]"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewingEmployee && (
        <button
          type="button"
          onClick={dashboard.viewSelfDashboard}
          className="flex h-8 items-center gap-1 rounded-lg border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 shadow-2xs hover:bg-sky-50 transition"
        >
          KPI của tôi
        </button>
      )}

      {dashboard.canCalculateAuto && (
        <button
          type="button"
          onClick={dashboard.recalculate}
          disabled={dashboard.calculating || !dashboard.selectedPeriodId}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-[#10b981] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#059669] disabled:opacity-60 transition"
        >
          <RotateCw size={13} />
          {dashboard.calculating ? "Đang tính..." : "Tính lại CRM"}
        </button>
      )}
    </div>
  );
}

export { KpiDashboardHeaderActions as KpiDashboardHeader };

