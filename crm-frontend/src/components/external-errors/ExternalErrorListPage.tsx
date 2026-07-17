"use client";

import Link from "next/link";
import { BarChart3, RefreshCw, Sparkles, Upload } from "lucide-react";

import {
  DateRangeFilter,
  FilterSelect,
  SearchInput,
  TablePagination,
  TableToolbar,
} from "@/components/common";
import { useExternalErrors } from "@/hooks/useExternalErrors";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  CLASSIFICATION_STATUS_OPTIONS,
  EXTERNAL_ERROR_TYPE_OPTIONS,
} from "./ExternalErrorUtils";
import { ExternalErrorTable } from "./ExternalErrorTable";

export function ExternalErrorListPage() {
  const state = useExternalErrors();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "Lỗi bên ngoài" },
        { label: "Danh sách lỗi" },
      ]}
      sidebarDefaultExpandedGroupKey="ccc-external-errors"
      sidebarDefaultActiveChildKey="external-error-list"
      rightAction={
        <div className="flex items-center gap-2">
          <Link
            href="/external-errors/dashboard"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <BarChart3 size={15} />
            Dashboard lỗi
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
            onClick={() => void state.bulkClassifyMatching(false)}
            disabled={state.actionLoading || state.loading}
            className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
          >
            <Sparkles size={15} />
            Phân loại dòng đang lọc
          </button>

          <button
            type="button"
            onClick={state.reload}
            disabled={state.loading}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
          >
            <RefreshCw size={15} className={state.loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between border-b bg-white px-4">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">Danh sách lỗi bên ngoài</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Theo dõi dữ liệu lỗi thô sau khi clean và phân loại bằng LLM.
            </p>
          </div>

          <TablePagination
            fromRecord={state.fromRecord}
            toRecord={state.toRecord}
            count={state.count}
            page={state.page}
            totalPages={state.totalPages}
            loading={state.loading}
            onPrevious={state.goPrevious}
            onNext={state.goNext}
          />
        </div>

        {state.error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {state.error}
          </div>
        )}

        {state.notice && (
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
            {state.notice}
          </div>
        )}

        <TableToolbar onSearch={state.search} onClear={state.clearFilter}>
          <div className="col-span-12 md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500">Tìm kiếm</label>
            <SearchInput
              value={state.q}
              onChange={state.setQ}
              placeholder="Nội dung / nguyên nhân / giải pháp"
            />
          </div>

          <div className="col-span-12 md:col-span-2">
            <FilterSelect
              label="Trường ngày"
              value={state.dateField}
              onChange={state.setDateField}
              placeholder="Chọn trường ngày"
              options={[
                { label: "Ngày nhận", value: "received_date" },
                { label: "Ngày hoàn thành", value: "completed_date" },
              ]}
            />
          </div>

          <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-3">
            <DateRangeFilter
              fromValue={state.dateFrom}
              toValue={state.dateTo}
              onFromChange={state.setDateFrom}
              onToChange={state.setDateTo}
            />
          </div>

          <div className="col-span-12 md:col-span-2">
            <FilterSelect
              label="Loại lỗi"
              value={state.errorType}
              onChange={state.setErrorType}
              options={EXTERNAL_ERROR_TYPE_OPTIONS}
            />
          </div>

          <div className="col-span-12 md:col-span-2">
            <FilterSelect
              label="Trạng thái"
              value={state.status}
              onChange={state.setStatus}
              options={CLASSIFICATION_STATUS_OPTIONS}
            />
          </div>
        </TableToolbar>

        <ExternalErrorTable state={state} />
      </div>
    </DashboardLayout>
  );
}
