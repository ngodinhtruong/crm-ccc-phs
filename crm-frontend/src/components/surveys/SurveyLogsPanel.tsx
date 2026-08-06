"use client";

import Link from "next/link";
import { Eye, MessageSquareHeart, RotateCcw } from "lucide-react";

import {
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
} from "@/components/common";
import type { SurveyColumnFilters, SurveyLog } from "@/types/survey.type";
import { formatSurveyDateTime } from "@/utils/survey-datetime.util";

const COLUMN_COUNT = 9;

const STATUS_OPTIONS = [
  { label: "Thành công", value: "SUCCESS" },
  { label: "Thất bại", value: "FAILED" },
];

// "Chưa chấm" đứng riêng chứ không nằm chung thang điểm: để trống nghĩa là
// khách chưa phản hồi, khác hẳn với chấm 0 điểm.
const RATING_OPTIONS = [
  { label: "Chưa chấm", value: "unrated" },
  ...[5, 4, 3, 2, 1, 0].map((score) => ({
    label: `${score} điểm`,
    value: String(score),
  })),
];

const SOURCE_OPTIONS = [
  { label: "Nhập tay", value: "MANUAL" },
  { label: "Import Excel", value: "IMPORT" },
];

/**
 * Lịch sử gửi khảo sát, có hàng lọc theo từng cột như bảng ticket.
 *
 * Đổ hết ra trang, không phân trang. Hàng lọc dính theo đầu bảng nên cuộn
 * xuống giữa danh sách vẫn đổi được bộ lọc.
 */
export function SurveyLogsPanel({
  rows,
  count,
  loading,
  filters,
  onFilterChange,
  onClearFilters,
}: {
  rows: SurveyLog[];
  count: number;
  loading: boolean;
  filters: SurveyColumnFilters;
  onFilterChange: <K extends keyof SurveyColumnFilters>(
    key: K,
    value: SurveyColumnFilters[K]
  ) => void;
  onClearFilters: () => void;
}) {
  const hasFilter = Object.values(filters).some(Boolean);

  // Backend chặn ở 200 dòng một lượt. Nói rõ khi bị cắt thay vì im lặng —
  // người dùng tưởng đã thấy hết rồi kết luận sai trên số liệu thiếu.
  const truncated = !loading && count > rows.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <MessageSquareHeart size={17} />
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Các cuộc khảo sát
              </h3>

              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {count}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Mọi lần gửi, cả thành công lẫn thất bại. Lọc ngay trên từng cột.
            </p>
          </div>
        </div>

        {truncated && (
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
            Đang hiển thị {rows.length} mới nhất trên tổng {count} — thu hẹp
            bằng bộ lọc để xem phần còn lại
          </span>
        )}

        {hasFilter && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={13} />
            Xóa lọc cột
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="h-10 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-[170px] min-w-[170px] px-4 text-xs font-semibold">
                Ngày gửi
              </th>
              <th className="w-[180px] min-w-[180px] px-4 text-xs font-semibold">
                Khách hàng
              </th>
              <th className="w-[140px] min-w-[140px] px-4 text-xs font-semibold">
                Số điện thoại
              </th>
              <th className="w-[220px] min-w-[220px] px-4 text-xs font-semibold">
                Ticket
              </th>
              <th className="w-[140px] min-w-[140px] px-4 text-xs font-semibold">
                Tình trạng
              </th>
              <th className="w-[130px] min-w-[130px] px-4 text-xs font-semibold">
                Rate
              </th>
              <th className="w-[140px] min-w-[140px] px-4 text-xs font-semibold">
                Nguồn
              </th>
              <th className="w-[150px] min-w-[150px] px-4 text-xs font-semibold">
                Người nhập
              </th>
              <th className="w-[90px] min-w-[90px] px-4" />
            </tr>

            <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
              <th className="px-3 py-2.5">
                <ColumnDateRangeFilter
                  fromValue={filters.startDate}
                  toValue={filters.endDate}
                  onFromChange={(value) => onFilterChange("startDate", value)}
                  onToChange={(value) => onFilterChange("endDate", value)}
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={filters.customer}
                  onChange={(value) => onFilterChange("customer", value)}
                  placeholder="Tên KH"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={filters.phone}
                  onChange={(value) => onFilterChange("phone", value)}
                  placeholder="Số ĐT"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={filters.ticketCode}
                  onChange={(value) => onFilterChange("ticketCode", value)}
                  placeholder="Mã ticket"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnSelectFilter
                  value={filters.sendStatus}
                  onChange={(value) => onFilterChange("sendStatus", value)}
                  options={STATUS_OPTIONS}
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnSelectFilter
                  value={filters.rating}
                  onChange={(value) => onFilterChange("rating", value)}
                  options={RATING_OPTIONS}
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnSelectFilter
                  value={filters.entrySource}
                  onChange={(value) => onFilterChange("entrySource", value)}
                  options={SOURCE_OPTIONS}
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={filters.createdBy}
                  onChange={(value) => onFilterChange("createdBy", value)}
                  placeholder="Người nhập"
                />
              </th>

              <th className="px-3 py-2.5" />
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={COLUMN_COUNT}
                  className="h-20 text-center text-slate-500"
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMN_COUNT}
                  className="h-20 text-center text-slate-500"
                >
                  {hasFilter
                    ? "Không có khảo sát nào khớp bộ lọc."
                    : "Chưa có kết quả khảo sát nào."}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="h-[46px] border-b border-slate-100 text-xs hover:bg-slate-50"
                >
                  <td className="px-4 whitespace-nowrap text-slate-600">
                    {formatSurveyDateTime(row.sent_at)}
                  </td>
                  <td className="px-4 font-semibold text-slate-800">
                    {row.customer_name || row.customer_name_text || "—"}
                  </td>
                  <td className="px-4 text-slate-600">{row.phone || "—"}</td>
                  <td className="px-4">
                    <Link
                      href={`/tickets/${row.ticket}`}
                      className="font-semibold text-sky-700 hover:underline"
                    >
                      {row.ticket_code}
                    </Link>
                    <div className="max-w-[200px] truncate text-[11px] text-slate-500">
                      {row.ticket_title || row.ticket_ref_text || ""}
                    </div>
                  </td>
                  <td className="px-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        row.send_status === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {row.send_status_label}
                    </span>
                  </td>
                  <td className="px-4">
                    {/* null = chưa khảo sát, khác hẳn với chấm 0 điểm. */}
                    {row.rating_score === null ||
                    row.rating_score === undefined ? (
                      <span className="text-slate-400">chưa chấm</span>
                    ) : (
                      <span className="font-bold text-slate-800">
                        {row.rating_score}/5
                      </span>
                    )}
                  </td>
                  <td className="px-4 text-slate-500">
                    {row.entry_source === "IMPORT" ? "Import" : "Nhập tay"}
                  </td>
                  <td className="px-4 text-slate-500">
                    {row.created_by_name || "—"}
                  </td>
                  <td className="px-4 text-right">
                    <Link
                      href={`/surveys/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white"
                      title="Xem chi tiết khảo sát"
                    >
                      <Eye size={12} />
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
        {loading
          ? "Đang tải..."
          : `Hiển thị ${rows.length} / ${count} khảo sát`}
      </div>
    </div>
  );
}
