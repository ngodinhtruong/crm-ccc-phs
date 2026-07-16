"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  RefreshCw,
  SlidersHorizontal,
  Target,
} from "lucide-react";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useSaleAdminDashboard } from "@/hooks/useSaleAdminDashboard";
import {
  AdminDashboardFilters,
  getSaleAdminActiveFilterCount,
} from "@/components/sale-admin/dashboard/AdminDashboardFilters";
import { AdminOverviewCards } from "@/components/sale-admin/dashboard/AdminOverviewCards";
import { BranchRankingTable } from "@/components/sale-admin/dashboard/BranchRankingTable";
import { FeeByBranchChart } from "@/components/sale-admin/dashboard/FeeByBranchChart";
import { IcpDistributionChart } from "@/components/sale-admin/dashboard/IcpDistributionChart";
import { ProductFeeChart } from "@/components/sale-admin/dashboard/ProductFeeChart";
import { TopAccountsTable } from "@/components/sale-admin/dashboard/TopAccountsTable";
import { TopEmployeeChart } from "@/components/sale-admin/dashboard/TopEmployeeChart";
import { TopEmployeesTable } from "@/components/sale-admin/dashboard/TopEmployeesTable";
import { formatDateTime, formatNumber } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";

function LoadingBlock() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
      Đang tải Dashboard Sale Admin...
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      {message}
    </div>
  );
}

function ActiveFilterSummary({
  dashboard,
  activeFilterCount,
}: {
  dashboard: ReturnType<typeof useSaleAdminDashboard>;
  activeFilterCount: number;
}) {
  const selectedBranch = dashboard.data?.filters.branch_options.find(
    (branch) => String(branch.id) === dashboard.branch
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
        Kỳ: {dashboard.month}/{dashboard.year}
      </span>

      <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
        Bộ lọc đang dùng: {activeFilterCount}
      </span>

      <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
        Chi nhánh: {selectedBranch?.branch_name || "Tất cả"}
      </span>
    </div>
  );
}

function QuickSummary({ dashboard }: { dashboard: ReturnType<typeof useSaleAdminDashboard> }) {
  const branchCount = dashboard.data?.branch_ranking.length || 0;
  const employeeCount = dashboard.data?.top_employees.length || 0;
  const accountCount = dashboard.data?.top_accounts.length || 0;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Link
        href="/sale-admin/records"
        className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
      >
        <p className="text-xs font-medium text-slate-500">SA Records</p>
        <p className="mt-2 text-2xl font-bold text-slate-800">
          {formatNumber(dashboard.data?.overview.find((item) => item.key === "total_calls")?.value || 0)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <ClipboardList size={13} /> Xem danh sách cuộc gọi trong kỳ
        </p>
      </Link>

      <Link
        href="/sale-admin/kpi"
        className="rounded-md border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
      >
        <p className="text-xs font-medium text-slate-500">Nhân viên có đóng góp</p>
        <p className="mt-2 text-2xl font-bold text-emerald-700">
          {formatNumber(employeeCount)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <Target size={13} /> Theo dõi KPI Sale Admin
        </p>
      </Link>

      <div className="rounded-md border border-amber-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">Phạm vi dữ liệu</p>
        <p className="mt-2 text-2xl font-bold text-amber-700">
          {formatNumber(branchCount)} CN · {formatNumber(accountCount)} TK
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Chi nhánh và tài khoản có dữ liệu trong kỳ
        </p>
      </div>
    </div>
  );
}

export function SaleAdminDashboardPage() {
  const dashboard = useSaleAdminDashboard();
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = useMemo(
    () => getSaleAdminActiveFilterCount(dashboard),
    [dashboard.branch, dashboard.month, dashboard.year]
  );

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
      rightAction={
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            className={`relative flex h-8 items-center gap-1 rounded border px-3 text-xs font-semibold ${
              filterOpen || activeFilterCount > 0
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
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
          >
            <RefreshCw size={15} className={dashboard.backgroundRefreshing ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0097cf]">
                CRM Mini · Sale Admin Dashboard
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">
                Tổng quan vận hành Sale Admin
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Theo dõi cuộc gọi, tài khoản tái kích hoạt, phí giao dịch, top chi nhánh, top nhân viên, top tài khoản và phân bổ ICP theo kỳ.
              </p>
            </div>

            <div className="text-xs text-slate-500">
              Cập nhật: {formatDateTime(dashboard.data?.generated_at)}
            </div>
          </div>

          <div className="mt-4">
            <ActiveFilterSummary dashboard={dashboard} activeFilterCount={activeFilterCount} />
          </div>
        </div>

        {dashboard.error && <ErrorBlock message={dashboard.error} />}

        {dashboard.loading && !dashboard.data && <LoadingBlock />}

        {dashboard.data && (
          <>
            <AdminOverviewCards items={dashboard.data.overview} />
            <QuickSummary dashboard={dashboard} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <FeeByBranchChart rows={dashboard.data.fee_by_branch} />
              <TopEmployeeChart rows={dashboard.data.top_employees.slice(0, 7)} />
              <ProductFeeChart rows={dashboard.data.product_fee} />
              <IcpDistributionChart rows={dashboard.data.icp_distribution} />
            </div>

            <BranchRankingTable rows={dashboard.data.branch_ranking} />
            <TopEmployeesTable rows={dashboard.data.top_employees} />
            <TopAccountsTable rows={dashboard.data.top_accounts} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
