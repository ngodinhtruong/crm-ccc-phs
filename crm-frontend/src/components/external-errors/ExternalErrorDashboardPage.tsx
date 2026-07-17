"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ListChecks, RefreshCw, SlidersHorizontal, Upload, X } from "lucide-react";

import {
  DateRangeFilter,
  FilterSelect,
  SearchInput,
} from "@/components/common";
import { useExternalErrorDashboard } from "@/hooks/useExternalErrorDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  CLASSIFICATION_STATUS_OPTIONS,
  EXTERNAL_ERROR_TYPE_OPTIONS,
  formatNumber,
  formatPercent,
} from "./ExternalErrorUtils";
import { ExternalErrorDashboardCharts } from "./ExternalErrorDashboardCharts";

function SummaryCard({
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
    sky: "border-sky-100 bg-sky-50 text-sky-700",
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
}

function getActiveFilterCount(dashboard: ReturnType<typeof useExternalErrorDashboard>) {
  return [
    dashboard.dateFrom,
    dashboard.dateTo,
    dashboard.source,
    dashboard.device,
    dashboard.errorType,
    dashboard.status,
    dashboard.needReview,
    dashboard.q,
  ].filter(Boolean).length;
}

function FilterPopover({
  dashboard,
  onClose,
}: {
  dashboard: ReturnType<typeof useExternalErrorDashboard>;
  onClose: () => void;
}) {
  const applyFilter = () => {
    void dashboard.reload();
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
            Lọc theo ngày, nguồn, thiết bị, loại lỗi, trạng thái phân loại và nội dung lỗi.
          </p>
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
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Trường ngày"
              value={dashboard.dateField}
              onChange={dashboard.setDateField}
              options={[
                { label: "Ngày nhận", value: "received_date" },
                { label: "Ngày hoàn thành", value: "completed_date" },
              ]}
              placeholder="Chọn trường ngày"
            />
          </div>

          <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-5">
            <DateRangeFilter
              fromLabel="Từ ngày"
              toLabel="Đến ngày"
              fromValue={dashboard.dateFrom}
              toValue={dashboard.dateTo}
              onFromChange={dashboard.setDateFrom}
              onToChange={dashboard.setDateTo}
            />
          </div>

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
              options={dashboard.sourceOptions}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Thiết bị"
              value={dashboard.device}
              onChange={dashboard.setDevice}
              options={dashboard.deviceOptions}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Loại lỗi"
              value={dashboard.errorType}
              onChange={dashboard.setErrorType}
              options={EXTERNAL_ERROR_TYPE_OPTIONS}
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
          className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}

export function ExternalErrorDashboardPage() {
  const dashboard = useExternalErrorDashboard();
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => getActiveFilterCount(dashboard), [
    dashboard.dateFrom,
    dashboard.dateTo,
    dashboard.source,
    dashboard.device,
    dashboard.errorType,
    dashboard.status,
    dashboard.needReview,
    dashboard.q,
  ]);

  const summary = dashboard.summary;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "Lỗi bên ngoài" },
        { label: "Dashboard lỗi" },
      ]}
      sidebarDefaultExpandedGroupKey="ccc-external-errors"
      sidebarDefaultActiveChildKey="external-error-dashboard"
      rightAction={
        <div className="relative flex items-center gap-2">
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
            onClick={() => setFilterOpen((value) => !value)}
            className={`relative flex h-8 items-center gap-1 rounded border px-3 text-xs font-semibold ${filterOpen || activeFilterCount > 0
              ? "border-[#0097cf] bg-sky-50 text-[#007ead]"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#0097cf] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && <FilterPopover dashboard={dashboard} onClose={() => setFilterOpen(false)} />}

          <button
            type="button"
            onClick={() => void dashboard.reload()}
            disabled={dashboard.loading}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
          >
            <RefreshCw size={15} className={dashboard.loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#0097cf] shadow-sm ring-1 ring-sky-100">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Dashboard lỗi bên ngoài</h1>
              <p className="mt-1 text-sm text-slate-500">
                Thống kê dữ liệu lỗi thô đã xử lý xong, được clean và phân loại bằng AWS Bedrock LLM.
              </p>
            </div>
          </div>
        </div>

        {dashboard.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {dashboard.error}
          </div>
        )}

        {dashboard.loading && !summary ? (
          <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            Đang tải Dashboard lỗi...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              <SummaryCard label="Tổng số lỗi" value={formatNumber(summary?.total_errors || 0)} subLabel="Dòng lỗi đã import" />
              <SummaryCard label="Đã phân loại" value={formatNumber(summary?.classified_errors || 0)} subLabel={`${formatPercent(summary?.classification_rate || 0)} dữ liệu`} tone="emerald" />
              <SummaryCard label="Chưa phân loại" value={formatNumber(summary?.unclassified_errors || 0)} subLabel="Chờ LLM xử lý" tone="amber" />
              <SummaryCard label="Cần kiểm tra" value={formatNumber(summary?.need_review_errors || 0)} subLabel="LLM chưa chắc chắn" tone="rose" />
              <SummaryCard label="Phân loại lỗi" value={formatNumber(summary?.by_error_type?.length || 0)} subLabel="Nhóm đang phát sinh" tone="violet" />
              <SummaryCard label="Lỗi lặp lại" value={formatNumber(summary?.recurring_issue_count || 0)} subLabel="Normalized issue" tone="slate" />
            </div>

            <ExternalErrorDashboardCharts charts={dashboard.charts} recurringIssues={dashboard.recurringIssues} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
