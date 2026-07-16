"use client";

import { RefreshCw, X } from "lucide-react";

import { FilterSelect, FilterTextInput } from "@/components/common";
import type { SaleAdminDashboardController } from "@/hooks/useSaleAdminDashboard";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `Tháng ${index + 1}`,
  value: String(index + 1),
}));

export function getSaleAdminActiveFilterCount(dashboard: SaleAdminDashboardController) {
  return [dashboard.year, dashboard.month, dashboard.branch].filter(Boolean).length;
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

  return (
    <div className="absolute right-0 top-10 z-[70] w-[min(92vw,720px)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Bộ lọc Dashboard Sale Admin</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Lọc dashboard theo năm, tháng và chi nhánh. Bộ lọc được ẩn mặc định để giữ không gian cho biểu đồ.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Đóng bộ lọc"
        >
          <X size={15} />
        </button>
      </div>

      <div className="bg-[#f8fafc] px-4 py-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-3">
            <FilterTextInput
              label="Năm"
              value={dashboard.year}
              onChange={dashboard.setYear}
              placeholder="2026"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Tháng"
              value={dashboard.month}
              onChange={dashboard.setMonth}
              options={monthOptions}
            />
          </div>

          <div className="col-span-12 md:col-span-6">
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
      </div>

      <div className="flex justify-between gap-2 border-t bg-white px-4 py-3">
        <button
          type="button"
          onClick={dashboard.refresh}
          disabled={dashboard.backgroundRefreshing}
          className="flex h-9 items-center gap-1 rounded border border-sky-300 bg-white px-4 text-xs font-semibold text-sky-600 hover:bg-sky-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={dashboard.backgroundRefreshing ? "animate-spin" : ""} />
          Tải lại dữ liệu
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearFilter}
            disabled={dashboard.loading}
            className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Xóa lọc
          </button>

          <button
            type="button"
            onClick={applyFilter}
            disabled={dashboard.loading}
            className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}
