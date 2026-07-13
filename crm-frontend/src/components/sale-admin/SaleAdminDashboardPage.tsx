"use client";

import { DashboardLayout } from "@/layouts/DashboardLayout";

export function SaleAdminDashboardPage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/workspace",
        },
        {
          label: "Sale Admin",
        },
        {
          label: "Dashboard",
        },
      ]}
    >
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">
          Dashboard Sale Admin
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Phân hệ Sale Admin sẽ quản lý SA Records, Dashboard Sale Admin và KPI Sale Admin.
        </p>
      </div>
    </DashboardLayout>
  );
}