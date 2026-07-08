import { X } from "lucide-react";

import { ChatbotTicketItem } from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";

export function ConversationModal({
  session,
  onClose,
}: {
  session: ChatbotTicketItem;
  onClose: () => void;
}) {
  const conversation =
    session.full_conversation ||
    [
      session.first_question ? `Khách hàng: ${session.first_question}` : "",
      session.last_question && session.last_question !== session.first_question
        ? `Câu cuối: ${session.last_question}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Lịch sử trò chuyện
            </h2>

            <div className="mt-1 text-xs text-slate-500">
              Session:{" "}
              <span className="font-semibold text-slate-700">
                {session.session_id}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs md:grid-cols-4">
          <InfoItem
            label="Trạng thái"
            value={session.outcome_label || session.outcome_type || "-"}
          />
          <InfoItem label="Chủ đề" value={session.dashboard_category || "-"} />
          <InfoItem
            label="Thời gian bắt đầu"
            value={formatDateTime(session.started_at)}
          />
          <InfoItem
            label="Mã ticket"
            value={session.ticket_code || "Không tạo ticket"}
          />
        </div>

        <div className="overflow-y-auto p-5">
          {conversation ? (
            <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              {conversation}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Phiên này chưa có nội dung hội thoại.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-medium text-slate-700">{value}</div>
    </div>
  );
}