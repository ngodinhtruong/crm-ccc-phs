import { Search, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/chatbot-dashboard/StatusPill";
import {
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
} from "@/components/common/table-filters";
import {
  CHANNEL_OPTIONS,
  CHATBOT_TICKET_STATUS_OPTIONS,
  ticketStatusPillClass,
} from "@/constants/chatbot-dashboard.constant";
import { CHATBOT_TICKET_STATUS_LABELS } from "@/constants/chatbot-ticket.constant";
import {
  ChatbotTicketColumnFilterKey,
  ChatbotTicketColumnFilters,
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
  columnFilters,
  onColumnFilterChange,
  hasColumnFilter,
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
  columnFilters: ChatbotTicketColumnFilters;
  onColumnFilterChange: (
    key: ChatbotTicketColumnFilterKey,
    value: string
  ) => void;
  hasColumnFilter: boolean;
}) {
  const set =
    (key: ChatbotTicketColumnFilterKey) => (value: string) =>
      onColumnFilterChange(key, value);

  /*
   * Hai nhóm này chatbot không gán chủ đề: RESEARCH (câu phân tích cổ phiếu)
   * và SPAM (câu không liên quan) đều để trống `category`, nên cột Chủ đề chỉ
   * toàn "Chưa phân loại" — chiếm chỗ mà không nói được gì.
   */
  const showCategory = status !== "RESEARCH" && status !== "SPAM";

  // Số cột thật, dùng cho dòng "Không có dữ liệu".
  const columnCount = showCategory ? 9 : 8;

  // Nhãn trạng thái ticket dùng chung với màn chi tiết, giá trị gửi lên là
  // status_code để backend khỏi phải dịch ngược từ nhãn tiếng Việt.
  const ticketStatusOptions = Object.entries(CHATBOT_TICKET_STATUS_LABELS).map(
    ([value, label]) => ({ value, label })
  );
  const router = useRouter();
  // "CCC" là mặc định của tab nên không tính là đang lọc.
  // Mọi giá trị khác (kể cả "ALL") đều là người dùng đã chủ động đổi,
  // nên phải cho họ đường quay về mặc định.
  const hasFilter =
    Boolean(category) ||
    status !== "CCC" ||
    Boolean(keyword) ||
    hasColumnFilter;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-3.5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>

          <p className="mt-0.5 text-[11px] text-slate-500">
            Mỗi dòng là một phiên chatbot. Bấm vào dòng để xem toàn bộ hội thoại.
          </p>

          {category && (
            <div className="mt-1.5 inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
              Chủ đề: {category}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs text-slate-500">
            Tổng: <span className="font-bold text-slate-800">{count}</span> phiên
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={onClearPreset}
              className="h-7 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2.5 border-b border-slate-100 bg-[#f8fafc] px-3.5 py-2">
        <div className="col-span-12 md:col-span-3">
          <label className="mb-0.5 block text-[11px] font-semibold text-slate-500">
            Nhóm xử lý
          </label>

          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as OutcomeCode)
            }
            className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs outline-none focus:border-sky-400"
          >
            {CHATBOT_TICKET_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-6">
          <label className="mb-0.5 block text-[11px] font-semibold text-slate-500">
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
            placeholder="Mã ticket, session_id, câu hỏi..."
            className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 flex items-end md:col-span-3">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#10b981] px-3.5 text-xs font-semibold text-white transition hover:bg-[#059669]"
          >
            <Search size={13} />
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-7 border-b bg-slate-50 text-slate-700 text-[11px]">
              <th className="w-[150px] px-3 py-1 font-semibold">Mã ticket</th>
              <th className="w-[130px] px-3 py-1 font-semibold">Trạng thái</th>
              <th className="w-[190px] px-3 py-1 font-semibold">Session ID</th>
              <th className="w-[150px] px-3 py-1 font-semibold">Thời gian</th>
              <th className="w-[110px] px-3 py-1 font-semibold">Kênh</th>
              {showCategory && (
                <th className="w-[170px] px-3 py-1 font-semibold">Chủ đề</th>
              )}
              <th className="w-[180px] px-3 py-1 font-semibold">Nhóm xử lý</th>
              <th className="w-[250px] px-3 py-1 font-semibold">Câu hỏi cuối</th>
              <th className="w-[250px] px-3 py-1 font-semibold">Lý do chuyển CCC</th>
            </tr>

            {/* Lọc theo từng cột — gõ tới đâu lọc tới đó (chờ 400ms). */}
            <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
              <th className="px-2 py-1.5">
                <ColumnTextFilter
                  value={columnFilters.ticket_code}
                  onChange={set("ticket_code")}
                  placeholder="Mã"
                />
              </th>

              <th className="px-2 py-1.5">
                <ColumnSelectFilter
                  value={columnFilters.ticket_status}
                  onChange={set("ticket_status")}
                  options={ticketStatusOptions}
                />
              </th>

              <th className="px-2 py-1.5">
                <ColumnTextFilter
                  value={columnFilters.session_id}
                  onChange={set("session_id")}
                  placeholder="Session"
                />
              </th>

              <th className="px-2 py-1.5">
                <ColumnDateRangeFilter
                  fromValue={columnFilters.started_from}
                  toValue={columnFilters.started_to}
                  onFromChange={set("started_from")}
                  onToChange={set("started_to")}
                />
              </th>

              <th className="px-2 py-1.5">
                <ColumnSelectFilter
                  value={columnFilters.channel}
                  onChange={set("channel")}
                  options={CHANNEL_OPTIONS}
                  placeholder="Tất cả"
                />
              </th>

              {showCategory && (
                <th className="px-2 py-1.5">
                  <ColumnTextFilter
                    value={columnFilters.category}
                    onChange={set("category")}
                    placeholder="Chủ đề"
                  />
                </th>
              )}

              <th className="px-2 py-1.5">
                <ColumnSelectFilter
                  value={status}
                  onChange={(value) =>
                    onStatusChange((value || "ALL") as OutcomeCode)
                  }
                  options={CHATBOT_TICKET_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  placeholder="Tất cả nhóm"
                />
              </th>

              <th className="px-2 py-1.5">
                <ColumnTextFilter
                  value={columnFilters.last_question}
                  onChange={set("last_question")}
                  placeholder="Câu hỏi"
                />
              </th>

              <th className="px-2 py-1.5">
                <ColumnTextFilter
                  value={columnFilters.reason}
                  onChange={set("reason")}
                  placeholder="Lý do"
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="h-20 text-center text-slate-500">
                  Không có dữ liệu.
                </td>
              </tr>
            )}

            {tickets.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => onOpenSession(item)}
                className={`h-7.5 cursor-pointer border-b border-slate-100/80 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                } transition hover:bg-sky-50/70`}
              >
                <td className="px-3 py-1 text-slate-700">
                  <div className="flex items-center gap-1.5">
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
                            `/tickets/${item.ticket_chatbot_id}`
                          );
                        }}
                        title="Xem chi tiết ticket"
                        className="flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        <Eye size={11} />
                      </button>
                    )}
                  </div>
                </td>

                <td className="px-3 py-1 text-slate-700">
                  {item.ticket_chatbot_status ? (
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${ticketStatusPillClass(
                        item.ticket_chatbot_status
                      )}`}
                    >
                      {item.ticket_chatbot_status}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="px-3 py-1 font-mono text-[10px] text-slate-600">
                  {item.session_id}
                </td>

                <td className="px-3 py-1 whitespace-nowrap text-slate-600">
                  {formatDateTime(item.started_at)}
                </td>

                <td className="px-3 py-1 text-slate-700">{item.channel || "-"}</td>
                {showCategory && (
                  <td className="px-3 py-1 text-slate-700">
                    {item.category_label || "-"}
                  </td>
                )}

                <td className="px-3 py-1 text-slate-700">
                  <StatusPill
                    value={item.outcome_type}
                    label={item.outcome_label}
                  />
                </td>

                <td className="px-3 py-1 text-slate-700">{shortText(item.last_question, 110)}</td>
                <td className="px-3 py-1 text-slate-700">{shortText(item.reason, 110)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

