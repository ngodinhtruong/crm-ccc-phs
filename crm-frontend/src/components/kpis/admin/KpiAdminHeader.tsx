"use client";

import { useMemo, useState, type ElementType } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Target,
  Trophy,
  X,
} from "lucide-react";

import { KpiAdminController, KpiAdminTab } from "@/hooks/useKpiAdmin";
import { getProfileLabel } from "./KpiAdminUtils";

const tabs: { key: KpiAdminTab; label: string; icon: ElementType }[] = [
  { key: "ranking", label: "Bảng xếp hạng", icon: Trophy },
  { key: "report", label: "Báo cáo", icon: BarChart3 },
  { key: "targets", label: "Set chỉ tiêu", icon: Target },
];

function getMonthLabel(period?: { month?: number | null; year?: number | null; period_name?: string }) {
  if (!period) return "Chưa chọn kỳ";
  if (period.month && period.year) return `T${period.month}/${period.year}`;
  return period.period_name || "Kỳ KPI";
}

function findPeriodByOffset(
  periods: { id: number; year: number; month?: number | null }[],
  currentPeriodId: string,
  offset: -1 | 1
) {
  const current = periods.find((item) => String(item.id) === currentPeriodId);
  if (!current?.month) return "";

  let nextYear = current.year;
  let nextMonth = Number(current.month) + offset;

  if (nextMonth < 1) {
    nextMonth = 12;
    nextYear -= 1;
  }

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextPeriod = periods.find(
    (item) => item.year === nextYear && Number(item.month) === nextMonth
  );

  return nextPeriod ? String(nextPeriod.id) : "";
}

function getActiveFilterCount(admin: KpiAdminController) {
  let count = 0;

  if (admin.selectedBranch && admin.selectedBranch !== "all") count += 1;
  if (admin.selectedPeriodId) count += 1;
  if (admin.q.trim()) count += 1;

  return count;
}

export function KpiAdminHeader({ admin }: { admin: KpiAdminController }) {
  const [filterOpen, setFilterOpen] = useState(false);

  const period = admin.meta?.period;
  const profiles = admin.meta?.profiles || [];
  const branches = admin.meta?.branches || [];
  const previousPeriodId = findPeriodByOffset(admin.periods, admin.selectedPeriodId, -1);
  const nextPeriodId = findPeriodByOffset(admin.periods, admin.selectedPeriodId, 1);
  const activeFilterCount = getActiveFilterCount(admin);

  const roleOptions = useMemo(() => {
    const hasSup = profiles.some((profile) => profile.profile_code === "SA_SUP");
    return hasSup
      ? [
          { value: "ALL" as const, label: "Tất cả" },
          { value: "SA" as const, label: "SA" },
          { value: "SUP" as const, label: "SUP" },
        ]
      : [
          { value: "ALL" as const, label: "Tất cả" },
          { value: "SA" as const, label: "SA" },
          { value: "SUP" as const, label: "SUP" },
        ];
  }, [profiles]);

  return (
    <div className="overflow-visible rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-slate-800">KPI Admin</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {admin.meta?.employee_count ?? 0} nhân viên · {getProfileLabel(admin.meta?.selected_profile?.profile_code)} · {getMonthLabel(period)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SA / SUP Role Switcher Tabs */}
          <div className="flex rounded-md border border-slate-200 bg-[#f8fafc] p-0.5">
            {roleOptions.map((option) => {
              const active = admin.roleType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => admin.setRoleType(option.value)}
                  className={[
                    "flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold transition",
                    active
                      ? "bg-white text-[#059669] shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="flex rounded-md border border-slate-200 bg-[#f8fafc] p-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = admin.activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => admin.setActiveTab(tab.key)}
                  className={[
                    "flex h-8 items-center gap-1.5 rounded px-3 text-sm font-semibold transition",
                    active
                      ? "bg-white text-[#059669] shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((value) => !value)}
              className="flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Filter size={15} />
              Bộ lọc
              <span className="rounded bg-[#10b981] px-1.5 py-0.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-10 z-40 w-[360px] rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-800">Bộ lọc KPI</div>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Kỳ KPI</label>
                    <select
                      value={admin.selectedPeriodId}
                      onChange={(event) => admin.setSelectedPeriodId(event.target.value)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500"
                    >
                      <option value="">Kỳ hiện tại</option>
                      {admin.periods.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.period_name} ({item.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Chi nhánh</label>
                    <select
                      value={admin.selectedBranch}
                      onChange={(event) => admin.setSelectedBranch(event.target.value)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500"
                    >
                      <option value="all">Tất cả chi nhánh</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.branch_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1">
                      <button
                        type="button"
                        disabled={!previousPeriodId}
                        onClick={() => previousPeriodId && admin.setSelectedPeriodId(previousPeriodId)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="min-w-[95px] text-center text-sm font-bold text-slate-700">
                        {getMonthLabel(period)}
                      </span>
                      <button
                        type="button"
                        disabled={!nextPeriodId}
                        onClick={() => nextPeriodId && admin.setSelectedPeriodId(nextPeriodId)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="h-8 rounded bg-[#10b981] px-3 text-xs font-bold text-white hover:bg-[#059669]"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={admin.reload}
            disabled={admin.loading}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={admin.loading ? "animate-spin" : ""} />
            Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}
