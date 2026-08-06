"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, X } from "lucide-react";

type ColumnDateRangeFilterProps = {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

const PANEL_WIDTH = 270;
const EDGE_GAP = 8;

/**
 * Lọc khoảng ngày cho một cột của bảng.
 *
 * Bảng lọc mở ra bằng portal với ``position: fixed``, không nằm trong cây DOM
 * của ô tiêu đề. Lý do: hàng lọc nằm trong ``<th>`` có ``overflow: hidden``,
 * còn bảng thì nằm trong khung cuộn ngang — cả hai đều cắt mất phần tử định
 * vị tuyệt đối, nên bấm vào chỉ thấy nút đổi màu mà không thấy panel đâu.
 */
export function ColumnDateRangeFilter({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: ColumnDateRangeFilterProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Toạ độ neo cũng là cờ đóng/mở: có toạ độ nghĩa là đang mở.
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
    null
  );

  const labelText = useMemo(() => {
    if (fromValue && toValue) return `${fromValue} - ${toValue}`;
    if (fromValue) return `Từ ${fromValue}`;
    if (toValue) return `Đến ${toValue}`;
    return "Chọn ngày";
  }, [fromValue, toValue]);

  const hasFilter = Boolean(fromValue || toValue);
  const open = anchor !== null;

  const toggle = () => {
    if (open) {
      setAnchor(null);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();

    if (!rect) return;

    setAnchor({
      top: rect.bottom + 4,
      // Không để panel tràn khỏi mép phải màn hình.
      left: Math.max(
        EDGE_GAP,
        Math.min(rect.left, window.innerWidth - PANEL_WIDTH - EDGE_GAP)
      ),
    });
  };

  useEffect(() => {
    if (!open) return;

    const close = () => setAnchor(null);

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }

      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Cuộn thì toạ độ neo hết đúng; đóng lại đơn giản hơn là bám theo.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`flex h-8 w-full items-center justify-between gap-1 rounded border px-2 text-xs font-normal transition-all ${
          hasFilter
            ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800"
            : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
        }`}
        title={hasFilter ? `Lọc ngày: ${labelText}` : "Lọc ngày"}
      >
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <Calendar
            size={13}
            className={hasFilter ? "text-emerald-600" : "text-slate-400"}
          />
          <span className="truncate">{labelText}</span>
        </div>
        <ChevronDown size={12} className="shrink-0 text-slate-400" />
      </button>

      {anchor &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: anchor.top, left: anchor.left, width: PANEL_WIDTH }}
            className="fixed z-[90] rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-semibold text-slate-800">
                Lọc khoảng ngày
              </span>
              <button
                type="button"
                onClick={() => setAnchor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={fromValue}
                  onChange={(event) => onFromChange(event.target.value)}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={toValue}
                  onChange={(event) => onToChange(event.target.value)}
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
                  onClick={() => setAnchor(null)}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
