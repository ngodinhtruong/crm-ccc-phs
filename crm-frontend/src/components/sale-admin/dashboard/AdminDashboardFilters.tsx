"use client";

import { RefreshCw, X } from "lucide-react";

import { DateRangeFilter, FilterSelect } from "@/components/common";
import type { SaleAdminDashboardController } from "@/hooks/useSaleAdminDashboard";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function last5MonthsRange() {
  const now = new Date();
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 4, 1)),
    to: toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function currentMonthRange() {
  const now = new Date();
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function previousMonthRange() {
  const now = new Date();
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
}

function isDefault5MonthsRange(dateFrom: string, dateTo: string) {
  const def = last5MonthsRange();
  return dateFrom === def.from && dateTo === def.to;
}

export function getSaleAdminActiveFilterCount(dashboard: SaleAdminDashboardController) {
  let count = 0;

  if (dashboard.branch) count += 1;
  if (!isDefault5MonthsRange(dashboard.dateFrom, dashboard.dateTo)) count += 1;

  return count;
}

export function AdminDashboardFilters({
  dashboard,
  onClose,
}: {
  dashboard: SaleAdminDashboardController;
  onClose: () => void;
}) {
  const branches = dashboard.data?.filters.branch_options || [];

  const applyFilter = () => {
    dashboard.search();
    onClose();
  };

  const clearFilter = () => {
    dashboard.clearFilter();
    onClose();
  };

  const setRange = (range: { from: string; to: string }) => {
    dashboard.setDateFrom(range.from);
    dashboard.setDateTo(range.to);
  };

  return (
    <div className="absolute right-0 top-10 z-[70] w-[min(92vw,760px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Bộ lọc Báo cáo Sale Admin</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Chọn khoảng thời gian dạng lịch range. Mặc định là 5 tháng gần nhất.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
          title="Đóng bộ lọc"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateRangeFilter
                fromValue={dashboard.dateFrom}
                toValue={dashboard.dateTo}
                onFromChange={dashboard.setDateFrom}
                onToChange={dashboard.setDateTo}
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-5">
            <FilterSelect
              label="Chi nhánh"
              value={dashboard.branch}
              onChange={dashboard.setBranch}
              placeholder="Tất cả chi nhánh"
              options={branches.map((branch) => ({
                label: branch.branch_name,
                value: String(branch.id),
              }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRange(last5MonthsRange())}
            className="h-8 rounded-full border border-sky-300 bg-sky-100 px-3 text-[11px] font-bold text-[#007ead] hover:bg-sky-200"
          >
            5 tháng gần nhất (Mặc định)
          </button>
          <button
            type="button"
            onClick={() => setRange(currentMonthRange())}
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Tháng hiện tại
          </button>
          <button
            type="button"
            onClick={() => setRange(previousMonthRange())}
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Tháng trước
          </button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={dashboard.refresh}
          disabled={dashboard.backgroundRefreshing}
          className="flex h-9 items-center justify-center gap-1 rounded-md border border-sky-200 bg-white px-4 text-xs font-semibold text-[#007ead] hover:bg-sky-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={dashboard.backgroundRefreshing ? "animate-spin" : ""} />
          Tải lại dữ liệu
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearFilter}
            disabled={dashboard.loading}
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Xóa lọc
          </button>

          <button
            type="button"
            onClick={applyFilter}
            disabled={dashboard.loading}
            className="h-9 rounded-md bg-[#0097cf] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd] disabled:opacity-50"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
