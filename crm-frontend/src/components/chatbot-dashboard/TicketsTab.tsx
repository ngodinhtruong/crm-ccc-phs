import { Search, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/chatbot-dashboard/StatusPill";
import {
  CHATBOT_TICKET_STATUS_OPTIONS,
  ticketStatusPillClass,
} from "@/constants/chatbot-dashboard.constant";
import {
  ChatbotTicketItem,
  OutcomeCode,
} from "@/types/chatbot-dashboard.type";
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
  status: OutcomeCode;
  keyword: string;
  category: string;
  onStatusChange: (value: OutcomeCode) => void;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onClearPreset: () => void;
  onOpenSession: (item: ChatbotTicketItem) => void;
}) {
  const router = useRouter();
  // "CCC" là mặc định của tab nên không tính là đang lọc.
  // Mọi giá trị khác (kể cả "ALL") đều là người dùng đã chủ động đổi,
  // nên phải cho họ đường quay về mặc định.
  const hasFilter =
    Boolean(category) || status !== "CCC" || Boolean(keyword);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>

          <p className="mt-1 text-xs text-slate-500">
            Mỗi dòng là một phiên chatbot. Bấm vào dòng để xem toàn bộ hội thoại.
          </p>

          {category && (
            <div className="mt-2 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Chủ đề: {category}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Tổng: <span className="font-bold text-slate-800">{count}</span> phiên
          </div>

          {hasFilter && (
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
            Nhóm xử lý
          </label>

          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as OutcomeCode)
            }
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
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
        <table className="w-full min-w-[1430px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-11 border-b bg-white text-slate-700">
              <th className="w-[150px] px-3 font-semibold">Mã ticket</th>
              <th className="w-[130px] px-3 font-semibold">Trạng thái</th>
              <th className="w-[190px] px-3 font-semibold">Session ID</th>
              <th className="w-[150px] px-3 font-semibold">Thời gian</th>
              <th className="w-[90px] px-3 font-semibold">Kênh</th>
              <th className="w-[170px] px-3 font-semibold">Chủ đề</th>
              <th className="w-[90px] px-3 font-semibold">Số lần chat</th>
              <th className="w-[180px] px-3 font-semibold">Nhóm xử lý</th>
              <th className="w-[160px] px-3 font-semibold">Thông tin KH</th>
              <th className="w-[250px] px-3 font-semibold">Câu hỏi cuối</th>
              <th className="w-[250px] px-3 font-semibold">Lý do chuyển CCC</th>
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
                  <div className="flex items-center gap-2">
                    {item.ticket_code ? (
                      <span className="font-semibold text-sky-600">
                        {item.ticket_code}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}

                    {item.ticket_chatbot_id && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(
                            `/chatbots/tickets/${item.ticket_chatbot_id}`
                          );
                        }}
                        title="Xem chi tiết ticket"
                        className="flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        <Eye size={12} />
                        Chi tiết
                      </button>
                    )}
                  </div>
                </td>

                <td className="px-3">
                  {item.ticket_chatbot_status ? (
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${ticketStatusPillClass(
                        item.ticket_chatbot_status
                      )}`}
                    >
                      {item.ticket_chatbot_status}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="px-3 font-mono text-[11px] text-slate-600">
                  {item.session_id}
                </td>

                <td className="px-3 whitespace-nowrap">
                  {formatDateTime(item.started_at)}
                </td>

                <td className="px-3">{item.channel || "-"}</td>
                <td className="px-3">{item.category_label || "-"}</td>
                <td className="px-3">{item.msg_count_total ?? 0}</td>

                <td className="px-3">
                  <StatusPill
                    value={item.outcome_type}
                    label={item.outcome_label}
                  />
                </td>

                <td className="px-3">{item.contact_info || "-"}</td>
                <td className="px-3">{shortText(item.last_question, 110)}</td>
                <td className="px-3">{shortText(item.reason, 110)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
