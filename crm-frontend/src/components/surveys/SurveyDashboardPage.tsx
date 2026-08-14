"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks, SlidersHorizontal, X } from "lucide-react";

import { CccPeriodControls, DateRangeFilter } from "@/components/common";
import { GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";
import { SurveyDashboardSection } from "@/components/surveys/SurveyDashboardSection";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  defaultSurveyFilters,
  type SurveyFilters,
} from "@/utils/survey-period.util";

/** Dashboard CSAT — trang riêng với bộ lọc kỳ & thời gian trên header. */
export function SurveyDashboardPage() {
  const [filters, setFilters] = useState<SurveyFilters>(() =>
    defaultSurveyFilters()
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [customRange, setCustomRange] = useState({
    startDate: filters.startDate || "",
    endDate: filters.endDate || "",
  });

  const currentGranularityMode: GranularityMode =
    filters.granularity === "quarter"
      ? "QUARTER"
      : filters.granularity === "year"
      ? "YEAR"
      : "MONTH";

  const handleGranularitySelect = (g: GranularityMode) => {
    const nextGranularity = g === "QUARTER" ? "quarter" : g === "YEAR" ? "year" : "month";
    setFilters(defaultSurveyFilters(nextGranularity));
  };

  const isFiltered = Boolean(filters.startDate || filters.endDate);

  const applyCustomFilter = () => {
    setFilters((prev) => ({
      ...prev,
      startDate: customRange.startDate,
      endDate: customRange.endDate,
    }));
    setFilterOpen(false);
  };

  const clearCustomFilter = () => {
    setCustomRange({ startDate: "", endDate: "" });
    setFilters(defaultSurveyFilters(filters.granularity));
    setFilterOpen(false);
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Khảo sát", href: "/surveys" },
        { label: "Dashboard CSAT" },
      ]}
      rightAction={
        <div className="relative flex flex-wrap items-center justify-end gap-2">
          {/* Nút chọn kỳ: Tháng / Quý / Năm */}
          <CccPeriodControls
            granularity={currentGranularityMode}
            onGranularityChange={handleGranularitySelect}
          />

          {/* Nút bật Bộ lọc khoảng ngày */}
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
                  <h3 className="text-xs font-bold text-slate-800">Lọc khoảng ngày CSAT</h3>
                  <p className="text-[11px] text-slate-500">Chọn thời gian khảo sát</p>
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
                  fromValue={customRange.startDate}
                  toValue={customRange.endDate}
                  onFromChange={(val) =>
                    setCustomRange((prev) => ({ ...prev, startDate: val }))
                  }
                  onToChange={(val) =>
                    setCustomRange((prev) => ({ ...prev, endDate: val }))
                  }
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={clearCustomFilter}
                  className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Xóa lọc
                </button>

                <button
                  type="button"
                  onClick={applyCustomFilter}
                  className="h-8 rounded bg-[#10b981] px-3.5 text-xs font-semibold text-white hover:bg-[#059669]"
                >
                  Áp dụng bộ lọc
                </button>
              </div>
            </div>
          )}

          {/* Link sang danh sách khảo sát */}
          <Link
            href="/surveys"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            <ListChecks size={14} className="text-emerald-600" />
            Danh sách khảo sát
          </Link>
        </div>
      }
    >
      <div className="no-motion contents">
        <SurveyDashboardSection filters={filters} />
      </div>
    </DashboardLayout>
  );
}
