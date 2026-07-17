"use client";

import { AlertCircle } from "lucide-react";

import { KpiAdminHeader } from "@/components/kpis/admin/KpiAdminHeader";
import { KpiAdminRankingTab } from "@/components/kpis/admin/KpiAdminRankingTab";
import { KpiAdminReportTab } from "@/components/kpis/admin/KpiAdminReportTab";
import { KpiAdminTargetsTab } from "@/components/kpis/admin/KpiAdminTargetsTab";
import { useKpiAdmin } from "@/hooks/useKpiAdmin";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function KpiAdminPage() {
  const admin = useKpiAdmin();

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
          label: "KPI Admin",
        },
      ]}
      sidebarDefaultExpandedGroupKey="sale-admin"
      sidebarDefaultActiveChildKey="sa-kpi-admin"
    >
      <div className="space-y-4">
        <KpiAdminHeader admin={admin} />

        {admin.error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{admin.error}</span>
          </div>
        )}

        {admin.notice && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {admin.notice}
          </div>
        )}

        {admin.loading && !admin.dashboard ? (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
            Đang tải dữ liệu KPI Admin...
          </div>
        ) : (
          <>
            {admin.activeTab === "ranking" && <KpiAdminRankingTab admin={admin} />}
            {admin.activeTab === "report" && <KpiAdminReportTab admin={admin} />}
            {admin.activeTab === "targets" && <KpiAdminTargetsTab admin={admin} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
