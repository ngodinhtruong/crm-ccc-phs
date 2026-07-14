import { RefreshCw } from "lucide-react";

import { FilterSelect, FilterTextInput, TableToolbar } from "@/components/common";
import type { SaleAdminDashboardController } from "@/hooks/useSaleAdminDashboard";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `Tháng ${index + 1}`,
  value: String(index + 1),
}));

export function AdminDashboardFilters({ dashboard }: { dashboard: SaleAdminDashboardController }) {
  const branches = dashboard.data?.filters.branch_options || [];

  return (
    <TableToolbar onSearch={dashboard.search} onClear={dashboard.clearFilter}>
      <div className="col-span-12 md:col-span-2">
        <FilterTextInput
          label="Năm"
          value={dashboard.year}
          onChange={dashboard.setYear}
          placeholder="2026"
        />
      </div>

      <div className="col-span-12 md:col-span-2">
        <FilterSelect
          label="Tháng"
          value={dashboard.month}
          onChange={dashboard.setMonth}
          options={monthOptions}
        />
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

      <div className="col-span-12 flex items-end justify-end md:col-span-3">
        <button
          type="button"
          onClick={dashboard.refresh}
          className="flex h-9 items-center gap-1 rounded border border-sky-300 bg-white px-4 text-xs font-semibold text-sky-600 hover:bg-sky-50"
        >
          <RefreshCw size={14} className={dashboard.backgroundRefreshing ? "animate-spin" : ""} />
          Tải lại
        </button>
      </div>
    </TableToolbar>
  );
}
