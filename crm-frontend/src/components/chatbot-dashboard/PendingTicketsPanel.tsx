"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Inbox } from "lucide-react";

import { TablePagination } from "@/components/common/TablePagination";
import { ticketStatusPillClass } from "@/constants/chatbot-dashboard.constant";
import { ChatbotTicketItem } from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";
import { shortText } from "@/utils/text.util";

const PAGE_SIZES = [5, 10, 20] as const;
const DEFAULT_PAGE_SIZE = 10;
const COLUMN_COUNT = 7;

/**
 * Hàng chờ ticket chatbot chưa ai xử lý — hiển thị ở tab Tổng quan.
 *
 * Ticket vào đây khi đang ở trạng thái "Mở" và chưa có người nhận
 * (owner_user = null). Đổi tông màu theo việc còn hay hết việc để nhìn
 * là biết ngay có cần hành động không.
 *
 * Cuộn trong khung cố định + phân trang tại chỗ, giống bảng "Ticket chưa xử
 * lý" của dashboard CCC. Dùng chung ``TablePagination``; phần bảng thì không
 * dùng lại được vì cột ở đây là Session / Chủ đề / Nội dung của phiên chat,
 * khác hẳn bảng ticket bên kia.
 *
 * ``total`` là tổng thật trên toàn hàng chờ, còn ``rows`` chỉ là lô backend
 * gửi kèm overview — nên phân trang chạy trên ``rows`` và phần chênh được nói
 * rõ ở đầu bảng thay vì lờ đi.
 */
export function PendingTicketsPanel({
  rows,
  total,
}: {
  rows: ChatbotTicketItem[];
  total: number;
}) {
  const router = useRouter();
  const hasPending = total > 0;

  const [requestedPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const totalPages = rows.length === 0 ? 0 : Math.ceil(rows.length / pageSize);

  // Bộ lọc đổi làm danh sách ngắn lại thì trang đang đứng có thể vượt quá số
  // trang còn lại và bảng sẽ trống trơn. Kẹp lúc đọc thay vì đồng bộ ngược
  // vào state trong useEffect — cách kia render thừa một lượt với bảng rỗng.
  const page = Math.min(requestedPage, Math.max(1, totalPages));

  const visibleRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, rows]
  );

  const fromRecord = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRecord = Math.min(page * pageSize, rows.length);

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-xs ${
        hasPending ? "border-rose-200" : "border-slate-200"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 ${
          hasPending ? "border-rose-100 bg-rose-50/70" : "border-slate-100 bg-slate-50/60"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md ${
              hasPending
                ? "bg-rose-500 text-white shadow-xs"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            <Inbox size={12} />
          </span>

          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800">
              Vấn đề cần CCC xử lý
            </h3>

            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                hasPending
                  ? "bg-rose-500 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {total}
            </span>

            <span className="text-[10px] text-slate-500 hidden lg:inline">
              (Ticket đang ở trạng thái Mở, chưa tiếp nhận)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {total > rows.length && (
            <span className="text-[10px] text-slate-500 hidden xl:inline">
              Đang tải {rows.length}/{total}
            </span>
          )}

          <TablePagination
            fromRecord={fromRecord}
            toRecord={toRecord}
            count={rows.length}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() =>
              setPage((current) => Math.min(totalPages || current, current + 1))
            }
          />
        </div>
      </div>

      <div className="max-h-[260px] overflow-auto overscroll-contain">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="sticky top-0 z-10 border-b bg-slate-50 text-slate-600 shadow-sm text-[11px]">
            <tr className="h-7">
              <th className="w-10 px-3 py-1 font-semibold" />
              <th className="px-3 py-1 font-semibold">Mã ticket</th>
              <th className="px-3 py-1 font-semibold">Session</th>
              <th className="px-3 py-1 font-semibold">Chủ đề</th>
              <th className="px-3 py-1 font-semibold">Nội dung</th>
              <th className="px-3 py-1 font-semibold">Trạng thái</th>
              <th className="px-3 py-1 font-semibold">Ngày</th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMN_COUNT}
                  className="h-16 text-center text-slate-500 text-xs"
                >
                  Không có ticket nào đang chờ tiếp nhận.
                </td>
              </tr>
            )}

            {visibleRows.map((item) => (
              <tr
                key={item.id}
                className="h-7.5 border-b border-slate-100/80 hover:bg-slate-50 text-xs"
              >
                <td className="px-3 py-1 text-slate-700">
                  {item.ticket_chatbot_id && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/tickets/${item.ticket_chatbot_id}`)
                      }
                      className="flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-white"
                      aria-label="Xem chi tiết ticket"
                      title="Xem chi tiết ticket"
                    >
                      <Eye size={11} />
                    </button>
                  )}
                </td>
                <td className="px-3 py-1 font-semibold text-sky-600">
                  {item.ticket_chatbot_code || item.ticket_code || "-"}
                </td>
                <td className="px-3 py-1 font-mono text-[10px] text-slate-600">
                  {shortText(item.session_id, 12)}
                </td>
                <td className="px-3 py-1 text-slate-700">{item.category_label || "-"}</td>
                <td className="px-3 py-1 text-slate-600">
                  {shortText(item.reason || item.last_question, 60)}
                </td>
                <td className="px-3 py-1 text-slate-700">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ticketStatusPillClass(
                      item.ticket_chatbot_status || "Mở"
                    )}`}
                  >
                    {item.ticket_chatbot_status || "Mở"}
                  </span>
                </td>
                <td className="px-3 py-1 whitespace-nowrap text-slate-600 text-xs">
                  {formatDateTime(item.started_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
