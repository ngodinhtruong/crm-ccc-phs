"use client";

import {
  GRANULARITY_LABELS,
  GRANULARITY_OPTIONS,
} from "@/constants/chatbot-dashboard.constant";
import type {
  GranularityChoice,
  GranularityMode,
} from "@/types/chatbot-dashboard.type";

/**
 * Bộ chọn mốc thời gian dùng chung cho cả dashboard.
 *
 * Trước đây mỗi thẻ biểu đồ tự dựng một bản riêng nên đổi mốc chỉ ảnh hưởng
 * đúng thẻ đó. Giờ đặt một chỗ trên thanh công cụ và đổi là mọi biểu đồ
 * cùng đổi theo.
 */
export function GranularitySelector({
  value,
  effective,
  onChange,
}: {
  value: GranularityChoice;
  /** Mốc backend thực sự dùng — chỉ hiện khi đang để "Tự động". */
  effective?: GranularityMode;
  onChange: (mode: GranularityChoice) => void;
}) {
  // Tra trong bảng nhãn đầy đủ: chế độ tự động vẫn có thể suy ra ngày/tuần
  // dù hai mốc đó không có nút bấm.
  const effectiveLabel = effective ? GRANULARITY_LABELS[effective] : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Xem theo
      </span>

      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-xs">
        {GRANULARITY_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-bold transition-all duration-200 ${
              value === option.key
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {value === "auto" && effectiveLabel && (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          đang theo {effectiveLabel.toLowerCase()}
        </span>
      )}
    </div>
  );
}
