import { Check, RotateCw, X } from "lucide-react";

import {
  TICKET_STATUS_FLOW,
  TICKET_STATUS_LABELS,
} from "@/constants/ticket-detail.constant";
import { TicketStatusCode } from "@/types/ticket.type";

/**
 * Thanh tiến trình vòng đời ticket:
 * Mở → Tiếp nhận → Đang xử lý → Đã xong (chờ đóng) → Đã đóng
 * Ticket bị hủy nằm ngoài luồng nên hiển thị riêng.
 */
export function TicketStatusFlow({
  status,
}: {
  status?: TicketStatusCode | string | null;
}) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center justify-center gap-2 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white">
          <X size={18} />
        </div>
        <span className="text-sm font-semibold text-rose-600">
          Ticket đã bị hủy
        </span>
      </div>
    );
  }

  const currentIndex = TICKET_STATUS_FLOW.indexOf(status as TicketStatusCode);

  return (
    <div className="flex items-center justify-center overflow-x-auto py-6">
      {TICKET_STATUS_FLOW.map((step, index) => {
        const isDone = currentIndex > index;
        const isCurrent = currentIndex === index;
        const reached = currentIndex >= index;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
                  reached ? "bg-sky-500" : "bg-slate-300"
                }`}
              >
                {isCurrent ? (
                  <RotateCw size={18} />
                ) : isDone ? (
                  <Check size={18} />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>

              <span
                className={`mt-2 max-w-[110px] text-center text-xs font-medium ${
                  reached ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {TICKET_STATUS_LABELS[step]}
              </span>
            </div>

            {index < TICKET_STATUS_FLOW.length - 1 && (
              <div
                className={`mx-2 mb-6 h-0.5 w-12 lg:w-20 ${
                  currentIndex > index ? "bg-sky-500" : "bg-slate-300"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
