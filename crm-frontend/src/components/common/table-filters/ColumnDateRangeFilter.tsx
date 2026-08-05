"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";

type ColumnDateRangeFilterProps = {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export function ColumnDateRangeFilter({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: ColumnDateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const labelText = useMemo(() => {
    if (fromValue && toValue) return `${fromValue} - ${toValue}`;
    if (fromValue) return `Từ ${fromValue}`;
    if (toValue) return `Đến ${toValue}`;
    return "Chọn ngày";
  }, [fromValue, toValue]);

  const hasFilter = Boolean(fromValue || toValue);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-8 w-full items-center justify-between gap-1 rounded border px-2 text-xs font-normal transition-all ${
          hasFilter
            ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
            : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
        }`}
        title={hasFilter ? `Lọc ngày: ${labelText}` : "Lọc ngày"}
      >
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <Calendar size={13} className={hasFilter ? "text-emerald-600" : "text-slate-400"} />
          <span className="truncate">{labelText}</span>
        </div>
        <ChevronDown size={12} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-[270px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-xs font-semibold text-slate-800">Lọc khoảng ngày</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Từ ngày</label>
              <input
                type="date"
                value={fromValue}
                onChange={(e) => onFromChange(e.target.value)}
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Đến ngày</label>
              <input
                type="date"
                value={toValue}
                onChange={(e) => onToChange(e.target.value)}
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  onFromChange("");
                  onToChange("");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Xóa lọc
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
