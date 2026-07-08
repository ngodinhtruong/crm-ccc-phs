import { Search } from "lucide-react";

import { StatusPill } from "@/components/chatbot-dashboard/StatusPill";
import { CHATBOT_TICKET_STATUS_OPTIONS } from "@/constants/chatbot-dashboard.constant";
import { ChatbotTicketItem } from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";
import { shortText } from "@/utils/text.util";

export function TicketsTab({
  tickets,
  count,
  title,
  status,
  keyword,
  category,
  onStatusChange,
  onKeywordChange,
  onSearch,
  onClearPreset,
  onOpenSession,
}: {
  tickets: ChatbotTicketItem[];
  count: number;
  title: string;
  status: string;
  keyword: string;
  category: string;
  onStatusChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onClearPreset: () => void;
  onOpenSession: (item: ChatbotTicketItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>

          <p className="mt-1 text-xs text-slate-500">
            Một dòng tương ứng một session chatbot. Bấm vào dòng để xem lịch sử trò chuyện.
          </p>

          {category && (
            <div className="mt-2 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Chủ đề: {category}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Tổng: <span className="font-bold text-slate-800">{count}</span>
          </div>

          {(category || status !== "ALL" || keyword) && (
            <button
              type="button"
              onClick={onClearPreset}
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b border-slate-100 bg-[#f8fafc] px-4 py-3">
        <div className="col-span-12 md:col-span-3">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Trạng thái
          </label>

          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
          >
            {CHATBOT_TICKET_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-6">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Tìm kiếm
          </label>

          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="Mã ticket, session_id, câu hỏi, thông tin KH..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 flex items-end md:col-span-3">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#0097cf] px-4 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
          >
            <Search size={14} />
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-11 border-b bg-white text-slate-700">
              <th className="w-[150px] px-3 font-semibold">Mã ticket</th>
              <th className="w-[180px] px-3 font-semibold">Session ID</th>
              <th className="w-[150px] px-3 font-semibold">Thời gian</th>
              <th className="w-[100px] px-3 font-semibold">Kênh</th>
              <th className="w-[160px] px-3 font-semibold">Chủ đề</th>
              <th className="w-[140px] px-3 font-semibold">Category</th>
              <th className="w-[160px] px-3 font-semibold">Trạng thái</th>
              <th className="w-[120px] px-3 font-semibold">Linked</th>
              <th className="w-[160px] px-3 font-semibold">Thông tin KH</th>
              <th className="w-[260px] px-3 font-semibold">Câu hỏi cuối</th>
              <th className="w-[260px] px-3 font-semibold">Lý do chuyển CCC</th>
            </tr>
          </thead>

          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={11} className="h-24 text-center text-slate-500">
                  Không có dữ liệu.
                </td>
              </tr>
            )}

            {tickets.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => onOpenSession(item)}
                className={`h-14 cursor-pointer border-b border-slate-100 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                } transition hover:bg-sky-50`}
              >
                <td className="px-3">
                  {item.ticket_code ? (
                    <span className="font-semibold text-sky-600">
                      {item.ticket_code}
                    </span>
                  ) : (
                    <span className="text-slate-400">Không tạo ticket</span>
                  )}
                </td>

                <td className="px-3 font-medium text-slate-700">
                  {item.session_id}
                </td>

                <td className="px-3">{formatDateTime(item.started_at)}</td>
                <td className="px-3">{item.channel || "-"}</td>
                <td className="px-3">{item.dashboard_category || "-"}</td>
                <td className="px-3">{item.main_category || "-"}</td>

                <td className="px-3">
                  <StatusPill
                    value={item.outcome_type}
                    label={item.outcome_label}
                  />
                </td>

                <td className="px-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      item.linked_status === "LINKED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.linked_status || "UNLINKED"}
                  </span>
                </td>

                <td className="px-3">{item.contact_info || "-"}</td>
                <td className="px-3">{shortText(item.last_question, 120)}</td>
                <td className="px-3">{shortText(item.reason, 120)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}