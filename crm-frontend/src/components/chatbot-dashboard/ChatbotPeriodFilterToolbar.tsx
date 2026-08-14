"use client";

import { useState } from "react";
import { Bot, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { CccPeriodControls, DateRangeFilter } from "@/components/common";
import { GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";
import type { ChatbotDashboardFilters, GranularityChoice } from "@/types/chatbot-dashboard.type";

export function ChatbotPeriodFilterToolbar({
  filters,
  effectiveGranularity,
  onFilterChange,
  onApply,
  onClear,
  onGranularityChange,
  onReload,
}: {
  filters: ChatbotDashboardFilters;
  effectiveGranularity?: GranularityMode | string;
  onFilterChange: (key: keyof ChatbotDashboardFilters, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  onGranularityChange: (mode: GranularityChoice) => void;
  onReload: () => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  // Map effective / filter granularity to CCC GranularityMode ("MONTH" | "QUARTER" | "YEAR")
  const currentGranularityMode: GranularityMode =
    filters.granularity === "quarter" || (effectiveGranularity as string) === "quarter" || (effectiveGranularity as string) === "QUARTER"
      ? "QUARTER"
      : filters.granularity === "year" || (effectiveGranularity as string) === "year" || (effectiveGranularity as string) === "YEAR"
      ? "YEAR"
      : "MONTH";

  const handleGranularitySelect = (g: GranularityMode) => {
    const choice: GranularityChoice = g === "QUARTER" ? "quarter" : g === "YEAR" ? "year" : "month";
    onGranularityChange(choice);
  };

  const isFiltered = Boolean(filters.start_date || filters.end_date);

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
      {/* Left: Title & Subtext */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-500/20">
          <Bot size={20} />
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-800 tracking-tight">
            Dashboard Chatbot
          </h1>
          <p className="text-xs text-slate-500">
            Theo dõi phiên chatbot, tỷ lệ tự xử lý vs chuyển CCC và phân loại thắc mắc.
          </p>
        </div>
      </div>

      {/* Right: CCC-style Period Controls & Filter Popover */}
      <div className="relative flex flex-wrap items-center justify-end gap-2">
        {/* Period Controls: Tháng / Quý / Năm */}
        <CccPeriodControls
          granularity={currentGranularityMode}
          onGranularityChange={handleGranularitySelect}
        />

        {/* Date Range Filter Popover Toggle */}
        <button
          type="button"
          onClick={() => setFilterOpen((prev) => !prev)}
          className={`relative flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-2xs transition-all ${
            filterOpen || isFiltered
              ? "border-[#10b981] bg-emerald-50 text-[#059669]"
              : "border-slate-300/80 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
          }`}
        >
          <SlidersHorizontal size={14} />
          Bộ lọc
          {isFiltered && (
            <span className="ml-1 rounded-full bg-[#10b981] px-1.5 py-0.5 text-[10px] font-bold text-white">
              !
            </span>
          )}
        </button>

        {/* Filter Popover Dropdown */}
        {filterOpen && (
          <div className="absolute right-0 top-10 z-[70] w-[min(92vw,360px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Lọc khoảng ngày Chatbot</h3>
                <p className="text-[11px] text-slate-500">Chọn mốc thời gian xem báo cáo</p>
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <DateRangeFilter
                fromLabel="Từ ngày"
                toLabel="Đến ngày"
                fromValue={filters.start_date || ""}
                toValue={filters.end_date || ""}
                onFromChange={(val) => onFilterChange("start_date", val)}
                onToChange={(val) => onFilterChange("end_date", val)}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setFilterOpen(false);
                }}
                className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>

              <button
                type="button"
                onClick={() => {
                  onApply();
                  setFilterOpen(false);
                }}
                className="h-8 rounded bg-[#10b981] px-3.5 text-xs font-semibold text-white hover:bg-[#059669]"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        )}

        {/* Reload Button */}
        <button
          type="button"
          onClick={onReload}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all"
          title="Tải lại dữ liệu mới nhất"
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>
    </div>
  );
}
