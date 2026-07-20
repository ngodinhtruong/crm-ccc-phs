"use client";

import { RefreshCcw } from "lucide-react";

import { ConversationModal } from "@/components/chatbot-dashboard/ConversationModal";
import { DashboardTabs } from "@/components/chatbot-dashboard/DashboardTabs";
import { DashboardToolbar } from "@/components/chatbot-dashboard/DashboardToolbar";
import { FaqTab } from "@/components/chatbot-dashboard/FaqTab";
import { KpiCards } from "@/components/chatbot-dashboard/KpiCards";
import { OverviewTab } from "@/components/chatbot-dashboard/OverviewTab";
import { PendingTicketsPanel } from "@/components/chatbot-dashboard/PendingTicketsPanel";
import { TicketsTab } from "@/components/chatbot-dashboard/TicketsTab";
import { useChatbotDashboard } from "@/hooks/useChatbotDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function ChatbotDashboardPage() {
  const dashboard = useChatbotDashboard();

  return (
    <>
      <DashboardLayout
        breadcrumbs={[
          {
            label: "TRANG CHỦ",
            href: "/",
          },
          {
            label: "Báo cáo",
          },
          {
            label: "Dashboard Chatbot",
          },
        ]}
        rightAction={
          <button
            type="button"
            onClick={dashboard.refresh}
            className="flex h-8 items-center gap-2 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
          >
            <RefreshCcw size={14} />
            Tải lại
          </button>
        }
      >
        <DashboardToolbar
          filters={dashboard.filters}
          activeTab={dashboard.activeTab}
          onFilterChange={dashboard.updateFilter}
          onApply={dashboard.refresh}
          onClear={dashboard.clearFilters}
          onQuickPreset={dashboard.applyQuickPreset}
        />

        <DashboardTabs
          activeTab={dashboard.activeTab}
          onChange={dashboard.changeTab}
        />

        {/* KPI + hàng chờ cần xử lý: chỉ hiển thị ở tab Tổng quan */}
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
          dashboard.overview && (
            <OverviewTab
              overview={dashboard.overview}
              onOpenTickets={dashboard.openTicketsFromOverview}
            />
          )}

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
      </DashboardLayout>

      {dashboard.selectedSession && (
        <ConversationModal
          session={dashboard.selectedSession}
          onClose={() => dashboard.setSelectedSession(null)}
        />
      )}
    </>
  );
}