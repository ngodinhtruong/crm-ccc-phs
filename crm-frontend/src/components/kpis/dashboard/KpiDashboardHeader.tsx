"use client";

import { RefreshCw, RotateCw, UserRound } from "lucide-react";

import { KpiDashboardController } from "@/hooks/useKpiDashboard";
import { formatDateTime } from "./KpiDashboardUtils";

function getProfileLabel(profileCode?: string) {
  if (profileCode === "SA") return "KPI SA";
  if (profileCode === "SA_SUP") return "KPI SUP";

  return profileCode || "-";
}

export function KpiDashboardHeader({
  dashboard,
}: {
  dashboard: KpiDashboardController;
}) {
  const viewingEmployee =
    dashboard.scope === "BRANCH" && dashboard.selectedEmployeeName;

  return (
    <div className="border-b bg-white px-4 py-3">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Kỳ KPI
          </label>
          <select
            value={dashboard.selectedPeriodId}
            onChange={(event) => dashboard.setSelectedPeriodId(event.target.value)}
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-sky-400"
          >
            <option value="">Chọn kỳ KPI</option>
            {dashboard.periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.period_code} - {period.period_name} ({period.status})
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Đối tượng xem
          </label>
          <div className="flex h-9 items-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-700">
            <UserRound size={14} className="text-sky-600" />
            {viewingEmployee ? dashboard.selectedEmployeeName : "KPI cá nhân của tôi"}
          </div>
        </div>

        <div className="col-span-12 md:col-span-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Bộ KPI áp dụng
          </label>
          <div className="flex h-9 items-center rounded border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-700">
            {getProfileLabel(dashboard.selectedProfileCode)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="text-xs text-slate-500">
          {dashboard.selectedPeriod ? (
            <>
              Kỳ chốt điểm: {dashboard.selectedPeriod.start_date} → {dashboard.selectedPeriod.end_date}
            </>
          ) : (
            <>Mặc định hệ thống tự chọn kỳ KPI theo tháng hiện tại</>
          )}
          <span className="mx-2 text-slate-300">|</span>
          Cập nhật: {formatDateTime(dashboard.lastUpdatedAt)}
          {dashboard.backgroundRefreshing && (
            <span className="ml-2 text-sky-600">Đang cập nhật nền...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewingEmployee && (
            <button
              type="button"
              onClick={dashboard.viewSelfDashboard}
              className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50"
            >
              KPI của tôi
            </button>
          )}

          <button
            type="button"
            onClick={dashboard.refresh}
            disabled={dashboard.loadingDetail && !dashboard.hasDashboardData}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} />
            Tải lại
          </button>

          {dashboard.canCalculateAuto && (
            <button
              type="button"
              onClick={dashboard.recalculate}
              disabled={dashboard.calculating || !dashboard.selectedPeriodId}
              className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd] disabled:opacity-60"
            >
              <RotateCw size={14} />
              {dashboard.calculating ? "Đang tính..." : "Tính lại CRM"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
