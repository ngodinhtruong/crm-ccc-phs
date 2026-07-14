"use client";

import { AlertTriangle, Clock } from "lucide-react";

import { AccessDenied } from "@/components/common";
import { AdminDashboardFilters } from "@/components/sale-admin/dashboard/AdminDashboardFilters";
import { AdminOverviewCards } from "@/components/sale-admin/dashboard/AdminOverviewCards";
import { BranchRankingTable } from "@/components/sale-admin/dashboard/BranchRankingTable";
import { FeeByBranchChart } from "@/components/sale-admin/dashboard/FeeByBranchChart";
import { IcpDistributionChart } from "@/components/sale-admin/dashboard/IcpDistributionChart";
import { ProductFeeChart } from "@/components/sale-admin/dashboard/ProductFeeChart";
import { formatDateTime } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { TopAccountsTable } from "@/components/sale-admin/dashboard/TopAccountsTable";
import { TopEmployeeChart } from "@/components/sale-admin/dashboard/TopEmployeeChart";
import { TopEmployeesTable } from "@/components/sale-admin/dashboard/TopEmployeesTable";
import { useSaleAdminDashboard } from "@/hooks/useSaleAdminDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function SaleAdminDashboardPage() {
  const dashboard = useSaleAdminDashboard();
  const data = dashboard.data;

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
          label: "Dashboard quản trị",
        },
      ]}
      sidebarDefaultExpandedGroupKey="sale-admin"
      sidebarDefaultActiveChildKey="sale-admin-dashboard"
    >
      {dashboard.loading ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          Đang tải dashboard quản trị Sale Admin...
        </div>
      ) : !dashboard.canView ? (
        <AccessDenied
          title="Không có quyền xem dashboard quản trị"
          description="Chức năng này dành cho Admin/Bộ phận quản lý hoặc tài khoản được cấp quyền xem toàn hệ thống."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b bg-white px-4 py-3">
              <div>
                <h1 className="text-sm font-semibold text-slate-800">
                  Dashboard Quản trị Sale Admin
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Theo dõi hiệu suất cuộc gọi, kích hoạt tài khoản, phí giao dịch, hiệu quả chi nhánh và phân khúc ICP.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock size={14} />
                <span>
                  {dashboard.backgroundRefreshing
                    ? "Đang cập nhật nền..."
                    : `Cập nhật: ${formatDateTime(dashboard.lastUpdatedAt)}`}
                </span>
              </div>
            </div>

            <AdminDashboardFilters dashboard={dashboard} />
          </div>

          {dashboard.error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
              <AlertTriangle size={15} />
              {dashboard.error}
            </div>
          )}

          {!data ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Chưa có dữ liệu dashboard.
            </div>
          ) : (
            <>
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      {data.period.label}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Phạm vi: {data.period.start_date} → {data.period.end_date} · Đối chiếu {data.period.previous_label}
                    </p>
                  </div>

                  <div className="rounded bg-sky-50 px-3 py-2 text-xs text-sky-700">
                    Rule KH tiềm năng: {data.meta.potential_account_rule}
                  </div>
                </div>
              </div>

              <AdminOverviewCards items={data.overview} />

              <div className="grid gap-4 xl:grid-cols-2">
                <BranchRankingTable rows={data.branch_ranking} />
                <FeeByBranchChart rows={data.branch_fee_chart} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <TopEmployeesTable rows={data.top_employees} />
                <TopEmployeeChart rows={data.top_employee_chart} />
              </div>

              <TopAccountsTable rows={data.top_accounts} />

              <div className="grid gap-4 xl:grid-cols-2">
                <ProductFeeChart rows={data.product_fee_chart} />
                <IcpDistributionChart rows={data.icp_distribution} />
              </div>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
