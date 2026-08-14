"use client";

import { useState } from "react";
import { RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { ChatbotDashboardSection } from "@/components/chatbot-dashboard/ChatbotDashboardSection";
import { CccPeriodControls, DateRangeFilter } from "@/components/common";
import { GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";
import { useChatbotDashboard } from "@/hooks/useChatbotDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { GranularityChoice } from "@/types/chatbot-dashboard.type";

export function ChatbotDashboardPage() {
  const dashboard = useChatbotDashboard();
  const [filterOpen, setFilterOpen] = useState(false);

  const currentGranularityMode: GranularityMode =
    dashboard.filters.granularity === "quarter" || (dashboard.effectiveGranularity as string) === "quarter"
      ? "QUARTER"
      : dashboard.filters.granularity === "year" || (dashboard.effectiveGranularity as string) === "year"
      ? "YEAR"
      : "MONTH";

  const handleGranularitySelect = (g: GranularityMode) => {
    const choice: GranularityChoice = g === "QUARTER" ? "quarter" : g === "YEAR" ? "year" : "month";
    dashboard.changeGranularity(choice);
  };

  const isFiltered = Boolean(dashboard.filters.start_date || dashboard.filters.end_date);

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "Dashboard Chatbot",
        },
      ]}
      rightAction={
        <div className="relative flex flex-wrap items-center justify-end gap-2">
          {/* Period Controls: Tháng / Quý / Năm */}
          <CccPeriodControls
            granularity={currentGranularityMode}
            onGranularityChange={handleGranularitySelect}
          />

          {/* Date Filter Popover */}
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
                  fromValue={dashboard.filters.start_date || ""}
                  toValue={dashboard.filters.end_date || ""}
                  onFromChange={(val) => dashboard.updateFilter("start_date", val)}
                  onToChange={(val) => dashboard.updateFilter("end_date", val)}
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    dashboard.clearFilters();
                    setFilterOpen(false);
                  }}
                  className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Xóa lọc
                </button>

                <button
                  type="button"
                  onClick={() => {
                    dashboard.applyFilters();
                    setFilterOpen(false);
                  }}
                  className="h-8 rounded bg-[#10b981] px-3.5 text-xs font-semibold text-white hover:bg-[#059669]"
                >
                  Áp dụng bộ lọc
                </button>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={dashboard.refresh}
            disabled={dashboard.loading}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
            title="Tải lại dữ liệu mới nhất"
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="no-motion contents">
        <ChatbotDashboardSection
          hideToolbar={true}
          dashboardInstance={dashboard}
        />
      </div>
    </DashboardLayout>
  );
}
