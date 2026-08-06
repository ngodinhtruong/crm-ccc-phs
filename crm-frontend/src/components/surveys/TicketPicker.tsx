"use client";

import { useState } from "react";
import { Loader2, Search, Ticket as TicketIcon } from "lucide-react";

import { surveyApi } from "@/apis/survey.api";
import type { SurveyTicketOption } from "@/types/survey.type";
import { formatDateTime } from "@/utils/date.util";
import { getErrorMessage } from "@/utils/error.util";

/** `2026-07` -> `07/2026`. */
function monthLabel(month: string) {
  const [year, value] = month.split("-");

  return `${value}/${year}`;
}

/**
 * Gõ tên khách -> chọn một ticket của khách đó trong tháng gửi khảo sát.
 *
 * Không tự gán ngay cả khi chỉ tìm được một ticket: kết quả khảo sát gắn vào
 * ticket nào là quyết định của người nhập, đoán sai thì điểm CSAT rơi nhầm
 * ticket và rất khó phát hiện về sau.
 *
 * Ticket đã có khảo sát thành công vẫn hiện nhưng bị khoá, để người nhập biết
 * là đã làm rồi chứ không tưởng là tìm thiếu.
 */
export function TicketPicker({
  customerName,
  phone,
  month,
  value,
  onChange,
}: {
  customerName: string;
  phone?: string;
  /** Tháng gửi khảo sát, YYYY-MM. Rỗng thì tìm không giới hạn thời gian. */
  month: string;
  value: number | null;
  onChange: (ticketId: number | null) => void;
}) {
  const [found, setFound] = useState<{
    key: string;
    options: SurveyTicketOption[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSearch = Boolean(customerName.trim() || phone?.trim());

  // Đổi khách hoặc đổi tháng thì kết quả cũ không còn đúng. So khoá tìm kiếm
  // lúc đọc thay vì xoá state trong useEffect — cách kia render thừa một lượt
  // với danh sách cũ vẫn còn trên màn hình.
  const searchKey = `${customerName.trim()}|${phone?.trim() || ""}|${month}`;
  const stale = found !== null && found.key !== searchKey;
  const options = stale || found === null ? [] : found.options;
  const searched = found !== null && !stale;

  const search = async () => {
    if (!canSearch) return;

    setLoading(true);
    setError("");

    try {
      const results = await surveyApi.ticketOptions({
        customer_name: customerName.trim(),
        phone: phone?.trim() || undefined,
        month: month || undefined,
      });
      setFound({ key: searchKey, options: results });
    } catch (err) {
      setError(getErrorMessage(err, "Không tìm được ticket của khách hàng này"));
    } finally {
      setLoading(false);
    }
  };

  const selectable = options.filter((item) => !item.has_survey);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700">
          Ticket <span className="text-rose-500">*</span>
        </label>

        <button
          type="button"
          onClick={search}
          disabled={!canSearch || loading}
          className="flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Search size={13} />
          )}
          {month ? `Tìm ticket tháng ${monthLabel(month)}` : "Tìm ticket của khách"}
        </button>
      </div>

      {!canSearch && (
        <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Nhập tên khách hàng hoặc số điện thoại trước, rồi bấm tìm ticket.
        </p>
      )}

      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}

      {searched && options.length === 0 && !error && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Không có ticket nào của khách này
          {month ? ` trong tháng ${monthLabel(month)}` : ""}. Kiểm tra lại tên
          khách hoặc ngày gửi khảo sát.
        </p>
      )}

      {options.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            Khách có{" "}
            <span className="font-bold text-slate-800">{options.length}</span>{" "}
            ticket{month ? ` trong tháng ${monthLabel(month)}` : ""}
            {options.length > selectable.length && (
              <>
                {" "}
                ({options.length - selectable.length} ticket đã khảo sát, không
                chọn được)
              </>
            )}
            . Chọn ticket ứng với kết quả khảo sát này:
          </p>

          <div className="grid max-h-[420px] grid-cols-1 gap-1.5 overflow-auto overscroll-contain rounded border border-slate-200 p-1.5 xl:grid-cols-2">
            {options.map((item) => {
              const disabled = item.has_survey;
              const selected = value === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(selected ? null : item.id)}
                  className={`flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition ${
                    disabled
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                      : selected
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <TicketIcon
                    size={14}
                    className={`mt-0.5 shrink-0 ${
                      selected ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-bold text-sky-700">
                        {item.ticket_code}
                      </span>

                      {item.status_name && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.status_name}
                        </span>
                      )}

                      {disabled && (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          đã khảo sát
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-slate-700">
                      {item.title || "(không có tiêu đề)"}
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {item.customer_name || "—"}
                      {item.support_category ? ` · ${item.support_category}` : ""}
                      {item.created_at ? ` · ${formatDateTime(item.created_at)}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
