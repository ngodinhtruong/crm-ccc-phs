"use client";

import { useState } from "react";
import { CalendarRange, ClipboardList, Filter, X } from "lucide-react";

import { GranularitySelector } from "@/components/chatbot-dashboard/GranularitySelector";
import type { SurveyGranularity } from "@/types/survey.type";
import {
  currentPeriodCode,
  defaultSurveyFilters,
  hasCustomRange,
  periodOptions,
  shiftPeriod,
  type SurveyFilters,
} from "@/utils/survey-period.util";

const FIELD =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

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
        className={FIELD}
      />
    </div>
  );
}

/**
 * Thanh công cụ của màn khảo sát.
 *
 * Dùng lại đúng ``GranularitySelector`` và kiểu bộ lọc nâng cao của dashboard
 * chatbot để hai màn thao tác giống nhau: đổi mốc Tháng/Quý/Năm ở một chỗ và
 * cả danh sách lẫn dashboard bên dưới cùng đổi theo.
 */
export function SurveyToolbar({
  filters,
  onChange,
  title = "Khảo sát CSAT",
  subtitle = "Lịch sử gửi khảo sát và mức độ hài lòng của khách hàng.",
  /** Hàng "Xem theo Tháng/Quý/Năm" — màn danh sách tắt vì hiện mọi khảo sát. */
  showPeriodPicker = true,
  /** Nút Bộ lọc / Xóa lọc — màn danh sách tắt vì đã lọc ngay trên từng cột. */
  showFilterButtons = true,
  /** Trạng thái mà nút "Xóa lọc" quay về. */
  defaultFilters,
  rightSlot,
}: {
  filters: SurveyFilters;
  onChange: (next: SurveyFilters) => void;
  title?: string;
  subtitle?: string;
  showPeriodPicker?: boolean;
  showFilterButtons?: boolean;
  defaultFilters?: SurveyFilters;
  rightSlot?: React.ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  // Nháp của bộ lọc nâng cao: gõ tới đâu gọi API tới đó thì mỗi ký tự năm là
  // một lượt tải, nên chỉ áp dụng khi bấm nút.
  const [draft, setDraft] = useState({
    year: "",
    month: "",
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const custom = hasCustomRange(filters);

  const changeGranularity = (mode: string) => {
    if (mode === "auto") return;

    const granularity = mode as SurveyGranularity;

    // Bấm mốc mới là bỏ khoảng tự chọn: giữ lại thì nút Tháng/Quý/Năm bấm mãi
    // không thấy gì đổi vì khoảng tự chọn luôn thắng.
    onChange({
      granularity,
      period: currentPeriodCode(granularity),
      startDate: "",
      endDate: "",
    });
    setDraft((current) => ({ ...current, startDate: "", endDate: "" }));
  };

  const applyAdvanced = () => {
    const year = draft.year.trim();
    const month = draft.month.trim();

    if (draft.startDate && draft.endDate) {
      onChange({
        ...filters,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });
      setFilterOpen(false);
      return;
    }

    if (year && month) {
      onChange({
        granularity: "month",
        period: `${year}-${month.padStart(2, "0")}`,
        startDate: "",
        endDate: "",
      });
      setFilterOpen(false);
      return;
    }

    if (year) {
      onChange({
        granularity: "year",
        period: year,
        startDate: "",
        endDate: "",
      });
    }

    setFilterOpen(false);
  };

  const clear = () => {
    setDraft({ year: "", month: "", startDate: "", endDate: "" });
    onChange(defaultFilters ?? defaultSurveyFilters(filters.granularity));
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <ClipboardList size={19} className="text-emerald-600" />
            {title}
          </h1>

          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>

          <div className="mt-1 text-[11px] text-slate-400">
            Đang xem:{" "}
            <span className="font-semibold text-slate-600">
              {custom
                ? `${filters.startDate} → ${filters.endDate}`
                : filters.period
                  ? periodOptions(filters.granularity).find(
                      (item) => item.code === filters.period
                    )?.label || filters.period
                  : "Tất cả thời gian"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {rightSlot}

          {showFilterButtons && (
            <>
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
                onClick={clear}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hàng chọn kỳ chỉ có ý nghĩa khi màn hình xem theo từng kỳ. Màn danh
          sách hiện mọi khảo sát nên tắt hẳn hàng này thay vì để một ô chọn
          không tác dụng gì. */}
      {showPeriodPicker && (
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <GranularitySelector
          value={custom ? "auto" : filters.granularity}
          onChange={changeGranularity}
        />

        {/* {!custom && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  period: shiftPeriod(filters.granularity, filters.period, -1),
                })
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
              aria-label="Kỳ trước"
            >
              ‹
            </button>

            <select
              value={filters.period}
              onChange={(event) =>
                onChange({ ...filters, period: event.target.value })
              }
              className="h-8 min-w-[150px] rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
            >
              {periodOptions(filters.granularity).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  period: shiftPeriod(filters.granularity, filters.period, 1),
                })
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
              aria-label="Kỳ sau"
            >
              ›
            </button>
          </div>
        )} */}

        {custom && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
            <CalendarRange size={12} />
            Khoảng tự chọn — so với khoảng dài bằng ngay trước đó
          </span>
        )}
      </div>
      )}

      {filterOpen && (
        <div className="absolute right-4 top-[calc(100%+8px)] z-40 w-[720px] max-w-[calc(100vw-90px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Bộ lọc nâng cao
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Lọc theo năm, tháng, hoặc một khoảng ngày bất kỳ.
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
                value={draft.year}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, year: value }))
                }
                placeholder="2026"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Tháng"
                value={draft.month}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, month: value }))
                }
                placeholder="1-12"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <ToolbarField
                label="Từ ngày"
                type="date"
                value={draft.startDate}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, startDate: value }))
                }
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <ToolbarField
                label="Đến ngày"
                type="date"
                value={draft.endDate}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, endDate: value }))
                }
              />
            </div>

            <div className="col-span-12 flex items-end justify-end gap-2">
              <span className="mr-auto text-[11px] text-slate-400">
                Điền đủ Từ ngày và Đến ngày để dùng khoảng tự chọn; chỉ điền
                Năm thì xem cả năm.
              </span>

              <button
                type="button"
                onClick={clear}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>

              <button
                type="button"
                onClick={applyAdvanced}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#10b981] px-5 text-xs font-semibold text-white transition hover:bg-[#059669]"
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
