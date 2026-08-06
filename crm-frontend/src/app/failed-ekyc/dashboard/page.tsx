"use client";

import Link from "next/link";
import { useState } from "react";
import { List, RefreshCw, SlidersHorizontal, X } from "lucide-react";

import { CccPeriodControls, DateRangeFilter } from "@/components/common";
import { FailedEkycDashboard } from "@/components/failed-ekyc/FailedEkycDashboard";
import { CompareMode, GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getLast5MonthsDateRange } from "@/utils/date.util";

export default function Page() {
  const initial = getLast5MonthsDateRange();
  const [granularity, setGranularity] = useState<GranularityMode>("MONTH");
  const [compareMode, setCompareMode] = useState<CompareMode>("NONE");
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const filterActive = dateFrom !== initial.dateFrom || dateTo !== initial.dateTo;

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "TRANG CHỦ", href: "/workspace" }, { label: "Dashboard Failed eKYC" }]}
      sidebarDefaultExpandedGroupKey="failed-ekyc"
      sidebarDefaultActiveChildKey="failed-ekyc-dashboard"
      rightAction={
        <div className="relative flex flex-wrap items-center justify-end gap-2">
          <CccPeriodControls granularity={granularity} onGranularityChange={setGranularity} compareMode={compareMode} onCompareModeChange={setCompareMode}/>
          <Link href="/failed-ekyc" className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-400 hover:bg-slate-50"><List size={14} className="text-emerald-600"/>Danh sách Failed eKYC</Link>
          <button type="button" onClick={() => setFilterOpen((open) => !open)} className={`relative flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-2xs transition ${filterOpen || filterActive ? "border-[#10b981] bg-emerald-50 text-[#059669]" : "border-slate-300/80 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"}`}><SlidersHorizontal size={14}/>Bộ lọc{filterActive && <span className="ml-1 rounded-full bg-[#10b981] px-1.5 py-0.5 text-[10px] font-bold text-white">1</span>}</button>
          {filterOpen && <div className="absolute right-0 top-11 z-50 w-[520px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-800">Bộ lọc Dashboard</h3><p className="text-xs text-slate-500">Lọc theo ngày phát sinh Failed eKYC.</p></div><button type="button" onClick={() => setFilterOpen(false)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100"><X size={16}/></button></div><DateRangeFilter fromLabel="Từ ngày phát sinh" toLabel="Đến ngày phát sinh" fromValue={dateFrom} toValue={dateTo} onFromChange={setDateFrom} onToChange={setDateTo}/><div className="mt-4 flex justify-end gap-2 border-t pt-3"><button type="button" onClick={() => { setDateFrom(initial.dateFrom); setDateTo(initial.dateTo); }} className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Xóa lọc</button><button type="button" onClick={() => setFilterOpen(false)} className="h-8 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700">Áp dụng</button></div></div>}
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700"><RefreshCw size={14}/>Làm mới</button>
        </div>
      }
    >
      <FailedEkycDashboard granularity={granularity} compareMode={compareMode} dateFrom={dateFrom} dateTo={dateTo} refreshKey={refreshKey}/>
    </DashboardLayout>
  );
}
