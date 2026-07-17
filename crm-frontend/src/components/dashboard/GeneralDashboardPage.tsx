"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useGeneralDashboard } from "@/hooks/useGeneralDashboard";
import { DashboardSummaryCards } from "./DashboardSummaryCards";
import { PortfolioHealthPanel } from "./PortfolioHealthPanel";
import { DashboardChartsGrid } from "./DashboardChartsGrid";

export function GeneralDashboardPage() {
  const dashboardState = useGeneralDashboard();
  const data = dashboardState.dashboard;
  const branchOptions = data?.filters?.branch_options?.length
    ? data.filters.branch_options
    : [
        {
          id: "all",
          name: "Tất cả Chi nhánh",
        },
      ];

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "BÁO CÁO TỔNG HỢP",
        },
      ]}
      rightAction={
        <button
          type="button"
          onClick={() => void dashboardState.reload()}
          disabled={dashboardState.loading}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={dashboardState.loading ? "animate-spin" : ""}
          />
          Làm mới
        </button>
      }
    >
      <div className="space-y-6">
        {/* Title and Filter Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">
              Dashboard Tổng hợp Hệ thống
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Báo cáo hiệu suất hợp nhất của các phân hệ Khách hàng, CSKH/Tickets, Giao dịch và Sale System.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white px-1 shadow-2xs">
              <button
                type="button"
                onClick={dashboardState.handlePrevMonth}
                disabled={dashboardState.loading}
                className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="flex min-w-[90px] items-center justify-center gap-1.5 px-3 text-xs font-bold text-slate-700">
                <CalendarDays size={14} className="text-[#00713d]" />
                {dashboardState.periodLabel}
              </span>
              <button
                type="button"
                onClick={dashboardState.handleNextMonth}
                disabled={dashboardState.loading}
                className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Branch Selector */}
            <div className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 shadow-2xs">
              <SlidersHorizontal size={14} className="text-slate-400" />
              <select
                value={dashboardState.selectedBranch}
                onChange={(event) => dashboardState.setSelectedBranch(event.target.value)}
                disabled={dashboardState.loading}
                className="cursor-pointer bg-transparent text-xs font-bold text-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {dashboardState.error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {dashboardState.error}
          </div>
        )}

        {/* Loading Indicator Overlay */}
        {dashboardState.loading && !data ? (
          <div className="flex h-[400px] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-xs">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={36} className="animate-spin text-[#00713d]" />
              <p className="text-sm font-semibold text-slate-500">
                Đang tổng hợp dữ liệu từ DB...
              </p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* 1. Summary Cards */}
            <DashboardSummaryCards overview={data.overview} />

            {/* 2. Portfolio Health */}
            <PortfolioHealthPanel data={data.portfolio_health} />

            {/* 3. Charts */}
            <DashboardChartsGrid charts={data.charts} />
          </>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500 shadow-xs">
            Chưa có dữ liệu dashboard.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
