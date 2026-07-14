"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { chatbotDashboardService } from "@/services/chatbot-dashboard.service";
import {
  ChatbotMessage,
  ChatbotTicketItem,
} from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";

export function ConversationModal({
  session,
  onClose,
}: {
  session: ChatbotTicketItem;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await chatbotDashboardService.getSessionDetail(
          session.session_id
        );

        if (active) {
          setMessages(data.messages);
        }
      } catch {
        if (active) {
          setError("Không tải được lịch sử hội thoại.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [session.session_id]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Lịch sử trò chuyện
            </h2>

            <div className="mt-1 text-xs text-slate-500">
              Session:{" "}
              <span className="font-mono font-semibold text-slate-700">
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

        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs md:grid-cols-5">
          <InfoItem
            label="Nhóm xử lý"
            value={session.outcome_label || session.outcome_type || "-"}
          />
          <InfoItem label="Chủ đề" value={session.category_label || "-"} />
          <InfoItem
            label="Bắt đầu"
            value={formatDateTime(session.started_at)}
          />
          <InfoItem
            label="Thông tin KH"
            value={session.contact_info || "Chưa có"}
          />
          <InfoItem
            label="Mã ticket"
            value={session.ticket_code || "Không tạo ticket"}
          />
        </div>

        {session.reason && (
          <div className="border-b border-slate-100 bg-amber-50 px-5 py-3">
            <div className="text-[11px] font-semibold uppercase text-amber-700">
              Lý do chuyển CCC
            </div>
            <div className="mt-1 whitespace-pre-wrap text-xs text-amber-900">
              {session.reason}
            </div>
          </div>
        )}

        <div className="space-y-4 overflow-y-auto p-5">
          {loading && (
            <div className="text-sm text-slate-500">Đang tải hội thoại...</div>
          )}

          {error && <div className="text-sm text-rose-600">{error}</div>}

          {!loading && !error && messages.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Phiên này chưa có nội dung hội thoại.
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-sky-500 px-4 py-2.5 text-sm text-white">
                  <div className="whitespace-pre-wrap">{message.question}</div>

                  <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-sky-100">
                    {message.questionType && (
                      <span className="rounded bg-sky-600/60 px-1.5 py-0.5">
                        {message.questionType}
                      </span>
                    )}
                    {message.category && (
                      <span className="rounded bg-sky-600/60 px-1.5 py-0.5">
                        {message.category}
                      </span>
                    )}
                    <span>{formatDateTime(message.external_created_at)}</span>
                  </div>
                </div>
              </div>

              {message.answer && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-6 text-slate-700">
                    {message.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
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
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate font-medium text-slate-700">{value}</div>
    </div>
  );
}
