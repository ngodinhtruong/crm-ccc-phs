"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Building2, Mail, User } from "lucide-react";

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
          href: "/sale-admin/dashboard",
        },
        {
          label: "KPI Sale Admin",
        },
      ]}
      rightAction={<KpiDashboardHeader dashboard={dashboard} />}
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-800">
                  Dashboard KPI Sale Admin
                </h1>
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-semibold text-[#059669]">
                  {dashboard.selectedProfileCode === "SA_SUP" ? "KPI SUP" : "KPI SA"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Kỳ KPI mặc định theo tháng hiện tại. SA xem KPI cá nhân, SUP xem KPI cá nhân; xem KPI nhân viên qua Bảng xếp hạng.
              </p>
            </div>
            <div className="hidden text-xs text-slate-400 font-medium md:block">
              Tự động cập nhật nền mỗi 60 giây
            </div>
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

              {/* Employee Info Card */}
              {dashboard.activeSummary && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    {/* Avatar / Initial */}
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-base font-bold text-white shadow-sm">
                      {(dashboard.activeSummary.employee_name || dashboard.activeSummary.user_username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    {/* Main Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-slate-800 truncate">
                          {dashboard.activeSummary.employee_name || dashboard.activeSummary.user_username || "—"}
                        </span>
                        {(dashboard.activeSummary.role_names || []).map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-[#059669]"
                          >
                            {role}
                          </span>
                        ))}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {dashboard.activeSummary.user_username && (
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-slate-400 flex-shrink-0" />
                            @{dashboard.activeSummary.user_username}
                          </span>
                        )}
                        {dashboard.activeSummary.employee_position && (
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} className="text-slate-400 flex-shrink-0" />
                            {dashboard.activeSummary.employee_position}
                          </span>
                        )}
                        {dashboard.activeSummary.branch_name && (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                            {dashboard.activeSummary.branch_name}
                          </span>
                        )}
                        {dashboard.activeSummary.user_email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-slate-400 flex-shrink-0" />
                            {dashboard.activeSummary.user_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                {/* Unified Card Header with Attached Tabs */}
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1 shadow-2xs">
                    {tabs.map((tab) => {
                      const active = activeTab === tab.key;

                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveTab(tab.key)}
                          className={[
                            "flex h-8 items-center gap-2 rounded-md px-4 text-xs font-bold transition-all",
                            active
                              ? "bg-[#059669] text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                          ].join(" ")}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    {activeTab === "A" && dashboard.manualSections[0] && (
                      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[#059669]">
                        Trọng số Phần A: {dashboard.manualSections[0].section.weight_percent}%
                      </span>
                    )}
                    {activeTab === "B" && dashboard.autoSections[0] && (
                      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[#059669]">
                        Trọng số Phần B: {dashboard.autoSections[0].section.weight_percent}%
                      </span>
                    )}
                    {activeTab === "OTHER" && (
                      <span className="text-slate-500 font-medium">Các chỉ tiêu KPI bổ sung</span>
                    )}
                    {activeTab === "GATES" && (
                      <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                        {dashboard.gateItems.length} điều kiện cổng
                      </span>
                    )}
                  </div>
                </div>

                {/* Attached Content */}
                {activeTab === "A" && (
                  <KpiMetricProgressSection
                    hideCardWrapper
                    title="Bảng A - Điểm Admin nhập"
                    description="SA chỉ xem điểm đã được Admin/SUP nhập, không chỉnh sửa tại dashboard. Bấm vào từng chỉ tiêu để xem chi tiết."
                    sections={dashboard.manualSections}
                    emptyText="Chưa có dữ liệu KPI Bảng A."
                    contributionParams={dashboard.params}
                  />
                )}

                {activeTab === "B" && (
                  <KpiMetricProgressSection
                    hideCardWrapper
                    title="Bảng B - Dữ liệu CRM tự động"
                    description="Giá trị thực tế được lấy từ CRM/SA Record và tự động cập nhật nền, không reload lại trang. Bấm vào từng chỉ tiêu để xem chi tiết."
                    sections={dashboard.autoSections}
                    emptyText="Chưa có dữ liệu KPI Bảng B."
                    contributionParams={dashboard.params}
                  />
                )}

                {activeTab === "OTHER" && (
                  <KpiMetricProgressSection
                    hideCardWrapper
                    title="Bảng khác"
                    description="Các phần KPI ngoài Bảng A và B."
                    sections={dashboard.otherSections}
                    emptyText="Chưa có dữ liệu KPI."
                    contributionParams={dashboard.params}
                  />
                )}

                {activeTab === "GATES" && (
                  <KpiGateStatusPanel items={dashboard.gateItems} hideCardWrapper />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
