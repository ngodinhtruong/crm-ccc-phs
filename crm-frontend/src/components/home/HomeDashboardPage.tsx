"use client";

import { HomeChartsGrid } from "@/components/home/HomeChartsGrid";
import { HomeLatestTicketsTable } from "@/components/home/HomeLatestTicketsTable";
import { HomePlaceholderPanel } from "@/components/home/HomePlaceholderPanel";
import { HomeTabs } from "@/components/home/HomeTabs";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function HomeDashboardPage() {
  const home = useHomeDashboard();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
      ]}
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <HomeTabs activeTab={home.activeTab} onChange={home.setActiveTab} />

        <div className="space-y-3 bg-[#eef2f5] p-3">
          {home.loading && (
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              Đang tải dữ liệu từ DB...
            </div>
          )}

          {home.error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {home.error}
            </div>
          )}

          {!home.loading &&
            !home.error &&
            home.dashboard &&
            home.activeTab === "Ticket" && (
              <>
                <HomeLatestTicketsTable rows={home.dashboard.latest_tickets || []} />

                <HomeChartsGrid dashboard={home.dashboard} />
              </>
            )}

          {!home.loading &&
            !home.error &&
            home.dashboard &&
            home.activeTab !== "Ticket" && (
              <HomePlaceholderPanel tab={home.activeTab} />
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}