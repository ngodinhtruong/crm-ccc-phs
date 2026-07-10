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
    <div className="grid grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
      {children}

      <div className="col-span-12 flex items-end gap-2 md:col-span-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 items-center gap-1 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
        >
          <Search size={14} />
          Tìm kiếm
        </button>

        <button
          type="button"
          onClick={onClear}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Xóa lọc
        </button>
      </div>
    </div>
  );
}