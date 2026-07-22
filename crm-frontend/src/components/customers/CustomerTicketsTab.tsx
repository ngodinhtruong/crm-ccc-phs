"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Headset } from "lucide-react";

import { ticketApi } from "@/apis/ticket.api";
import { formatDateTime } from "@/utils/date.util";

/**
 * Một dòng ticket đã chuẩn hoá.
 *
 * Trước đây phải gọi 2 API rồi tự trộn vì ticket chatbot nằm bảng riêng.
 * Nay chung một bảng, chỉ còn 1 query; origin suy từ classification_method
 * (AUTO = chatbot tạo, MANUAL = người tạo).
 */
type UnifiedTicket = {
  key: string;
  id: number;
  origin: "CRM" | "CHATBOT";
  ticket_code: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  handler: string;
  created_at?: string | null;
};

export function CustomerTicketsTab({ customerId }: { customerId: number }) {
  const router = useRouter();

  const [tickets, setTickets] = useState<UnifiedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const crm = await ticketApi.getTickets({
        customer: String(customerId),
        page_size: "50",
      });

      const rows: UnifiedTicket[] = (crm?.results ?? []).map((t) => ({
        key: `t-${t.id}`,
        id: t.id,
        origin: t.classification_method === "AUTO" ? "CHATBOT" : "CRM",
        ticket_code: t.ticket_code,
        title: t.title || "",
        category: t.support_category_name || "",
        status: t.status_name || "",
        priority: t.priority_name || "",
        handler: t.assigned_employee_name || t.owner_user_name || "",
        created_at: t.created_at,
      }));

      // Mới nhất lên đầu
      rows.sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      );

      setTickets(rows);
    } catch {
      setError("Không tải được danh sách ticket.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTicket = (t: UnifiedTicket) => {
    router.push(`/tickets/${t.id}`);
  };

  const crmCount = tickets.filter((t) => t.origin === "CRM").length;
  const botCount = tickets.filter((t) => t.origin === "CHATBOT").length;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            Ticket của khách hàng
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Gồm cả ticket tạo thủ công và ticket sinh từ chatbot.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Headset size={12} className="text-sky-500" />
            CRM: <span className="font-bold text-slate-800">{crmCount}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Bot size={12} className="text-violet-500" />
            Chatbot: <span className="font-bold text-slate-800">{botCount}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-[#f8fafc] text-slate-600">
              <th className="w-[110px] px-3 font-semibold">Nguồn</th>
              <th className="w-[140px] px-3 font-semibold">Mã ticket</th>
              <th className="w-[230px] px-3 font-semibold">Tiêu đề</th>
              <th className="w-[150px] px-3 font-semibold">Danh mục</th>
              <th className="w-[130px] px-3 font-semibold">Tình trạng</th>
              <th className="w-[100px] px-3 font-semibold">Ưu tiên</th>
              <th className="w-[140px] px-3 font-semibold">Người xử lý</th>
              <th className="w-[140px] px-3 font-semibold">Ngày tạo</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="h-20 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}

            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="h-20 text-center text-slate-400">
                  Khách hàng này chưa có ticket nào.
                </td>
              </tr>
            )}

            {!loading &&
              tickets.map((t, i) => (
                <tr
                  key={t.key}
                  onClick={() => openTicket(t)}
                  className={`h-12 cursor-pointer border-b border-slate-100 ${
                    i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                  } transition hover:bg-sky-50`}
                >
                  <td className="px-3">
                    {t.origin === "CHATBOT" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 font-semibold text-violet-700">
                        <Bot size={11} />
                        Chatbot
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                        <Headset size={11} />
                        CRM
                      </span>
                    )}
                  </td>

                  <td className="px-3 font-semibold text-sky-600">
                    {t.ticket_code}
                  </td>
                  <td className="px-3">{t.title || "-"}</td>
                  <td className="px-3">{t.category || "-"}</td>

                  <td className="px-3">
                    {t.status ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        {t.status}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="px-3">{t.priority || "-"}</td>
                  <td className="px-3">
                    {t.handler || (
                      <span className="text-slate-400">Chưa nhận</span>
                    )}
                  </td>
                  <td className="px-3 whitespace-nowrap">
                    {formatDateTime(t.created_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
