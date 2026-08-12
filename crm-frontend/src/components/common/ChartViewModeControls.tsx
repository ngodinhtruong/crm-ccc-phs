"use client";

import React from "react";
import { TrendingUp, PieChart, Calendar, GitCompare } from "lucide-react";
import { ChartViewMode, GranularityMode, CompareMode } from "@/components/tickets/dashboard/CccDashboardUtils";

export interface ChartViewModeControlsProps {
  viewMode: ChartViewMode;
  onViewModeChange: (mode: ChartViewMode) => void;
  className?: string;
}

export interface CccPeriodControlsProps {
  granularity: GranularityMode;
  onGranularityChange: (g: GranularityMode) => void;
  compareMode?: CompareMode;
  onCompareModeChange?: (c: CompareMode) => void;
  className?: string;
}

/**
 * Period & Comparison Controls Toolbar Component for Dashboard Ticket
 */
export function CccPeriodControls({
  granularity,
  onGranularityChange,
  compareMode,
  onCompareModeChange,
  className = "",
}: CccPeriodControlsProps) {
  const handleSelectGranularity = (g: GranularityMode) => {
    onGranularityChange(g);
    if (onCompareModeChange) {
      if (g === "YEAR") {
        onCompareModeChange("YOY");
      } else {
        onCompareModeChange("QOQ");
      }
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 shadow-xs ${className}`}>
      {/* Granularity Selector with Auto Comparison */}
      <div className="flex items-center gap-1">
        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 pl-1.5 pr-0.5">
          <Calendar className="h-3.5 w-3.5 text-sky-600" />
          Kỳ:
        </span>
        <div className="inline-flex rounded-md bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => handleSelectGranularity("MONTH")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              granularity === "MONTH"
                ? "bg-white text-sky-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Hiển thị theo Tháng (Tự động so sánh tháng liền trước - MoM)"
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => handleSelectGranularity("QUARTER")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              granularity === "QUARTER"
                ? "bg-white text-sky-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Hiển thị theo Quý (Tự động so sánh quý liền trước - QoQ)"
          >
            Quý
          </button>
          <button
            type="button"
            onClick={() => handleSelectGranularity("YEAR")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              granularity === "YEAR"
                ? "bg-white text-sky-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Hiển thị theo Năm (Tự động so sánh năm trước - YoY)"
          >
            Năm
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Global View Mode Switcher for the top dashboard toolbar
 */
export function GlobalChartViewModeSelector({
  viewMode,
  onViewModeChange,
  className = "",
}: ChartViewModeControlsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm ${className}`}>
      <span className="px-2 text-xs font-semibold text-slate-500">Chế độ xem:</span>

      <div className="inline-flex rounded-md bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange("TREND_OVER_TIME")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
            viewMode === "TREND_OVER_TIME"
              ? "bg-white text-[#059669] shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="Xem diễn biến qua các tháng"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Diễn biến các tháng</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange("TOTAL_OVERALL")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
            viewMode === "TOTAL_OVERALL"
              ? "bg-white text-[#059669] shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="Xem gộp tổng quan toàn kỳ"
        >
          <PieChart className="h-3.5 w-3.5" />
          <span>Tổng quan toàn kỳ</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Compact Local View Mode Selector for individual chart card headers
 */
export function LocalChartViewModeSelector({
  viewMode,
  onViewModeChange,
}: ChartViewModeControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange("TREND_OVER_TIME")}
          className={`rounded p-1 transition-all ${
            viewMode === "TREND_OVER_TIME"
              ? "bg-white text-[#059669] shadow-xs"
              : "text-slate-400 hover:text-slate-700"
          }`}
          title="Diễn biến theo thời gian (Trend)"
        >
          <TrendingUp className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange("TOTAL_OVERALL")}
          className={`rounded p-1 transition-all ${
            viewMode === "TOTAL_OVERALL"
              ? "bg-white text-[#059669] shadow-xs"
              : "text-slate-400 hover:text-slate-700"
          }`}
          title="Tổng quan toàn kỳ (Overall)"
        >
          <PieChart className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

