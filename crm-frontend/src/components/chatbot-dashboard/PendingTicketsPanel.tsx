"use client";

import { useRouter } from "next/navigation";
import { Eye, Inbox } from "lucide-react";

import { ticketStatusPillClass } from "@/constants/chatbot-dashboard.constant";
import { ChatbotTicketItem } from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";
import { shortText } from "@/utils/text.util";

/**
 * Hàng chờ ticket chatbot chưa ai xử lý — hiển thị ở tab Tổng quan.
 *
 * Ticket vào đây khi đang ở trạng thái "Mở" và chưa có người nhận
 * (owner_user = null). Đổi tông màu theo việc còn hay hết việc để nhìn
 * là biết ngay có cần hành động không.
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

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        hasPending ? "border-rose-200" : "border-slate-200"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 ${
          hasPending
            ? "border-rose-100 bg-rose-50"
            : "border-slate-100 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              hasPending
                ? "bg-rose-100 text-rose-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Inbox size={17} />
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Vấn đề cần CCC xử lý
              </h3>

              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  hasPending
                    ? "bg-rose-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {total}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Ticket đang ở trạng thái Mở, chưa có người tiếp nhận.
            </p>
          </div>
        </div>

        {total > rows.length && (
          <span className="text-xs text-slate-500">
            Hiển thị {rows.length} mới nhất trên tổng {total}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-slate-50 text-slate-600">
              <th className="px-3 font-semibold">Mã ticket</th>
              <th className="px-3 font-semibold">Session</th>
              <th className="px-3 font-semibold">Chủ đề</th>
              <th className="px-3 font-semibold">Nội dung</th>
              <th className="px-3 font-semibold">Trạng thái</th>
              <th className="px-3 font-semibold">Ngày</th>
              <th className="px-3 font-semibold" />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="h-20 text-center text-slate-500">
                  Không có ticket nào đang chờ tiếp nhận.
                </td>
              </tr>
            )}

            {rows.map((item) => (
              <tr
                key={item.id}
                className="h-12 border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 font-semibold text-sky-600">
                  {item.ticket_chatbot_code || item.ticket_code || "-"}
                </td>
                <td className="px-3 font-mono text-[11px] text-slate-600">
                  {shortText(item.session_id, 12)}
                </td>
                <td className="px-3">{item.category_label || "-"}</td>
                <td className="px-3 text-slate-600">
                  {shortText(item.reason || item.last_question, 60)}
                </td>
                <td className="px-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${ticketStatusPillClass(
                      item.ticket_chatbot_status || "Mở"
                    )}`}
                  >
                    {item.ticket_chatbot_status || "Mở"}
                  </span>
                </td>
                <td className="px-3 whitespace-nowrap">
                  {formatDateTime(item.started_at)}
                </td>
                <td className="px-3">
                  {item.ticket_chatbot_id && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/tickets/${item.ticket_chatbot_id}`
                        )
                      }
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white"
                    >
                      <Eye size={12} />
                      Chi tiết
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
