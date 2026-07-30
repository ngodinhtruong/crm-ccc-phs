import { RefreshCw, Search, X } from "lucide-react";

import { KpiRankingController } from "@/hooks/useKpiRanking";
import { KpiRankingCategory, KpiRankingStatus } from "@/types/kpi-ranking.type";

const fallbackCategories: { value: KpiRankingCategory; label: string }[] = [
  { value: "TOTAL", label: "Tổng điểm" },
  { value: "MANUAL", label: "Bảng A" },
  { value: "AUTO", label: "Bảng B" },
  { value: "FEE", label: "Phí giao dịch" },
  { value: "REACTIVATED", label: "Tái kích hoạt" },
  { value: "GATE", label: "Điều kiện cổng" },
];

const statuses: { value: KpiRankingStatus; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "HAS_DATA", label: "Đã tính KPI" },
  { value: "NO_DATA", label: "Chưa có điểm" },
  { value: "GATE_PASSED", label: "Đạt cổng" },
  { value: "GATE_FAILED", label: "Không đạt cổng" },
];

export function KpiRankingFilters({ ranking }: { ranking: KpiRankingController }) {
  const categories = ranking.categories.length ? ranking.categories : fallbackCategories;

  return (
    <div className="border-b bg-white px-4 py-3">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-3">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Kỳ KPI
          </label>
          <select
            value={ranking.selectedPeriodId}
            onChange={(event) => ranking.setSelectedPeriodId(event.target.value)}
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-sky-400"
          >
            <option value="">Chọn kỳ KPI</option>
            {ranking.periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.period_code} - {period.period_name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Xếp hạng theo danh mục
          </label>
          <select
            value={ranking.category}
            onChange={(event) => ranking.setCategory(event.target.value as KpiRankingCategory)}
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-sky-400"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Trạng thái
          </label>
          <select
            value={ranking.status}
            onChange={(event) => ranking.setStatus(event.target.value as KpiRankingStatus)}
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-sky-400"
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Chi nhánh
          </label>
          <input
            value={ranking.branch}
            onChange={(event) => ranking.setBranch(event.target.value)}
            placeholder="Mã chi nhánh"
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Tìm kiếm
          </label>
          <input
            value={ranking.q}
            onChange={(event) => ranking.setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") ranking.search();
            }}
            placeholder="Tên, mã NV, email..."
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="text-xs text-slate-500">
          {ranking.selectedPeriod ? (
            <>
              Kỳ chốt điểm: {ranking.selectedPeriod.start_date} → {ranking.selectedPeriod.end_date}
            </>
          ) : (
            <>Mặc định hệ thống chọn kỳ KPI theo tháng hiện tại.</>
          )}
          <span className="mx-2 text-slate-300">|</span>
          Bộ xếp hạng: KPI SA trong chi nhánh
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={ranking.clearFilter}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <X size={14} />
            Xóa lọc
          </button>

          <button
            type="button"
            onClick={ranking.search}
            className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50"
          >
            <Search size={14} />
            Tìm kiếm
          </button>

          <button
            type="button"
            onClick={ranking.loadRanking}
            disabled={ranking.loadingRanking}
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#059669] disabled:opacity-60"
          >
            <RefreshCw size={14} />
            {ranking.loadingRanking ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>
    </div>
  );
}
