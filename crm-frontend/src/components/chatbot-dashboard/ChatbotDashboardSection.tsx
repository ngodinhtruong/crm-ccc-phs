"use client";

import { useMemo } from "react";
import { ConversationModal } from "@/components/chatbot-dashboard/ConversationModal";
import { DashboardTabs } from "@/components/chatbot-dashboard/DashboardTabs";
import { ChatbotPeriodFilterToolbar } from "@/components/chatbot-dashboard/ChatbotPeriodFilterToolbar";
import { FaqTab } from "@/components/chatbot-dashboard/FaqTab";
import { KpiCards } from "@/components/chatbot-dashboard/KpiCards";
import { OverviewTab } from "@/components/chatbot-dashboard/OverviewTab";
import { PendingTicketsPanel } from "@/components/chatbot-dashboard/PendingTicketsPanel";
import { TicketsTab } from "@/components/chatbot-dashboard/TicketsTab";
import { useChatbotDashboard } from "@/hooks/useChatbotDashboard";
import { GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";

export function ChatbotDashboardSection({
  hideToolbar = false,
  dateFrom,
  dateTo,
  granularity = "MONTH",
  onlyTrendChart = false,
  dashboardInstance,
}: {
  hideToolbar?: boolean;
  dateFrom?: string;
  dateTo?: string;
  granularity?: GranularityMode;
  onlyTrendChart?: boolean;
  dashboardInstance?: ReturnType<typeof useChatbotDashboard>;
}) {
  const chatbotGranularity =
    granularity === "QUARTER"
      ? "quarter"
      : granularity === "YEAR"
      ? "year"
      : "month";

  const initialFilters = useMemo(
    () => ({
      start_date: dateFrom || "",
      end_date: dateTo || "",
      granularity: chatbotGranularity as any,
    }),
    [dateFrom, dateTo, chatbotGranularity]
  );

  const internalDashboard = useChatbotDashboard(initialFilters);
  const dashboard = dashboardInstance || internalDashboard;

  if (onlyTrendChart) {
    if (dashboard.loading || !dashboard.overview) {
      return (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-400">
          Đang tải biểu đồ xu hướng Chatbot...
        </div>
      );
    }
    return <OverviewTab overview={dashboard.overview} onlyTrendChart />;
  }

  return (
    <div className="space-y-4">
      {!hideToolbar && (
        <ChatbotPeriodFilterToolbar
          filters={dashboard.filters}
          effectiveGranularity={dashboard.effectiveGranularity}
          onFilterChange={dashboard.updateFilter}
          onApply={dashboard.applyFilters}
          onClear={dashboard.clearFilters}
          onGranularityChange={dashboard.changeGranularity}
          onReload={dashboard.refresh}
        />
      )}

      <DashboardTabs
        activeTab={dashboard.activeTab}
        onChange={dashboard.changeTab}
      />

      {dashboard.activeTab === "overview" && dashboard.overview && (
        <>
          <KpiCards
            summary={dashboard.overview.summary}
            onOpenTickets={dashboard.openTicketsFromOverview}
          />

          <PendingTicketsPanel
            rows={dashboard.overview.quick_lists.latest_ccc_tickets}
            total={
              dashboard.overview.quick_lists.pending_ticket_total ??
              dashboard.overview.quick_lists.latest_ccc_tickets.length
            }
          />
        </>
      )}

      {dashboard.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {dashboard.error}
        </div>
      )}

      {dashboard.loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Đang tải dữ liệu...
        </div>
      )}

      {!dashboard.loading &&
        !dashboard.error &&
        dashboard.activeTab === "overview" &&
        dashboard.overview && <OverviewTab overview={dashboard.overview} />}

      {!dashboard.loading &&
        !dashboard.error &&
        dashboard.activeTab === "tickets" && (
          <TicketsTab
            tickets={dashboard.tickets}
            count={dashboard.ticketCount}
            title={dashboard.ticketPanelTitle}
            status={dashboard.ticketStatus}
            keyword={dashboard.ticketKeyword}
            category={dashboard.ticketCategory}
            onStatusChange={dashboard.changeTicketStatus}
            onKeywordChange={dashboard.setTicketKeyword}
            onSearch={dashboard.searchTickets}
            onClearPreset={dashboard.clearTicketFilters}
            onOpenSession={dashboard.setSelectedSession}
          />
        )}

      {!dashboard.loading &&
        !dashboard.error &&
        dashboard.activeTab === "faqs" && (
          <FaqTab
            faqs={dashboard.faqs}
            count={dashboard.faqCount}
            keyword={dashboard.faqKeyword}
            onKeywordChange={dashboard.setFaqKeyword}
            onSearch={dashboard.searchFaqs}
          />
        )}

      {dashboard.selectedSession && (
        <ConversationModal
          session={dashboard.selectedSession}
          onClose={() => dashboard.setSelectedSession(null)}
        />
      )}
    </div>
  );
}
