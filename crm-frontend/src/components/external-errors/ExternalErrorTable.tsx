"use client";

import { CheckCircle2, RefreshCw } from "lucide-react";

import {
  ColumnBooleanFilter,
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
  TableState,
} from "@/components/common";
import type { useExternalErrors } from "@/hooks/useExternalErrors";
import { ExternalErrorRecord } from "@/types/external-error.type";
import {
  CLASSIFICATION_STATUS_OPTIONS,
  EXTERNAL_ERROR_TYPE_OPTIONS,
  formatDate,
  formatDateTime,
  formatPercent,
  getClassificationStatusLabel,
  getErrorTypeLabel,
  truncateText,
} from "./ExternalErrorUtils";

function StatusBadge({ value }: { value?: string | null }) {
  const label = getClassificationStatusLabel(value);
  const className =
    value === "CONFIRMED"
      ? "bg-emerald-100 text-emerald-700"
      : value === "CLASSIFIED"
        ? "bg-sky-100 text-sky-700"
        : value === "NEED_REVIEW"
          ? "bg-amber-100 text-amber-700"
          : value === "FAILED"
            ? "bg-red-100 text-red-700"
            : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function ReviewBadge({ value }: { value?: boolean }) {
  if (value) {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
        Cần kiểm tra
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
      OK
    </span>
  );
}

function ErrorTypeBadge({ record }: { record: ExternalErrorRecord }) {
  const label = record.error_type_label || record.error_type_name || getErrorTypeLabel(record.error_type_code);

  if (!record.error_type_code) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <span className="inline-flex rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
      {label}
    </span>
  );
}

export function ExternalErrorTable({
  state,
}: {
  state: ReturnType<typeof useExternalErrors>;
}) {
  const batches = state.batches.map((item) => ({
    label: `${item.batch_code}${item.file_name ? ` - ${item.file_name}` : ""}`,
    value: String(item.id),
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[2100px] border-collapse text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-white text-slate-700">
            <th className="sticky left-0 z-20 w-[150px] bg-white px-3 font-semibold">Thao tác</th>
            <th className="w-[140px] px-3 font-semibold">Ngày nhận</th>
            <th className="w-[150px] px-3 font-semibold">Ngày hoàn thành</th>
            <th className="w-[150px] px-3 font-semibold">Nguồn</th>
            <th className="w-[160px] px-3 font-semibold">Thiết bị</th>
            <th className="w-[150px] px-3 font-semibold">Kết quả</th>
            <th className="w-[320px] px-3 font-semibold">Nội dung</th>
            <th className="w-[280px] px-3 font-semibold">Nguyên nhân</th>
            <th className="w-[280px] px-3 font-semibold">Giải pháp</th>
            <th className="w-[180px] px-3 font-semibold">Loại lỗi</th>
            <th className="w-[220px] px-3 font-semibold">Vấn đề chuẩn hóa</th>
            <th className="w-[110px] px-3 font-semibold">Tin cậy</th>
            <th className="w-[150px] px-3 font-semibold">Trạng thái</th>
            <th className="w-[130px] px-3 font-semibold">Review</th>
            <th className="w-[170px] px-3 font-semibold">Batch</th>
            <th className="w-[160px] px-3 font-semibold">Ngày phân loại</th>
          </tr>

          <tr className="border-b bg-[#f8fafc] align-top">
            <th className="sticky left-0 z-20 bg-[#f8fafc] px-2 py-2" />
            <th className="px-2 py-2" colSpan={2}>
              <ColumnDateRangeFilter
                fromValue={state.dateFrom}
                toValue={state.dateTo}
                onFromChange={state.setDateFrom}
                onToChange={state.setDateTo}
              />
            </th>
            <th className="px-2 py-2">
              <ColumnTextFilter value={state.source} onChange={state.setSource} placeholder="Nguồn" />
            </th>
            <th className="px-2 py-2">
              <ColumnTextFilter value={state.device} onChange={state.setDevice} placeholder="Thiết bị" />
            </th>
            <th className="px-2 py-2" />
            <th className="px-2 py-2">
              <ColumnTextFilter value={state.q} onChange={state.setQ} placeholder="Tìm nội dung" />
            </th>
            <th className="px-2 py-2" />
            <th className="px-2 py-2" />
            <th className="px-2 py-2">
              <ColumnSelectFilter value={state.errorType} onChange={state.setErrorType} options={EXTERNAL_ERROR_TYPE_OPTIONS} />
            </th>
            <th className="px-2 py-2">
              <ColumnTextFilter value={state.issue} onChange={state.setIssue} placeholder="Vấn đề" />
            </th>
            <th className="px-2 py-2" />
            <th className="px-2 py-2">
              <ColumnSelectFilter value={state.status} onChange={state.setStatus} options={CLASSIFICATION_STATUS_OPTIONS} />
            </th>
            <th className="px-2 py-2">
              <ColumnBooleanFilter value={state.needReview} onChange={state.setNeedReview} trueLabel="Cần" falseLabel="Không" />
            </th>
            <th className="px-2 py-2">
              <ColumnSelectFilter value={state.batch} onChange={state.setBatch} options={batches} />
            </th>
            <th className="px-2 py-2" />
          </tr>
        </thead>

        <tbody>
          <TableState
            loading={state.loading}
            error={state.error}
            empty={!state.loading && state.records.length === 0}
            colSpan={16}
            emptyText="Không có dữ liệu lỗi."
          />

          {!state.loading && state.records.map((record) => (
            <tr key={record.id} className="h-12 border-b border-slate-100 hover:bg-sky-50">
              <td className="sticky left-0 z-10 bg-white px-3 group-hover:bg-sky-50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void state.classifyRecord(record.id, true)}
                    disabled={state.actionLoading}
                    className="flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    title="Phân loại lại bằng LLM"
                  >
                    <RefreshCw size={12} />
                    LLM
                  </button>

                  <button
                    type="button"
                    onClick={() => void state.confirmRecord(record.id)}
                    disabled={state.actionLoading}
                    className="flex h-7 items-center gap-1 rounded border border-emerald-300 bg-white px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    title="Xác nhận phân loại"
                  >
                    <CheckCircle2 size={12} />
                    OK
                  </button>
                </div>
              </td>
              <td className="px-3 text-slate-600">{formatDate(record.received_date)}</td>
              <td className="px-3 text-slate-600">{formatDate(record.completed_date)}</td>
              <td className="px-3 font-medium text-slate-700">{record.clean_source || record.raw_source || "-"}</td>
              <td className="px-3 font-medium text-slate-700">{record.clean_device || record.raw_device || "-"}</td>
              <td className="px-3 text-slate-600">{record.clean_result || record.raw_result || "-"}</td>
              <td className="max-w-[320px] px-3 text-slate-700" title={record.clean_content || record.raw_content || ""}>
                {truncateText(record.clean_content || record.raw_content, 110)}
              </td>
              <td className="max-w-[280px] px-3 text-slate-600" title={record.clean_cause || record.raw_cause || ""}>
                {truncateText(record.clean_cause || record.raw_cause, 90)}
              </td>
              <td className="max-w-[280px] px-3 text-slate-600" title={record.clean_solution || record.raw_solution || ""}>
                {truncateText(record.clean_solution || record.raw_solution, 90)}
              </td>
              <td className="px-3"><ErrorTypeBadge record={record} /></td>
              <td className="max-w-[220px] px-3 font-medium text-slate-700" title={record.normalized_issue || ""}>
                {truncateText(record.normalized_issue, 70)}
              </td>
              <td className="px-3 font-semibold text-slate-700">
                {record.classification_confidence !== null && record.classification_confidence !== undefined
                  ? formatPercent(Number(record.classification_confidence) * 100)
                  : "-"}
              </td>
              <td className="px-3"><StatusBadge value={record.classification_status} /></td>
              <td className="px-3"><ReviewBadge value={record.need_review} /></td>
              <td className="px-3 text-slate-600">{record.batch_code || "-"}</td>
              <td className="px-3 text-slate-600">{formatDateTime(record.classified_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
