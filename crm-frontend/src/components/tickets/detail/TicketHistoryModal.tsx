"use client";

import { X } from "lucide-react";

import { TicketHistoryTimeline } from "@/components/tickets/detail/TicketHistoryTimeline";
import { TicketHistoryItem } from "@/types/ticket.type";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export function TicketHistoryModal({
  ticketId,
  ticketCode,
  fetchHistory,
  onClose,
}: {
  ticketId: number;
  ticketCode?: string;
  /** Hàm lấy lịch sử — mặc định ticket thường; ticket chatbot truyền hàm riêng. */
  fetchHistory?: (id: number) => Promise<TicketHistoryItem[]>;
  onClose: () => void;
}) {
  useEscapeKey(onClose);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Lịch sử thay đổi
            </h2>
            {ticketCode && (
              <p className="mt-0.5 text-xs text-slate-500">
                Ticket{" "}
                <span className="font-semibold text-[#059669]">{ticketCode}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <TicketHistoryTimeline
            ticketId={ticketId}
            fetchHistory={fetchHistory}
          />
        </div>
      </div>
    </div>
  );
}
