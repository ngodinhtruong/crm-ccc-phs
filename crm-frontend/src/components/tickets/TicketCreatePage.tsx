"use client";

import { TicketCreateForm } from "@/components/tickets/TicketCreateForm";
import { useTicketCreate } from "@/hooks/useTicketCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function TicketCreatePage() {
  const ticket = useTicketCreate();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "Tickets",
          href: "/tickets",
        },
        {
          label: "Thêm ticket",
        },
      ]}
    >
      {ticket.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {ticket.error}
        </div>
      )}

      {ticket.loadingDropdowns && (
        <div className="rounded-md border bg-white px-4 py-3 text-sm text-slate-500">
          Đang tải dữ liệu tạo ticket...
        </div>
      )}

      <TicketCreateForm ticket={ticket} />
    </DashboardLayout>
  );
}