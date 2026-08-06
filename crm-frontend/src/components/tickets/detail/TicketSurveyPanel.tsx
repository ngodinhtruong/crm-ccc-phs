"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";

import { surveyApi } from "@/apis/survey.api";
import type { SurveyLog } from "@/types/survey.type";
import { getErrorMessage } from "@/utils/error.util";
import { formatSurveyDateTime } from "@/utils/survey-datetime.util";

/**
 * Kết quả khảo sát CSAT của một ticket.
 *
 * Liệt kê mọi lần gửi chứ không chỉ lần thành công: một ticket có thể gửi
 * hỏng vài lần rồi mới tới được khách, và người xử lý cần thấy điều đó để
 * biết điểm thấp là do dịch vụ hay do khách chưa từng nhận được tin.
 */
export function TicketSurveyPanel({ ticketId }: { ticketId: number }) {
  const [rows, setRows] = useState<SurveyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    surveyApi
      .list({ ticket: ticketId, page_size: 100 })
      .then((data) => {
        if (!cancelled) setRows(data.results);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, "Không tải được kết quả khảo sát"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Đang tải...</p>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-rose-600">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Ticket này chưa được gửi khảo sát.
      </p>
    );
  }

  const answered = rows.find(
    (row) =>
      row.send_status === "SUCCESS" &&
      row.rating_score !== null &&
      row.rating_score !== undefined
  );

  return (
    <div className="space-y-3">
      {answered && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Star size={18} className="shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs text-emerald-700">Khách hàng đã chấm</p>
            <p className="text-lg font-black text-emerald-700">
              {answered.rating_score}/5
            </p>
          </div>
          {answered.rating_note && (
            <p className="border-l border-emerald-200 pl-3 text-xs text-emerald-800">
              {answered.rating_note}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr className="h-9">
              <th className="px-3 font-semibold">Thời điểm gửi</th>
              <th className="px-3 font-semibold">Tình trạng</th>
              <th className="px-3 font-semibold">Rate</th>
              <th className="px-3 font-semibold">Mẫu tin nhắn</th>
              <th className="px-3 font-semibold">Người nhập</th>
              <th className="px-3" />
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="h-10 border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-3 whitespace-nowrap text-slate-600">
                  {formatSurveyDateTime(row.sent_at)}
                </td>
                <td className="px-3">
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
                <td className="px-3">
                  {/* null = chưa khảo sát, khác hẳn với chấm 0 điểm. */}
                  {row.rating_score === null || row.rating_score === undefined ? (
                    <span className="text-slate-400">chưa chấm</span>
                  ) : (
                    <span className="font-bold text-slate-800">
                      {row.rating_score}/5
                    </span>
                  )}
                </td>
                <td className="px-3 text-slate-600">
                  {row.message_template || "—"}
                </td>
                <td className="px-3 text-slate-500">
                  {row.created_by_name || "—"}
                </td>
                <td className="px-3 text-right">
                  <Link
                    href={`/surveys/${row.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
                  >
                    Xem
                    <ExternalLink size={10} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
