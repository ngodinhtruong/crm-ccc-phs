"use client";

import { CheckCircle2, RefreshCw } from "lucide-react";

import {
  ColumnSelectFilter,
  ColumnTextFilter,
  TableState,
} from "@/components/common";
import {
  ExternalErrorBatch,
  ExternalErrorCauseGroup,
  ExternalErrorCode,
  ExternalErrorGroup,
  ExternalErrorRecord,
} from "@/types/external-error.type";
import {
  CLASSIFICATION_STATUS_LABEL,
  formatConfidence,
  formatDateTime,
  statusBadgeClass,
} from "@/components/external-errors/ExternalErrorUtils";

const STATUS_OPTIONS = [
  { value: "UNCLASSIFIED", label: "Chưa phân loại" },
  { value: "CLASSIFIED", label: "Đã phân loại" },
  { value: "NEED_REVIEW", label: "Cần kiểm tra" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "FAILED", label: "Lỗi phân loại" },
];

const REVIEW_OPTIONS = [
  { value: "true", label: "Cần kiểm tra" },
  { value: "false", label: "Không cần kiểm tra" },
];

type ExternalErrorTableFilters = {
  q: string;
  onQChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
  device: string;
  onDeviceChange: (value: string) => void;
  batch: string;
  onBatchChange: (value: string) => void;
  errorGroup: string;
  onErrorGroupChange: (value: string) => void;
  errorCode: string;
  onErrorCodeChange: (value: string) => void;
  causeGroup: string;
  onCauseGroupChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  causeStatus: string;
  onCauseStatusChange: (value: string) => void;
  needReview: string;
  onNeedReviewChange: (value: string) => void;
  causeNeedReview: string;
  onCauseNeedReviewChange: (value: string) => void;
};

export function ExternalErrorTable({
  records,
  batches,
  groups,
  errorCodes,
  causeGroups,
  filters,
  loading,
  error,
  actionLoading,
  onClassify,
  onConfirm,
}: {
  records: ExternalErrorRecord[];
  batches: ExternalErrorBatch[];
  groups: ExternalErrorGroup[];
  errorCodes: ExternalErrorCode[];
  causeGroups: ExternalErrorCauseGroup[];
  filters: ExternalErrorTableFilters;
  loading: boolean;
  error: string;
  actionLoading: boolean;
  onClassify: (id: number, force?: boolean) => void;
  onConfirm: (record: ExternalErrorRecord) => void;
}) {
  return (
    <div className="table-scroll-container">
      <table className="data-table w-full min-w-[2800px] border-collapse text-left text-sm">
        <thead>
          <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
            <th className="w-[145px] min-w-[145px] px-4 font-semibold">Ngày nhận</th>
            <th className="w-[145px] min-w-[145px] px-4 font-semibold">Ngày hoàn thành</th>
            <th className="w-[130px] min-w-[130px] px-4 font-semibold">Nguồn</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Thiết bị</th>
            <th className="w-[190px] min-w-[190px] px-4 font-semibold">Batch</th>
            <th className="w-[330px] min-w-[330px] px-4 font-semibold">Nội dung lỗi</th>
            <th className="w-[190px] min-w-[190px] px-4 font-semibold">Nhóm lỗi</th>
            <th className="w-[210px] min-w-[210px] px-4 font-semibold">Mã lỗi</th>
            <th className="w-[300px] min-w-[300px] px-4 font-semibold">Nguyên nhân</th>
            <th className="w-[220px] min-w-[220px] px-4 font-semibold">Nhóm nguyên nhân</th>
            <th className="w-[145px] min-w-[145px] px-4 font-semibold">Tin cậy lỗi</th>
            <th className="w-[165px] min-w-[165px] px-4 font-semibold">Tin cậy nguyên nhân</th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Trạng thái lỗi</th>
            <th className="w-[190px] min-w-[190px] px-4 font-semibold">Trạng thái nguyên nhân</th>
            <th className="w-[135px] min-w-[135px] px-4 font-semibold">Thao tác</th>
          </tr>

          <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
            <th className="px-4 py-2.5" />
            <th className="px-4 py-2.5" />
            <th className="px-4 py-2.5">
              <ColumnTextFilter
                value={filters.source}
                onChange={filters.onSourceChange}
                placeholder="Nguồn"
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnTextFilter
                value={filters.device}
                onChange={filters.onDeviceChange}
                placeholder="Thiết bị"
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.batch}
                onChange={filters.onBatchChange}
                options={batches.map((item) => ({
                  value: String(item.id),
                  label: item.batch_code,
                }))}
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnTextFilter
                value={filters.q}
                onChange={filters.onQChange}
                placeholder="Nội dung / nguyên nhân"
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.errorGroup}
                onChange={filters.onErrorGroupChange}
                options={groups.map((item) => ({
                  value: String(item.id),
                  label: item.group_name,
                }))}
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.errorCode}
                onChange={filters.onErrorCodeChange}
                options={errorCodes.map((item) => ({
                  value: String(item.id),
                  label: `${item.error_code} - ${item.error_name}`,
                }))}
              />
            </th>
            <th className="px-4 py-2.5" />
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.causeGroup}
                onChange={filters.onCauseGroupChange}
                options={causeGroups.map((item) => ({
                  value: String(item.id),
                  label: item.cause_name,
                }))}
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.needReview}
                onChange={filters.onNeedReviewChange}
                options={REVIEW_OPTIONS}
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.causeNeedReview}
                onChange={filters.onCauseNeedReviewChange}
                options={REVIEW_OPTIONS}
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.status}
                onChange={filters.onStatusChange}
                options={STATUS_OPTIONS}
              />
            </th>
            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={filters.causeStatus}
                onChange={filters.onCauseStatusChange}
                options={STATUS_OPTIONS}
              />
            </th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>

        <tbody>
          <TableState
            loading={loading}
            error={error}
            empty={!loading && records.length === 0}
            colSpan={15}
            emptyText="Không có dữ liệu lỗi."
          />

          {!loading &&
            records.map((record) => (
              <tr
                key={record.id}
                className="border-b border-slate-100 align-top hover:bg-emerald-50"
              >
                <td className="px-4 text-slate-600 py-3 text-slate-600">
                  {formatDateTime(record.received_date)}
                </td>
                <td className="px-4 text-slate-600 py-3 text-slate-600">
                  {formatDateTime(record.completed_date)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record.clean_source || "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record.clean_device || "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record.batch_code || "-"}
                </td>
                <td className="max-w-[330px] px-3 py-3">
                  <div className="line-clamp-3 font-medium text-slate-700">
                    {record.clean_content || record.raw_content || "-"}
                  </div>
                  {record.normalized_issue && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      Chuẩn hóa: {record.normalized_issue}
                    </div>
                  )}
                  {record.classification_error && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-red-600">
                      {record.classification_error}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-700">
                    {record.error_group_name || "-"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {record.error_group_code || ""}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-700">
                    {record.error_code_value || "-"}
                  </div>
                  <div className="max-w-[210px] text-[11px] text-slate-500">
                    {record.error_code_name || ""}
                  </div>
                </td>
                <td className="max-w-[300px] px-3 py-3">
                  <div className="line-clamp-3 font-medium text-slate-700">
                    {record.clean_cause || record.raw_cause || "-"}
                  </div>
                  {record.normalized_cause && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                      Chuẩn hóa: {record.normalized_cause}
                    </div>
                  )}
                  {record.cause_classification_error && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-red-600">
                      {record.cause_classification_error}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-700">
                    {record.cause_group_name || "-"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {record.cause_group_code || ""}
                  </div>
                </td>
                <td className="px-4 text-slate-600 py-3 text-slate-600">
                  {formatConfidence(record.classification_confidence)}
                  {record.need_review && (
                    <div className="mt-1 text-[11px] font-medium text-amber-600">
                      Cần kiểm tra
                    </div>
                  )}
                </td>
                <td className="px-4 text-slate-600 py-3 text-slate-600">
                  {formatConfidence(record.cause_classification_confidence)}
                  {record.cause_need_review && (
                    <div className="mt-1 text-[11px] font-medium text-amber-600">
                      Cần kiểm tra
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${statusBadgeClass(
                      record.classification_status
                    )}`}
                  >
                    {CLASSIFICATION_STATUS_LABEL[
                      record.classification_status
                    ] || record.classification_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${statusBadgeClass(
                      record.cause_classification_status
                    )}`}
                  >
                    {CLASSIFICATION_STATUS_LABEL[
                      record.cause_classification_status
                    ] || record.cause_classification_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        onClassify(
                          record.id,
                          record.classification_status !== "UNCLASSIFIED" ||
                            record.cause_classification_status !== "UNCLASSIFIED"
                        )
                      }
                      className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw size={12} />
                      Phân loại lại
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onConfirm(record)}
                      className="inline-flex h-7 items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} />
                      Xác nhận mã
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
