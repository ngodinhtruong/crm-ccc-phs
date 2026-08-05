"use client";

import Link from "next/link";
import { Calendar, ChevronDown, FileSpreadsheet, Plus, RefreshCw, Sparkles, Tags, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  DateRangeFilter,
  FilterSelect,
  TablePagination,
} from "@/components/common";
import { ExternalErrorTable } from "@/components/external-errors/ExternalErrorTable";
import { useExternalErrors } from "@/hooks/useExternalErrors";
import { DashboardLayout } from "@/layouts/DashboardLayout";

function DateFilterButton({ state }: { state: ReturnType<typeof useExternalErrors> }) {
  const [open, setOpen] = useState(false);

  const dateFieldLabel =
    state.dateField === "completed_date" ? "Ngày hoàn thành" : "Ngày nhận";

  const dateRangeText = useMemo(() => {
    if (state.dateFrom && state.dateTo) {
      return `${state.dateFrom} - ${state.dateTo}`;
    }
    if (state.dateFrom) return `Từ ${state.dateFrom}`;
    if (state.dateTo) return `Đến ${state.dateTo}`;
    return "Tất cả thời gian";
  }, [state.dateFrom, state.dateTo]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Calendar size={14} className="text-emerald-600" />
        <span>
          {dateFieldLabel}: <span className="font-normal text-slate-600">{dateRangeText}</span>
        </span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[340px] rounded-md border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold text-slate-800">
              Bộ lọc thời gian
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <FilterSelect
              label="Trường thời gian"
              value={state.dateField}
              onChange={state.setDateField}
              options={[
                { value: "received_date", label: "Ngày nhận" },
                { value: "completed_date", label: "Ngày hoàn thành" },
              ]}
              placeholder="Chọn trường ngày"
            />

            <div className="grid grid-cols-2 gap-3">
              <DateRangeFilter
                fromLabel="Từ ngày"
                toLabel="Đến ngày"
                fromValue={state.dateFrom}
                toValue={state.dateTo}
                onFromChange={state.setDateFrom}
                onToChange={state.setDateTo}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  state.clearFilter();
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Xóa lọc
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#059669]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExternalErrorListPage() {
  const state = useExternalErrors();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Lỗi bên ngoài" },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void state.bulkClassifyMatching(false)}
            disabled={state.actionLoading || state.loading}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition"
            title="Tự động chạy LLM Bedrock phân loại các record chưa có nhóm lỗi / mã lỗi"
          >
            <Sparkles size={14} className={state.actionLoading ? "animate-spin" : ""} />
            Phân loại chưa phân loại
          </button>
          <Link
            href="/external-errors/error-catalogs"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Tags size={14} />
            Nhóm lỗi - Mã lỗi
          </Link>
          <Link
            href="/external-errors/import"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FileSpreadsheet size={14} />
            Import Excel
          </Link>
          <Link
            href="/external-errors/create"
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669]"
          >
            <Plus size={14} />
            Thêm lỗi
          </Link>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Danh sách lỗi bên ngoài
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Dữ liệu mới được tự động phân loại theo danh mục nhóm và mã lỗi Active.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DateFilterButton state={state} />

            <button
              type="button"
              onClick={state.reload}
              disabled={state.loading}
              className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Tải lại
            </button>
          </div>
        </div>

        {(state.error || state.notice) && (
          <div
            className={`border-b px-4 py-2 text-xs ${
              state.error
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {state.error || state.notice}
          </div>
        )}

        <ExternalErrorTable
          records={state.records}
          batches={state.batches}
          groups={state.groups}
          errorCodes={state.availableErrorCodes}
          causeGroups={state.causeGroups}
          filters={{
            q: state.q,
            onQChange: state.setQ,
            source: state.source,
            onSourceChange: state.setSource,
            device: state.device,
            onDeviceChange: state.setDevice,
            batch: state.batch,
            onBatchChange: state.setBatch,
            errorGroup: state.errorGroup,
            onErrorGroupChange: state.setErrorGroup,
            errorCode: state.errorCode,
            onErrorCodeChange: state.setErrorCode,
            causeGroup: state.causeGroup,
            onCauseGroupChange: state.setCauseGroup,
            status: state.status,
            onStatusChange: state.setStatus,
            causeStatus: state.causeStatus,
            onCauseStatusChange: state.setStatus,
            needReview: state.needReview,
            onNeedReviewChange: state.setNeedReview,
            causeNeedReview: state.causeNeedReview,
            onCauseNeedReviewChange: state.setCauseNeedReview,
          }}
          loading={state.loading}
          error=""
          actionLoading={state.actionLoading}
          onClassify={state.classifyRecord}
          onBulkClassifySelected={state.bulkClassifySelected}
        />

        <div className="flex items-center justify-end border-t px-4 py-3">
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
      </div>
    </DashboardLayout>
  );
}
