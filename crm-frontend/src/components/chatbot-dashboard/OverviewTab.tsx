"use client";

import { ChatbotDashboardCharts, GranularityMode } from "@/components/chatbot-dashboard/ChatbotDashboardCharts";
import {
  ChatbotOverviewResponse,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";

export function OverviewTab({
  overview,
  onOpenTickets,
  granularity = "month",
  onGranularityChange,
}: {
  overview: ChatbotOverviewResponse;
  onOpenTickets: (options: TicketOpenOptions) => void;
  granularity?: GranularityMode;
  onGranularityChange?: (mode: GranularityMode) => void;
}) {
  return (
    <div className="space-y-6">
      <ChatbotDashboardCharts
        charts={overview.charts}
        granularity={granularity}
        onGranularityChange={onGranularityChange}
        faqs={overview.quick_lists?.top_faqs}
      />
    </div>
  );
}
