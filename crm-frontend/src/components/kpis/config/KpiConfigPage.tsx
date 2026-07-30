"use client";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useKpiConfig } from "@/hooks/useKpiConfig";

import { KpiConfigTabs } from "./KpiConfigTabs";
import { KpiGateConfigsTab } from "./KpiGateConfigsTab";
import { KpiGroupsTab } from "./KpiGroupsTab";
import { KpiMetricsTab } from "./KpiMetricsTab";
import { KpiPeriodHeader, KpiHeaderActions } from "./KpiPeriodHeader";
import { KpiRewardTiersTab } from "./KpiRewardTiersTab";
import { KpiWeightValidationPanel } from "./KpiWeightValidationPanel";

import { useEffect, useState } from "react";
import { ToastItem, ToastMessage } from "@/components/ui/Toast";

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        ACTIVE
      </span>
    );
  }

  if (status === "DRAFT") {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        DRAFT
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {status}
    </span>
  );
}

export function KpiConfigPage() {
  const config = useKpiConfig();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (config.notice) {
      setToasts((prev) => [
        ...prev,
        {
          id: `notice-${Date.now()}`,
          type: "success",
          title: config.notice || "Cấu hình trọng số KPI hợp lệ.",
        },
      ]);
    }
  }, [config.notice]);

  useEffect(() => {
    if (config.error) {
      setToasts((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "error",
          title: "Thao tác không thành công",
          message: config.error,
        },
      ]);
    }
  }, [config.error]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

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
          label: "Cấu hình KPI",
        },
      ]}
      rightAction={
        <KpiHeaderActions
          config={config}
          onOpenCreate={() => setModalMode("create")}
          onOpenEdit={() => setModalMode("edit")}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((prev) => !prev)}
        />
      }
      sidebarDefaultExpandedGroupKey="sale-admin"
      sidebarDefaultActiveChildKey="sale-admin-kpi-config"
    >
      {/* Floating Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      {config.loading ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          Đang tải cấu hình KPI...
        </div>
      ) : !config.canView ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          Bạn không có quyền xem cấu hình KPI.
        </div>
      ) : (
        <div className="space-y-4">
          <KpiPeriodHeader
            config={config}
            modalMode={modalMode}
            setModalMode={setModalMode}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
          />

          {!config.periodDetail ? (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
              Chưa chọn kỳ KPI.
            </div>
          ) : config.loadingDetail ? (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
              Đang tải chi tiết kỳ KPI...
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="flex h-12 items-center justify-between border-b bg-white px-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-800">
                      {config.periodDetail.period_code} - {config.periodDetail.period_name}
                    </h2>
                    <StatusBadge status={config.periodDetail.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {config.periodDetail.start_date} → {config.periodDetail.end_date}
                  </p>
                </div>

                {config.selectedProfile && (
                  <div className="text-right text-xs text-slate-500">
                    <div>
                      Bộ KPI: <span className="font-semibold text-slate-800">{config.selectedProfile.profile_code}</span>
                    </div>
                    <div>
                      Role áp dụng: <span className="font-semibold text-slate-800">{config.selectedProfile.target_role_code}</span> · Tổng trọng số: <span className="font-semibold text-slate-800">{config.selectedProfile.total_weight}%</span>
                    </div>
                  </div>
                )}
              </div>

              <KpiWeightValidationPanel validation={config.weightValidation} />

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
