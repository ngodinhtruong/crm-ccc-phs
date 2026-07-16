import { Check, RotateCw } from "lucide-react";

import {
  CHATBOT_TICKET_FLOW,
  CHATBOT_TICKET_STATUS_LABELS,
} from "@/constants/chatbot-ticket.constant";
import { ChatbotTicketStatus } from "@/types/chatbot-ticket.type";

/**
 * Thanh tiến trình trạng thái ticket, giống ảnh giao diện:
 * Tiếp nhận → Chuyển phòng ban → Đang xử lý → Đã xong (Chờ đóng).
 * Các bước trước bước hiện tại: xong (dấu ✓). Bước hiện tại: đang (xoay).
 */
export function TicketStatusFlow({
  status,
}: {
  status: ChatbotTicketStatus;
}) {
  // Ticket bị hủy hoặc còn chờ tiếp nhận thì chưa vào luồng
  const currentIndex = CHATBOT_TICKET_FLOW.indexOf(status);

  return (
    <div className="flex items-center justify-center py-6">
      {CHATBOT_TICKET_FLOW.map((step, index) => {
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
                {CHATBOT_TICKET_STATUS_LABELS[step]}
              </span>
            </div>

            {index < CHATBOT_TICKET_FLOW.length - 1 && (
              <div
                className={`mx-2 mb-6 h-0.5 w-16 lg:w-24 ${
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
