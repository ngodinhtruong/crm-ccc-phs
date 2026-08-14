"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useState } from "react";
import { AlertTriangle, ListChecks, RefreshCw, SlidersHorizontal, Upload, X } from "lucide-react";

import {
  CccPeriodControls,
  DateRangeFilter,
  FilterSelect,
  SearchInput,
} from "@/components/common";
import { useExternalErrorDashboard } from "@/hooks/useExternalErrorDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  CLASSIFICATION_STATUS_OPTIONS,
  formatNumber,
  formatPercent,
} from "./ExternalErrorUtils";

const ExternalErrorDashboardCharts = dynamic(
  () =>
    import("./ExternalErrorDashboardCharts").then(
      (module) => module.ExternalErrorDashboardCharts
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[340px] animate-pulse rounded-md border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>
    ),
  }
);

const SummaryCard = memo(function SummaryCard({
  label,
  value,
  subLabel,
  tone = "sky",
}: {
  label: string;
  value: string | number;
  subLabel?: string;
  tone?: "sky" | "emerald" | "amber" | "rose" | "slate" | "violet";
}) {
  const toneClass: Record<string, string> = {
    sky: "border-emerald-100 bg-emerald-50 text-emerald-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  };

  return (
    <div className={`rounded-md border p-4 shadow-sm ${toneClass[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {subLabel && <p className="mt-1 text-[11px] opacity-70">{subLabel}</p>}
    </div>
  );
});

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-[112px] animate-pulse rounded-md border border-slate-200 bg-slate-50"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[340px] animate-pulse rounded-md border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}

function FilterPopover({
  dashboard,
  onClose,
}: {
  dashboard: ReturnType<typeof useExternalErrorDashboard>;
  onClose: () => void;
}) {
  const applyFilter = () => {
    dashboard.applyFilters();
    onClose();
  };

  const clearFilter = () => {
    dashboard.clearFilter();
    onClose();
  };

  return (
    <div className="absolute right-0 top-10 z-[80] w-[min(92vw,960px)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Bộ lọc Dashboard lỗi</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Lọc theo thời gian, nguồn, thiết bị, nhóm lỗi, nhóm nguyên nhân, trạng thái và nội dung lỗi.
          </p>
          {dashboard.catalogsLoading && (
            <p className="mt-1 text-[11px] font-medium text-sky-600">
              Đang tải danh mục bộ lọc...
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={15} />
        </button>
      </div>

      <div className="max-h-[calc(100vh-160px)] overflow-y-auto bg-[#f8fafc] px-4 py-3">
        <div className="mb-4 rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Thời gian
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Chọn trường ngày và khoảng thời gian dùng cho toàn bộ Dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={dashboard.resetDraftDateRange}
              disabled={dashboard.fetching}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Từ đầu năm
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FilterSelect
              label="Trường thời gian"
              value={dashboard.dateField}
              onChange={dashboard.setDateField}
              options={[
                { label: "Ngày nhận", value: "received_date" },
                { label: "Ngày hoàn thành", value: "completed_date" },
              ]}
              placeholder="Chọn trường ngày"
            />

            <DateRangeFilter
              fromLabel="Từ ngày"
              toLabel="Đến ngày"
              fromValue={dashboard.dateFrom}
              toValue={dashboard.dateTo}
              onFromChange={dashboard.setDateFrom}
              onToChange={dashboard.setDateTo}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-slate-500">Tìm kiếm</label>
            <SearchInput
              value={dashboard.q}
              onChange={dashboard.setQ}
              placeholder="Nội dung / nguyên nhân / giải pháp"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Nguồn"
              value={dashboard.source}
              onChange={dashboard.setSource}
              options={dashboard.sourceOptions ?? []}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Thiết bị"
              value={dashboard.device}
              onChange={dashboard.setDevice}
              options={dashboard.deviceOptions ?? []}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Nhóm lỗi"
              value={dashboard.errorType}
              onChange={dashboard.setErrorType}
              options={dashboard.errorTypeOptions ?? []}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Nhóm nguyên nhân"
              value={dashboard.causeGroup}
              onChange={dashboard.setCauseGroup}
              options={dashboard.causeGroupOptions ?? []}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Trạng thái phân loại"
              value={dashboard.status}
              onChange={dashboard.setStatus}
              options={CLASSIFICATION_STATUS_OPTIONS}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Cần kiểm tra"
              value={dashboard.needReview}
              onChange={dashboard.setNeedReview}
              options={[
                { label: "Có", value: "true" },
                { label: "Không", value: "false" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t bg-white px-4 py-3">
        <button
          type="button"
          onClick={clearFilter}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Xóa lọc
        </button>
        <button
          type="button"
          onClick={applyFilter}
          disabled={!dashboard.hasPendingFilters || dashboard.fetching}
          className="h-9 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}

export const ExecutiveOverviewGrid = memo(function ExecutiveOverviewGrid({
  summary,
}: {
  summary: any;
}) {
  const total = summary?.total_errors || 0;
  const classified = summary?.classified_errors || 0;
  const classifiedRate = formatPercent(summary?.classification_rate || 0);
  const unclassified = Math.max(0, total - classified);

  const causeClassified = summary?.cause_classified_errors || 0;
  const causeClassifiedRate = formatPercent(summary?.cause_classification_rate || 0);

  // Calculate Internal vs Customer detected errors based on exact source fields (clean_source / raw_source)
  const bySource = summary?.by_source || [];
  let internalCount = 0;
  let customerCount = 0;

  for (const item of bySource) {
    const sourceName = String(item.label || item.name || "").trim().toLowerCase();
    const val = Number(item.value ?? item.count ?? 0);

    if (
      sourceName === "nội bộ" ||
      sourceName === "noi bo" ||
      sourceName === "internal" ||
      sourceName.includes("tự phát hiện") ||
      sourceName.includes("tu phat hien") ||
      sourceName.includes("monitoring") ||
      sourceName.includes("hệ thống") ||
      sourceName.includes("he thong") ||
      sourceName.includes("nhân viên") ||
      sourceName.includes("staff")
    ) {
      internalCount += val;
    } else {
      customerCount += val;
    }
  }

  const internalRate = total > 0 ? formatPercent((internalCount / total) * 100) : "0%";
  const customerRate = total > 0 ? formatPercent((customerCount / total) * 100) : "0%";

  const errorTypesCount = summary?.by_error_type?.length || 0;
  const recurringCount = summary?.recurring_issue_count || 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: Tổng Quan Lỗi */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Quan Lỗi Import</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-emerald-900">{formatNumber(total)}</span>
              <span className="text-xs font-medium text-slate-500">dòng lỗi</span>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-2xs">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-emerald-100/60 pt-3">
          <div className="rounded-lg bg-emerald-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Đã phân loại</span>
            <span className="text-xs font-bold text-emerald-800">{formatNumber(classified)} ({classifiedRate})</span>
          </div>
          <div className="rounded-lg bg-amber-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Chưa phân loại</span>
            <span className="text-xs font-bold text-amber-800">{formatNumber(unclassified)}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Trạng Thái Xử Lý */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng Thái Xử Lý</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-sky-900">{classifiedRate}</span>
              <span className="text-xs font-medium text-slate-500">đã xử lý xong</span>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 shadow-2xs">
            <ListChecks size={18} />
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-sky-100/60 pt-3">
          <div className="rounded-lg bg-sky-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Đã xử lý xong</span>
            <span className="text-xs font-bold text-sky-800">{formatNumber(classified)}</span>
          </div>
          <div className="rounded-lg bg-amber-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Chưa xử lý xong</span>
            <span className="text-xs font-bold text-amber-800">{formatNumber(unclassified)}</span>
          </div>
        </div>
      </div>

      {/* Card 3: Nguồn Phát Hiện Lỗi */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nguồn Phát Hiện Lỗi</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-rose-900">{formatNumber(internalCount)}</span>
              <span className="text-xs font-medium text-slate-500">tự phát hiện ({internalRate})</span>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 shadow-2xs">
            <SlidersHorizontal size={18} />
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-rose-100/60 pt-3">
          <div className="rounded-lg bg-rose-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Tự phát hiện (Nội bộ)</span>
            <span className="text-xs font-bold text-rose-800">{formatNumber(internalCount)} ({internalRate})</span>
          </div>
          <div className="rounded-lg bg-amber-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Khách hàng phát hiện</span>
            <span className="text-xs font-bold text-amber-800">{formatNumber(customerCount)} ({customerRate})</span>
          </div>
        </div>
      </div>

      {/* Card 4: Lỗi Lặp Lại & Phổ Biến */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 via-white to-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sự Cố & Lỗi Lặp Lại</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-purple-900">{formatNumber(recurringCount)}</span>
              <span className="text-xs font-medium text-slate-500">sự cố</span>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 shadow-2xs">
            <RefreshCw size={18} />
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-purple-100/60 pt-3">
          <div className="rounded-lg bg-purple-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Normalized Issue</span>
            <span className="text-xs font-bold text-purple-800">{formatNumber(recurringCount)}</span>
          </div>
          <div className="rounded-lg bg-teal-100/40 p-2">
            <span className="block text-[11px] font-medium text-slate-500">Nhóm phân loại</span>
            <span className="text-xs font-bold text-teal-800">{formatNumber(errorTypesCount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export function ExternalErrorDashboardPage() {
  const dashboard = useExternalErrorDashboard();
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = dashboard.appliedFilterCount;

  const summary = dashboard.summary;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "Lỗi bên ngoài", href: "/external-errors" },
        { label: "Dashboard lỗi" },
      ]}
      sidebarDefaultExpandedGroupKey="ccc-external-errors"
      sidebarDefaultActiveChildKey="external-error-dashboard"
      rightAction={
        <div className="relative flex flex-wrap items-center gap-2">
          <CccPeriodControls
            granularity={dashboard.granularity}
            onGranularityChange={dashboard.setGranularity}
            compareMode={dashboard.compareMode}
            onCompareModeChange={dashboard.setCompareMode}
          />

          <Link
            href="/external-errors"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ListChecks size={15} />
            Danh sách lỗi
          </Link>

          <Link
            href="/external-errors/import"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Upload size={15} />
            Import
          </Link>

          <button
            type="button"
            onClick={() => {
              const nextOpen = !filterOpen;
              setFilterOpen(nextOpen);
              if (nextOpen) void dashboard.ensureCatalogs();
            }}
            className={`relative flex h-8 items-center gap-1 rounded border px-3 text-xs font-semibold ${filterOpen || activeFilterCount > 0
              ? "border-[#10b981] bg-emerald-50 text-[#059669]"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#10b981] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && <FilterPopover dashboard={dashboard} onClose={() => setFilterOpen(false)} />}

          <button
            type="button"
            onClick={() => void dashboard.reload()}
            disabled={dashboard.fetching}
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
          >
            <RefreshCw size={15} className={dashboard.fetching ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-[#059669] shadow-2xs">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Dashboard Lỗi Bên Ngoài
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Thống kê dữ liệu lỗi thô đã xử lý xong, được clean và phân loại bằng AWS Bedrock LLM.
              </p>
            </div>
          </div>
        </div>

        {dashboard.fetching && summary && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <RefreshCw size={13} className="animate-spin" />
            Đang cập nhật dữ liệu dashboard...
          </div>
        )}

        {dashboard.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {dashboard.error}
          </div>
        )}

        {dashboard.loading && !summary ? (
          <DashboardLoadingSkeleton />
        ) : (
          <>
            <ExecutiveOverviewGrid summary={summary} />
            <ExternalErrorDashboardCharts charts={dashboard.charts} recurringIssues={dashboard.recurringIssues} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
