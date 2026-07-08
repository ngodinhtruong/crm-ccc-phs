"use client";

import { useState } from "react";
import { Bot, CalendarRange, Filter, X } from "lucide-react";

import {
  ActiveTab,
  ChatbotDashboardFilters,
} from "@/types/chatbot-dashboard.type";

type QuickPreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

export function DashboardToolbar({
  filters,
  activeTab,
  onFilterChange,
  onApply,
  onClear,
  onQuickPreset,
}: {
  filters: ChatbotDashboardFilters;
  activeTab: ActiveTab;
  onFilterChange: (key: keyof ChatbotDashboardFilters, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  onQuickPreset: (preset: QuickPreset) => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Bot size={19} className="text-sky-600" />
            Dashboard Chatbot
          </h1>

          <p className="mt-0.5 text-xs text-slate-500">
            Theo dõi phiên chatbot, chuyển CCC, câu hỏi rác và xu hướng chủ đề.
          </p>

          <div className="mt-1 text-[11px] text-slate-400">
            Đang xem:{" "}
            <span className="font-semibold text-slate-600">
              {activeTab === "overview"
                ? "Tổng quan"
                : activeTab === "tickets"
                ? "Tickets"
                : "FAQ"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <QuickPresetButton
            label="Hôm nay"
            onClick={() => onQuickPreset("TODAY")}
          />

          <QuickPresetButton
            label="Tuần này"
            onClick={() => onQuickPreset("THIS_WEEK")}
          />

          <QuickPresetButton
            label="Tháng này"
            onClick={() => onQuickPreset("THIS_MONTH")}
          />

          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
              filterOpen
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            }`}
          >
            <Filter size={14} />
            Bộ lọc
          </button>

          <button
            type="button"
            onClick={onClear}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="absolute right-4 top-[calc(100%+8px)] z-40 w-[720px] max-w-[calc(100vw-90px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Bộ lọc nâng cao
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Lọc theo năm, tháng, ngày hoặc khung giờ.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Năm"
                value={filters.year || ""}
                onChange={(value) => onFilterChange("year", value)}
                placeholder="2026"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Tháng"
                value={filters.month || ""}
                onChange={(value) => onFilterChange("month", value)}
                placeholder="1-12"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <ToolbarField
                label="Từ ngày"
                type="date"
                value={filters.start_date || ""}
                onChange={(value) => onFilterChange("start_date", value)}
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <ToolbarField
                label="Đến ngày"
                type="date"
                value={filters.end_date || ""}
                onChange={(value) => onFilterChange("end_date", value)}
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Từ giờ"
                value={filters.start_hour || ""}
                onChange={(value) => onFilterChange("start_hour", value)}
                placeholder="0"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Đến giờ"
                value={filters.end_hour || ""}
                onChange={(value) => onFilterChange("end_hour", value)}
                placeholder="23"
              />
            </div>

            <div className="col-span-12 flex items-end justify-end gap-2 md:col-span-8">
              <button
                type="button"
                onClick={onClear}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>

              <button
                type="button"
                onClick={() => {
                  onApply();
                  setFilterOpen(false);
                }}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0097cf] px-5 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
              >
                <Filter size={15} />
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickPresetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
    >
      <CalendarRange size={13} />
      {label}
    </button>
  );
}

function ToolbarField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </div>
  );
}