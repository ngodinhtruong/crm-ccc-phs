import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckSquare, Square } from "lucide-react";

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
  onBulkClassifySelected,
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
  onBulkClassifySelected?: (ids: number[], force?: boolean) => void;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const allSelected =
    records.length > 0 && selectedIds.length === records.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkClassify = (force = false) => {
    if (onBulkClassifySelected && selectedIds.length > 0) {
      onBulkClassifySelected(selectedIds, force);
    }
  };

  return (
    <div className="relative">
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-900 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-800">
              Đã chọn {selectedIds.length} dòng dữ liệu
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkClassify(false)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <Sparkles size={13} className={actionLoading ? "animate-spin" : ""} />
              Phân loại {selectedIds.length} dòng đã chọn
            </button>

            <button
              type="button"
              onClick={() => handleBulkClassify(true)}
              disabled={actionLoading}
              className="flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/50 disabled:opacity-50 transition"
              title="Phân loại lại ngay cả khi đã có nhóm lỗi/mã lỗi"
            >
              Phân loại lại (Ghi đè)
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-500 hover:text-slate-800 ml-2"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <div className="table-scroll-container">
        <table className="data-table w-full min-w-[1650px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-9 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-[40px] min-w-[40px] px-2 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  title="Chọn tất cả các dòng"
                />
              </th>
              <th className="w-[100px] min-w-[100px] px-2 text-center font-semibold">Thao tác</th>
              <th className="w-[115px] min-w-[115px] px-2.5 font-semibold">Ngày nhận</th>
              <th className="w-[115px] min-w-[115px] px-2.5 font-semibold">Ngày hoàn thành</th>
              <th className="w-[90px] min-w-[90px] px-2.5 font-semibold">Nguồn</th>
              <th className="w-[100px] min-w-[100px] px-2.5 font-semibold">Thiết bị</th>
              <th className="w-[110px] min-w-[110px] px-2.5 font-semibold">Trạng thái xử lý</th>
              <th className="w-[250px] min-w-[250px] px-2.5 font-semibold">Nội dung lỗi</th>
              <th className="w-[200px] min-w-[200px] px-2.5 font-semibold">Nguyên nhân</th>
              <th className="w-[200px] min-w-[200px] px-2.5 font-semibold">Giải pháp</th>
              <th className="w-[150px] min-w-[150px] px-2.5 font-semibold">Nhóm lỗi</th>
              <th className="w-[160px] min-w-[160px] px-2.5 font-semibold">Mã lỗi</th>
              <th className="w-[160px] min-w-[160px] px-2.5 font-semibold">Nhóm nguyên nhân</th>
            </tr>

            <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
              <th className="px-2 py-1.5" />
              <th className="px-2 py-1.5" />
              <th className="px-2.5 py-1.5" />
              <th className="px-2.5 py-1.5" />
              <th className="px-2.5 py-1.5">
                <ColumnTextFilter
                  value={filters.source}
                  onChange={filters.onSourceChange}
                  placeholder="Nguồn"
                />
              </th>
              <th className="px-2.5 py-1.5">
                <ColumnTextFilter
                  value={filters.device}
                  onChange={filters.onDeviceChange}
                  placeholder="Thiết bị"
                />
              </th>
              <th className="px-2.5 py-1.5" />
              <th className="px-2.5 py-1.5">
                <ColumnTextFilter
                  value={filters.q}
                  onChange={filters.onQChange}
                  placeholder="Nội dung / nguyên nhân"
                />
              </th>
              <th className="px-2.5 py-1.5" />
              <th className="px-2.5 py-1.5" />
              <th className="px-2.5 py-1.5">
                <ColumnSelectFilter
                  value={filters.errorGroup}
                  onChange={filters.onErrorGroupChange}
                  options={groups.map((item) => ({
                    value: String(item.id),
                    label: item.group_name,
                  }))}
                />
              </th>
              <th className="px-2.5 py-1.5">
                <ColumnSelectFilter
                  value={filters.errorCode}
                  onChange={filters.onErrorCodeChange}
                  options={errorCodes.map((item) => ({
                    value: String(item.id),
                    label: `${item.error_code} - ${item.error_name}`,
                  }))}
                />
              </th>
              <th className="px-2.5 py-1.5">
                <ColumnSelectFilter
                  value={filters.causeGroup}
                  onChange={filters.onCauseGroupChange}
                  options={causeGroups.map((item) => ({
                    value: String(item.id),
                    label: item.cause_name,
                  }))}
                />
              </th>
            </tr>
          </thead>

        <tbody>
          <TableState
            loading={loading}
            error={error}
            empty={!loading && records.length === 0}
            colSpan={13}
            emptyText="Không có dữ liệu lỗi."
          />

          {!loading &&
            records.map((record) => (
              <tr
                key={record.id}
                onClick={() => router.push(`/external-errors/${record.id}`)}
                className={`border-b border-slate-100 align-top transition-colors hover:bg-emerald-50/70 cursor-pointer ${selectedIds.includes(record.id) ? "bg-emerald-50/40" : ""}`}
                title="Bấm để xem chi tiết / chỉnh sửa"
              >
                <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={() => toggleSelectRow(record.id)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </td>
                <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onClassify(record.id)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
                    title="Tự động phân loại dòng lỗi này bằng LLM"
                  >
                    <Sparkles size={12} className={actionLoading ? "animate-spin" : ""} />
                    Phân loại
                  </button>
                </td>
                <td className="px-2.5 py-2 text-[11px] text-slate-600 whitespace-nowrap">
                  {formatDateTime(record.received_date)}
                </td>
                <td className="px-2.5 py-2 text-[11px] text-slate-600 whitespace-nowrap">
                  {formatDateTime(record.completed_date)}
                </td>
                <td
                  className="px-2.5 py-2 text-xs text-slate-700 font-medium truncate max-w-[90px]"
                  title={record.raw_source || record.clean_source || ""}
                >
                  {record.raw_source || record.clean_source || "-"}
                </td>
                <td
                  className="px-2.5 py-2 text-xs text-slate-700 font-medium truncate max-w-[100px]"
                  title={record.raw_device || record.clean_device || ""}
                >
                  {record.raw_device || record.clean_device || "-"}
                </td>
                <td
                  className="px-2.5 py-2 text-xs text-slate-700 truncate max-w-[110px]"
                  title={record.raw_result || record.clean_result || ""}
                >
                  {record.raw_result || record.clean_result || "-"}
                </td>
                <td className="max-w-[250px] px-2.5 py-2">
                  <div
                    className="line-clamp-2 text-xs font-semibold text-slate-800 leading-snug break-words"
                    title={record.raw_content || record.clean_content || ""}
                  >
                    {record.raw_content || record.clean_content || "-"}
                  </div>
                  {record.normalized_issue && (
                    <div className="mt-0.5 line-clamp-1 text-[10px] text-slate-400 truncate">
                      Chuẩn hóa: {record.normalized_issue}
                    </div>
                  )}
                  {record.classification_error && (
                    <div className="mt-0.5 line-clamp-1 text-[10px] text-red-600 truncate">
                      {record.classification_error}
                    </div>
                  )}
                </td>
                <td className="max-w-[200px] px-2.5 py-2">
                  <div
                    className="line-clamp-2 text-xs text-slate-700 leading-snug break-words"
                    title={record.raw_cause || record.clean_cause || ""}
                  >
                    {record.raw_cause || record.clean_cause || "-"}
                  </div>
                </td>
                <td className="max-w-[200px] px-2.5 py-2">
                  <div
                    className="line-clamp-2 text-xs text-slate-700 leading-snug break-words"
                    title={record.raw_solution || record.clean_solution || ""}
                  >
                    {record.raw_solution || record.clean_solution || "-"}
                  </div>
                </td>
                <td className="px-2.5 py-2">
                  <div
                    className="text-xs font-semibold text-slate-800 truncate max-w-[150px]"
                    title={record.error_group_name || ""}
                  >
                    {record.error_group_name || "-"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                    {record.error_group_code || ""}
                  </div>
                </td>
                <td className="px-2.5 py-2">
                  {record.error_code_value ? (
                    <div>
                      <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        {record.error_code_value}
                      </span>
                      <div
                        className="mt-0.5 max-w-[160px] text-[10px] text-slate-600 truncate"
                        title={record.error_code_name || ""}
                      >
                        {record.error_code_name || ""}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">-</span>
                  )}
                </td>
                <td className="px-2.5 py-2">
                  <div
                    className="text-xs font-semibold text-slate-800 truncate max-w-[160px]"
                    title={record.cause_group_name || ""}
                  >
                    {record.cause_group_name || "-"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                    {record.cause_group_code || ""}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
  );
}
