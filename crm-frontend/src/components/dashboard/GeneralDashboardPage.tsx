"use client";

import { RefreshCw } from "lucide-react";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useCccDashboard } from "@/hooks/useCccDashboard";
import { TicketListTable } from "@/components/tickets/dashboard/CccDashboardTables";

function LoadingBlock() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
      Đang tải dữ liệu...
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      {message}
    </div>
  );
}

export function GeneralDashboardPage() {
  const dashboard = useCccDashboard("CREATED");

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "BÁO CÁO TỔNG HỢP",
        },
      ]}
      rightAction={
        <button
          type="button"
          onClick={dashboard.reload}
          disabled={dashboard.loading}
          className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
        >
          <RefreshCw size={15} className={dashboard.loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      }
    >
      <div className="space-y-4">
        {dashboard.error && <ErrorBlock message={dashboard.error} />}

        {dashboard.loading && !dashboard.data && <LoadingBlock />}

        {dashboard.data && (
          <TicketListTable
            title="Ticket chưa xử lý"
            description="Danh sách các ticket đang chờ xử lý theo bộ lọc hiện tại."
            items={dashboard.data.tables.pending_tickets || []}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

