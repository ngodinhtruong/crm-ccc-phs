"use client";

import Link from "next/link";
import { FileSpreadsheet, Plus, RefreshCw, Tags } from "lucide-react";
import { useMemo, useState } from "react";

import {
  DateRangeFilter,
  FilterSelect,
  TablePagination,
} from "@/components/common";
import { ExternalErrorTable } from "@/components/external-errors/ExternalErrorTable";
import { useExternalErrors } from "@/hooks/useExternalErrors";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ExternalErrorRecord } from "@/types/external-error.type";

export function ExternalErrorListPage() {
  const state = useExternalErrors();
  const [confirmingRecord, setConfirmingRecord] =
    useState<ExternalErrorRecord | null>(null);
  const [confirmErrorCode, setConfirmErrorCode] = useState("");

  const confirmCodeOptions = useMemo(
    () =>
      state.errorCodes
        .filter(
          (item) =>
            item.is_active &&
            (!confirmingRecord?.error_group_id ||
              item.group === confirmingRecord.error_group_id)
        )
        .map((item) => ({
          value: String(item.id),
          label: `${item.error_code} - ${item.error_name}`,
        })),
    [confirmingRecord, state.errorCodes]
  );

  const openConfirm = (record: ExternalErrorRecord) => {
    setConfirmingRecord(record);
    setConfirmErrorCode(
      record.error_code ? String(record.error_code) : ""
    );
  };

  const submitConfirm = async () => {
    if (!confirmingRecord || !confirmErrorCode) return;

    await state.confirmRecord(
      confirmingRecord.id,
      Number(confirmErrorCode)
    );
    setConfirmingRecord(null);
    setConfirmErrorCode("");
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Lỗi bên ngoài" },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <Link
            href="/external-errors/catalogs"
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
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
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

        <div className="flex flex-wrap items-end gap-3 border-b bg-[#f8fafc] px-4 py-3">
          <div className="w-full sm:w-[190px]">
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
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:w-[380px]">
            <DateRangeFilter
              fromLabel="Từ ngày"
              toLabel="Đến ngày"
              fromValue={state.dateFrom}
              toValue={state.dateTo}
              onFromChange={state.setDateFrom}
              onToChange={state.setDateTo}
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-xs text-slate-500 lg:block">
              Mặc định hiển thị dữ liệu từ đầu năm đến ngày hiện tại.
            </p>
            <button
              type="button"
              onClick={state.clearFilter}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          </div>
        </div>

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
            onCauseStatusChange: state.setCauseStatus,
            needReview: state.needReview,
            onNeedReviewChange: state.setNeedReview,
            causeNeedReview: state.causeNeedReview,
            onCauseNeedReviewChange: state.setCauseNeedReview,
          }}
          loading={state.loading}
          error=""
          actionLoading={state.actionLoading}
          onClassify={state.classifyRecord}
          onConfirm={openConfirm}
        />

        <div className="flex items-center justify-between border-t px-4 py-3">
          <button
            type="button"
            disabled={state.actionLoading}
            onClick={() => state.bulkClassifyMatching(false)}
            className="h-8 rounded border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
          >
            Phân loại các dòng đang lọc
          </button>

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

      {confirmingRecord && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-xl">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Xác nhận mã lỗi
              </h2>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {confirmingRecord.clean_content ||
                  confirmingRecord.raw_content}
              </p>
            </div>

            <div className="space-y-3 p-4">
              <label className="block text-xs font-medium text-slate-600">
                Mã lỗi <span className="text-red-500">*</span>
              </label>
              <select
                value={confirmErrorCode}
                onChange={(event) =>
                  setConfirmErrorCode(event.target.value)
                }
                className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400"
              >
                <option value="">Chọn mã lỗi</option>
                {confirmCodeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingRecord(null)}
                  className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    !confirmErrorCode || state.actionLoading
                  }
                  onClick={() => void submitConfirm()}
                  className="h-9 rounded bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
