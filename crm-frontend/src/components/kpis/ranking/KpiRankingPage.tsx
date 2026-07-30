"use client";

import { Download, RefreshCw, Trophy } from "lucide-react";

import {
  AccessDenied,
  FilterSelect,
  FilterTextInput,
  SearchInput,
  TablePagination,
  TableToolbar,
} from "@/components/common";
import { KpiRankingTable } from "@/components/kpis/ranking/KpiRankingTable";
import { useKpiRanking } from "@/hooks/useKpiRanking";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { KpiRankingCategory, KpiRankingStatus } from "@/types/kpi-ranking.type";

export function KpiRankingPage() {
  const ranking = useKpiRanking();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/workspace",
        },
        {
          label: "Sale Admin",
          href: "/sale-admin/dashboard",
        },
        {
          label: "Bảng xếp hạng KPI",
        },
      ]}
      sidebarDefaultExpandedGroupKey="sale-admin"
      sidebarDefaultActiveChildKey="sale-admin-kpi-ranking"
      rightAction={
        <button
          type="button"
          className="flex h-8 items-center gap-1 rounded border border-emerald-300 bg-white px-3 text-xs font-semibold text-[#059669] hover:bg-emerald-50"
        >
          <Download size={15} />
          Xuất dữ liệu
        </button>
      }
    >
      {!ranking.loading && !ranking.canView ? (
        <AccessDenied
          title="Không có quyền xem bảng xếp hạng KPI"
          description="Tài khoản của bạn cần quyền xem KPI chi nhánh hoặc toàn hệ thống."
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex h-12 items-center justify-between border-b bg-white px-4">
            <div>
              <h1 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Trophy size={16} className="text-[#059669]" />
                Bảng xếp hạng nhân viên Sale Admin
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Danh sách nhân viên SA trong phạm vi được phân quyền. Bấm vào nhân viên để xem dashboard KPI SA của nhân viên đó.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <TablePagination
                fromRecord={ranking.fromRecord}
                toRecord={ranking.toRecord}
                count={ranking.filteredCount}
                page={ranking.page}
                totalPages={ranking.totalPages}
                loading={ranking.loadingRanking}
                onPrevious={ranking.previousPage}
                onNext={ranking.nextPage}
              />

              <button
                type="button"
                onClick={ranking.clearFilter}
                className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b bg-[#f8fafc] px-4 py-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Tổng nhân viên SA</div>
              <div className="mt-1 text-lg font-bold text-slate-800">
                {ranking.allItems.length}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Đã có điểm KPI</div>
              <div className="mt-1 text-lg font-bold text-slate-800">
                {ranking.hasSummaryCount}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Chưa có điểm KPI</div>
              <div className="mt-1 text-lg font-bold text-slate-800">
                {ranking.noSummaryCount}
              </div>
            </div>
          </div>

          <TableToolbar onSearch={ranking.search} onClear={ranking.clearFilter}>
            <div className="col-span-12 md:col-span-2">
              <FilterSelect
                label="Kỳ KPI"
                value={ranking.selectedPeriodId}
                onChange={ranking.setSelectedPeriodId}
                placeholder="Chọn kỳ KPI"
                options={ranking.periods.map((period) => ({
                  label: `${period.period_code} - ${period.period_name}`,
                  value: String(period.id),
                }))}
              />
            </div>

            <div className="col-span-12 md:col-span-2">
              <FilterSelect
                label="Xếp hạng theo"
                value={ranking.category}
                onChange={(value) => ranking.setCategory(value as KpiRankingCategory)}
                options={ranking.categories}
              />
            </div>

            <div className="col-span-12 md:col-span-2">
              <FilterSelect
                label="Trạng thái điểm"
                value={ranking.status}
                onChange={(value) => ranking.setStatus(value as KpiRankingStatus)}
                options={ranking.statuses}
              />
            </div>

            <div className="col-span-12 md:col-span-2">
              <FilterTextInput
                label="Chi nhánh"
                value={ranking.branch}
                onChange={ranking.setBranch}
                placeholder="Tên chi nhánh"
              />
            </div>

            <div className="col-span-12 md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Tìm kiếm
              </label>
              <SearchInput
                value={ranking.q}
                onChange={ranking.setQ}
                placeholder="Tên, mã NV, username, email..."
              />
            </div>
          </TableToolbar>

          {ranking.selectedPeriod && (
            <div className="border-b bg-white px-4 py-2 text-xs text-slate-500">
              Kỳ chốt điểm: {ranking.selectedPeriod.start_date} → {ranking.selectedPeriod.end_date}
              <span className="mx-2 text-slate-300">|</span>
              Bảng xếp hạng dùng profile KPI SA của nhân viên.
              {ranking.loadingRanking && (
                <span className="ml-2 inline-flex items-center gap-1 text-[#059669]">
                  <RefreshCw size={12} className="animate-spin" />
                  Đang tải...
                </span>
              )}
            </div>
          )}

          <KpiRankingTable
            items={ranking.items}
            loading={ranking.loading || ranking.loadingRanking}
            error={ranking.error}
            selectedPeriodId={ranking.selectedPeriodId}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
