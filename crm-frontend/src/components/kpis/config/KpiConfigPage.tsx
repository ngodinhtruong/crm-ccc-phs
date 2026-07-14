"use client";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useKpiConfig } from "@/hooks/useKpiConfig";

import { KpiConfigTabs } from "./KpiConfigTabs";
import { KpiGateConfigsTab } from "./KpiGateConfigsTab";
import { KpiGroupsTab } from "./KpiGroupsTab";
import { KpiMetricsTab } from "./KpiMetricsTab";
import { KpiPeriodHeader } from "./KpiPeriodHeader";
import { KpiRewardTiersTab } from "./KpiRewardTiersTab";
import { KpiWeightValidationPanel } from "./KpiWeightValidationPanel";

export function KpiConfigPage() {
  const config = useKpiConfig();

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
          label: "Cấu hình KPI",
        },
      ]}
      sidebarDefaultExpandedGroupKey="sale-admin"
      sidebarDefaultActiveChildKey="sale-admin-kpi-config"
    >
      {config.loading ? (
        <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Đang tải cấu hình KPI...
        </div>
      ) : !config.canView ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Bạn không có quyền xem cấu hình KPI.
        </div>
      ) : (
        <div className="space-y-4">
          <KpiPeriodHeader config={config} />

          {/* {config.error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
              {config.error}
            </div>
          )}

          {config.notice && (
            <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              {config.notice}
            </div>
          )} */}

          <KpiWeightValidationPanel validation={config.weightValidation} />

          {!config.periodDetail ? (
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Chưa chọn kỳ KPI.
            </div>
          ) : config.loadingDetail ? (
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Đang tải chi tiết kỳ KPI...
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold text-slate-800">
                  {config.periodDetail.period_code} -{" "}
                  {config.periodDetail.period_name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Trạng thái: {config.periodDetail.status} · Từ{" "}
                  {config.periodDetail.start_date} đến{" "}
                  {config.periodDetail.end_date}
                </div>
              </div>

              <KpiConfigTabs
                activeTab={config.activeTab}
                onChange={config.setActiveTab}
              />

              {config.activeTab === "metrics" && (
                <KpiMetricsTab config={config} />
              )}

              {config.activeTab === "groups" && <KpiGroupsTab config={config} />}

              {config.activeTab === "gates" && (
                <KpiGateConfigsTab config={config} />
              )}

              {config.activeTab === "rewards" && (
                <KpiRewardTiersTab config={config} />
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}