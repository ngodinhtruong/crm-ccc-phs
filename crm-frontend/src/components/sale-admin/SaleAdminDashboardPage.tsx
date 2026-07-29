"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AccessDenied, CccPeriodControls } from "@/components/common";
import { ChartViewMode, GranularityMode, CompareMode } from "@/components/tickets/dashboard/CccDashboardUtils";
import { PermissionCode, useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { useSaleAdminDashboard } from "@/hooks/useSaleAdminDashboard";
import {
  AdminDashboardFilters,
  getSaleAdminActiveFilterCount,
} from "@/components/sale-admin/dashboard/AdminDashboardFilters";
import { AdminOverviewCards } from "@/components/sale-admin/dashboard/AdminOverviewCards";
import { BranchRankingTable } from "@/components/sale-admin/dashboard/BranchRankingTable";
import { CustomerGroupDistributionPanel } from "@/components/sale-admin/dashboard/CustomerGroupDistributionPanel";
import { FeeByBranchChart } from "@/components/sale-admin/dashboard/FeeByBranchChart";
import { IcpDistributionChart } from "@/components/sale-admin/dashboard/IcpDistributionChart";
import { ProductFeeChart } from "@/components/sale-admin/dashboard/ProductFeeChart";
import { TopAccountsTable } from "@/components/sale-admin/dashboard/TopAccountsTable";
import { TopEmployeeChart } from "@/components/sale-admin/dashboard/TopEmployeeChart";
import { TopEmployeesTable } from "@/components/sale-admin/dashboard/TopEmployeesTable";
import {
  formatDateTime,
  formatNumber,
  getDateRangeLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";

function LoadingBlock() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
      Đang tải Báo cáo Sale Admin...
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      {message}
    </div>
  );
}

function ActiveFilterSummary({
  dashboard,
  activeFilterCount,
  periodLabel,
}: {
  dashboard: ReturnType<typeof useSaleAdminDashboard>;
  activeFilterCount: number;
  periodLabel: string;
}) {
  const selectedBranch = dashboard.data?.filters.branch_options.find(
    (branch) => String(branch.id) === dashboard.branch
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
        <CalendarDays size={13} className="text-[#0097cf]" />
        {periodLabel}
      </span>

      <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
        Chi nhánh: {selectedBranch?.branch_name || "Tất cả"}
      </span>

      <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
        Bộ lọc: {activeFilterCount}
      </span>
    </div>
  );
}

function HeroStats({ dashboard }: { dashboard: ReturnType<typeof useSaleAdminDashboard> }) {
  const branchCount = dashboard.data?.branch_ranking.length || 0;
  const employeeCount = dashboard.data?.top_employees.length || 0;
  const accountCount = dashboard.data?.top_accounts.length || 0;

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-lg border border-sky-100 bg-white/90 px-3 py-2 shadow-sm">
        <p className="text-[11px] font-medium text-slate-500">Chi nhánh có dữ liệu</p>
        <p className="mt-0.5 text-sm font-bold text-slate-900">{formatNumber(branchCount)} CN</p>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-white/90 px-3 py-2 shadow-sm">
        <p className="text-[11px] font-medium text-slate-500">Nhân viên có đóng góp</p>
        <p className="mt-0.5 text-sm font-bold text-emerald-700">{formatNumber(employeeCount)} NV</p>
      </div>
      <div className="rounded-lg border border-amber-100 bg-white/90 px-3 py-2 shadow-sm">
        <p className="text-[11px] font-medium text-slate-500">Tài khoản phát sinh phí</p>
        <p className="mt-0.5 text-sm font-bold text-amber-700">{formatNumber(accountCount)} TK</p>
      </div>
    </div>
  );
}

export function SaleAdminDashboardPage() {
  const authz = useCurrentUserPermissions();
  const dashboard = useSaleAdminDashboard();
  const [filterOpen, setFilterOpen] = useState(false);
  const [granularity, setGranularity] = useState<GranularityMode>("MONTH");
  const [compareMode, setCompareMode] = useState<CompareMode>("QOQ");

  const activeFilterCount = useMemo(
    () => getSaleAdminActiveFilterCount(dashboard),
    [dashboard.branch, dashboard.dateFrom, dashboard.dateTo]
  );

  const cards = dashboard.data?.summary_cards || dashboard.data?.overview || [];
  const periodLabel = getDateRangeLabel(
    dashboard.dateFrom,
    dashboard.dateTo,
    dashboard.data?.period?.label
  );
  const previousLabel = dashboard.data?.period?.previous_label || "Kỳ trước";

  if (!authz.loading && !authz.hasPermission(PermissionCode.SA_DASHBOARD_VIEW)) {
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
            label: "Báo cáo",
          },
        ]}
      >
        <AccessDenied
          title="Không có quyền xem Dashboard"
          description="Bạn không có quyền truy cập Dashboard Sale Admin. Vui lòng liên hệ Quản trị viên nếu cần thiết."
        />
      </DashboardLayout>
    );
  }

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
          label: "Báo cáo",
        },
      ]}
      rightAction={
        <div className="relative flex flex-wrap items-center gap-2">
          <CccPeriodControls
            granularity={granularity}
            onGranularityChange={setGranularity}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />

          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            className={`relative flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition ${filterOpen || activeFilterCount > 0
                ? "border-[#0097cf] bg-sky-50 text-[#007ead]"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#0097cf] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <AdminDashboardFilters
              dashboard={dashboard}
              onClose={() => setFilterOpen(false)}
            />
          )}

          <button
            type="button"
            onClick={dashboard.refresh}
            disabled={dashboard.backgroundRefreshing}
            className="flex h-8 items-center gap-1 rounded-md bg-[#0097cf] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd] disabled:opacity-50"
          >
            <RefreshCw size={15} className={dashboard.backgroundRefreshing ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 shadow-sm">
          <div className="p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div className="max-w-3xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0097cf]">
                  CRM Mini · Sale Admin Report
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  Báo cáo Sale Admin
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Hiệu suất SA, xếp hạng chi nhánh, phân tích khách hàng giao dịch và phí phát sinh theo khoảng thời gian.
                </p>
              </div>

              <div className="flex flex-col gap-3 xl:items-end">

                <p className="text-xs text-slate-500">
                  Cập nhật: {formatDateTime(dashboard.data?.generated_at)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_390px] xl:items-end">
              <ActiveFilterSummary dashboard={dashboard} activeFilterCount={activeFilterCount} periodLabel={periodLabel} />
              {dashboard.data && <HeroStats dashboard={dashboard} />}
            </div>
          </div>
        </section>

        {dashboard.error && <ErrorBlock message={dashboard.error} />}

        {dashboard.loading && !dashboard.data && <LoadingBlock />}

        {dashboard.data && (
          <>
            <AdminOverviewCards
              items={cards}
              compareMode={compareMode}
              granularity={granularity}
              historyData={dashboard.historyData}
            />

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-12">
              <div className="2xl:col-span-6">
                <TopEmployeesTable
                  rows={dashboard.data.top_employees}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                />
              </div>

              <div className="2xl:col-span-6">
                <TopAccountsTable
                  rows={dashboard.data.top_accounts}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                />
              </div>

              <div className="2xl:col-span-12">
                <BranchRankingTable
                  rows={dashboard.data.branch_ranking}
                  totalRow={dashboard.data.branch_total}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                />
              </div>

              <div className="2xl:col-span-6">
                <FeeByBranchChart
                  rows={dashboard.data.fee_by_branch}
                  historyData={dashboard.historyData}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                  previousLabel={previousLabel}
                  granularity={granularity}
                  compareMode={compareMode}
                />
              </div>

              <div className="2xl:col-span-6">
                <TopEmployeeChart
                  rows={dashboard.data.top_employees.slice(0, 8)}
                  historyData={dashboard.historyData}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                  granularity={granularity}
                  compareMode={compareMode}
                />
              </div>

              <div className="2xl:col-span-4">
                <ProductFeeChart
                  rows={dashboard.data.product_fee}
                  historyData={dashboard.historyData}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                  granularity={granularity}
                  compareMode={compareMode}
                />
              </div>

              <div className="2xl:col-span-4">
                <IcpDistributionChart
                  rows={dashboard.data.icp_distribution}
                  historyData={dashboard.historyData}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                  granularity={granularity}
                  compareMode={compareMode}
                />
              </div>

              <div className="2xl:col-span-4">
                <CustomerGroupDistributionPanel
                  rows={dashboard.data.customer_group_distribution}
                  historyData={dashboard.historyData}
                  month={dashboard.month}
                  year={dashboard.year}
                  periodLabel={periodLabel}
                  granularity={granularity}
                  compareMode={compareMode}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
