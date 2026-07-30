"use client";

import { Search } from "lucide-react";
import { ReactNode } from "react";

type TableToolbarProps = {
  children: ReactNode;
  onSearch: () => void;
  onClear: () => void;
};

export function TableToolbar({
  children,
  onSearch,
  onClear,
}: TableToolbarProps) {
  return (
    <div className="grid min-w-0 grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
      {children}

      <div className="col-span-12 flex min-w-0 flex-wrap items-end gap-2 xl:col-span-3">
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669]"
        >
          <Search size={14} />
          Tìm kiếm
        </button>

        <button
          type="button"
          onClick={onClear}
          className="h-9 shrink-0 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Xóa lọc
        </button>
      </div>
    </div>
  );
}
