"use client";

import { useEffect, useMemo, useState } from "react";

import { KpiDashboardHeader } from "@/components/kpis/dashboard/KpiDashboardHeader";
import { KpiGateStatusPanel } from "@/components/kpis/dashboard/KpiGateStatusPanel";
import { KpiMetricProgressSection } from "@/components/kpis/dashboard/KpiMetricProgressSection";
import { KpiSummaryCards } from "@/components/kpis/dashboard/KpiSummaryCards";
import { useKpiDashboard } from "@/hooks/useKpiDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";

type KpiDashboardTab = "A" | "B" | "OTHER" | "GATES";

const baseTabs: { key: KpiDashboardTab; label: string }[] = [
  { key: "A", label: "Bảng A" },
  { key: "B", label: "Bảng B" },
  { key: "GATES", label: "Điều kiện cổng" },
];

export function KpiDashboardPage() {
  const dashboard = useKpiDashboard();
  const [activeTab, setActiveTab] = useState<KpiDashboardTab>("A");

  const tabs = useMemo(() => {
    if (dashboard.otherSections.length > 0) {
      return [
        ...baseTabs.slice(0, 2),
        { key: "OTHER" as const, label: "Bảng khác" },
        baseTabs[2],
      ];
    }

    return baseTabs;
  }, [dashboard.otherSections.length]);

  useEffect(() => {
    if (activeTab === "A" && dashboard.manualSections.length === 0 && dashboard.autoSections.length > 0) {
      setActiveTab("B");
    }
  }, [activeTab, dashboard.autoSections.length, dashboard.manualSections.length]);

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
          label: "KPI Sale Admin",
        },
      ]}
      sidebarDefaultExpandedGroupKey="sale-admin"
      sidebarDefaultActiveChildKey="sale-admin-kpi"
    >
      {dashboard.loading ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          Đang tải dashboard KPI...
        </div>
      ) : !dashboard.canView ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Bạn không có quyền xem dashboard KPI.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 items-center justify-between border-b bg-white px-4">
              <div>
                <h1 className="text-sm font-semibold text-slate-800">
                  Dashboard KPI Sale Admin
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Kỳ KPI mặc định theo tháng hiện tại. SA xem KPI cá nhân, SUP xem KPI cá nhân; xem KPI nhân viên qua Bảng xếp hạng.
                </p>
              </div>

              <div className="hidden text-xs text-slate-500 md:block">
                Tự động cập nhật nền mỗi 60 giây
              </div>
            </div>

            <KpiDashboardHeader dashboard={dashboard} />
          </div>

          {dashboard.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
              {dashboard.error}
            </div>
          )}

          {dashboard.notice && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              {dashboard.notice}
            </div>
          )}

          {!dashboard.selectedPeriodId || !dashboard.selectedProfileCode ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Chưa có kỳ KPI tháng hiện tại hoặc bộ KPI phù hợp với tài khoản này.
            </div>
          ) : dashboard.loadingDetail && !dashboard.hasDashboardData ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Đang tải dữ liệu KPI...
            </div>
          ) : (
            <>
              <KpiSummaryCards dashboard={dashboard} />

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap gap-2 border-b bg-white px-4 pt-3">
                  {tabs.map((tab) => {
                    const active = activeTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={[
                          "border-b-2 px-3 pb-3 text-xs font-semibold",
                          active
                            ? "border-[#10b981] text-[#059669]"
                            : "border-transparent text-slate-500 hover:text-slate-800",
                        ].join(" ")}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTab === "A" && (
                <KpiMetricProgressSection
                  title="Bảng A - Điểm Admin nhập"
                  description="SA chỉ xem điểm đã được Admin/SUP nhập, không chỉnh sửa tại dashboard. Bấm vào từng chỉ tiêu để xem chi tiết."
                  sections={dashboard.manualSections}
                  emptyText="Chưa có dữ liệu KPI Bảng A."
                  contributionParams={dashboard.params}
                />
              )}

              {activeTab === "B" && (
                <KpiMetricProgressSection
                  title="Bảng B - Dữ liệu CRM tự động"
                  description="Giá trị thực tế được lấy từ CRM/SA Record và tự động cập nhật nền, không reload lại trang. Bấm vào từng chỉ tiêu để xem chi tiết."
                  sections={dashboard.autoSections}
                  emptyText="Chưa có dữ liệu KPI Bảng B."
                  contributionParams={dashboard.params}
                />
              )}

              {activeTab === "OTHER" && (
                <KpiMetricProgressSection
                  title="Bảng khác"
                  description="Các phần KPI ngoài Bảng A và B."
                  sections={dashboard.otherSections}
                  emptyText="Chưa có dữ liệu KPI."
                  contributionParams={dashboard.params}
                />
              )}

              {activeTab === "GATES" && (
                <KpiGateStatusPanel items={dashboard.gateItems} />
              )}
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
