"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCw, SlidersHorizontal, Ticket, X } from "lucide-react";

import {
  DateRangeFilter,
  FilterSelect,
  FilterTextInput,
  SearchInput,
} from "@/components/common";
import { useCccDashboard } from "@/hooks/useCccDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { CccDashboardCards } from "./CccDashboardCards";
import { CccDashboardCharts } from "./CccDashboardCharts";
import { CccDashboardTables } from "./CccDashboardTables";
import { formatDateTime, formatNumber } from "./CccDashboardUtils";

function LoadingBlock() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
      Đang tải Dashboard CCC...
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

function getActiveFilterCount(dashboard: ReturnType<typeof useCccDashboard>) {
  return [
    dashboard.dateFrom,
    dashboard.dateTo,
    dashboard.status,
    dashboard.category,
    dashboard.source,
    dashboard.accountLinkStatus,
    dashboard.vipTier,
    dashboard.q,
    dashboard.errorGroup,
    dashboard.errorType,
    dashboard.relatedSystem,
  ].filter(Boolean).length;
}

function FilterPopover({
  dashboard,
  onClose,
}: {
  dashboard: ReturnType<typeof useCccDashboard>;
  onClose: () => void;
}) {
  const applyFilter = () => {
    dashboard.search();
    onClose();
  };

  const clearFilter = () => {
    dashboard.clearFilter();
    onClose();
  };

  return (
    <div className="absolute right-0 top-10 z-[70] w-[min(92vw,960px)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Bộ lọc Dashboard CCC</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Lọc dữ liệu theo kỳ, trạng thái, danh mục, kênh tiếp nhận, VIP tier, Linked/Unlinked và lỗi phát sinh.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Đóng bộ lọc"
        >
          <X size={15} />
        </button>
      </div>

      {dashboard.masterError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
          {dashboard.masterError}
        </div>
      )}

      <div className="max-h-[calc(100vh-160px)] overflow-y-auto bg-[#f8fafc] px-4 py-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Kỳ tháng
            </label>
            <input
              type="month"
              value={dashboard.period}
              onChange={(event) => dashboard.setPeriod(event.target.value)}
              disabled={Boolean(dashboard.dateFrom || dashboard.dateTo)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-5">
            <DateRangeFilter
              fromLabel="Từ ngày"
              toLabel="Đến ngày"
              fromValue={dashboard.dateFrom}
              toValue={dashboard.dateTo}
              onFromChange={dashboard.setDateFrom}
              onToChange={dashboard.setDateTo}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Tìm kiếm
            </label>
            <SearchInput
              value={dashboard.q}
              onChange={dashboard.setQ}
              placeholder="Mã ticket / số tài khoản / khách hàng"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Trạng thái"
              value={dashboard.status}
              onChange={dashboard.setStatus}
              options={dashboard.statuses.map((item) => ({
                label: item.status_name,
                value: item.status_code || String(item.id),
              }))}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Linked / Unlinked"
              value={dashboard.accountLinkStatus}
              onChange={dashboard.setAccountLinkStatus}
              options={[
                { label: "Có TK liên kết", value: "LINKED" },
                { label: "Chưa có TK liên kết", value: "UNLINKED" },
              ]}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Danh mục nghiệp vụ"
              value={dashboard.category}
              onChange={dashboard.setCategory}
              options={dashboard.supportCategories.map((item) => ({
                label: item.category_name,
                value: String(item.id),
              }))}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Kênh tiếp nhận"
              value={dashboard.source}
              onChange={dashboard.setSource}
              options={dashboard.sources.map((item) => ({
                label: item.source_name,
                value: String(item.id),
              }))}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterTextInput
              label="VIP tier"
              value={dashboard.vipTier}
              onChange={dashboard.setVipTier}
              placeholder="VD: VIP / 1"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterTextInput
              label="Hệ thống liên quan"
              value={dashboard.relatedSystem}
              onChange={dashboard.setRelatedSystem}
              placeholder="Base/Flex/API"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Nhóm lỗi"
              value={dashboard.errorGroup}
              onChange={dashboard.setErrorGroup}
              options={dashboard.errorGroups.map((item) => ({
                label: item.group_name,
                value: String(item.id),
              }))}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <FilterSelect
              label="Loại lỗi"
              value={dashboard.errorType}
              onChange={dashboard.setErrorType}
              options={dashboard.filteredErrorTypes.map((item) => ({
                label: item.type_name,
                value: String(item.id),
              }))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t bg-white px-4 py-3">
        <button
          type="button"
          onClick={clearFilter}
          disabled={dashboard.loading}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Xóa lọc
        </button>

        <button
          type="button"
          onClick={applyFilter}
          disabled={dashboard.loading}
          className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}

function TicketTabSummary({ dashboard }: { dashboard: ReturnType<typeof useCccDashboard> }) {
  const tabs = dashboard.data?.my_ticket_tabs;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Link
        href="/tickets"
        className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
      >
        <p className="text-xs font-medium text-slate-500">Danh sách Ticket của tôi</p>
        <p className="mt-2 text-2xl font-bold text-slate-800">
          {formatNumber(tabs?.all || 0)}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Tất cả ticket theo phạm vi quyền</p>
      </Link>

      <Link
        href="/tickets"
        className="rounded-md border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
      >
        <p className="text-xs font-medium text-slate-500">Có TK liên kết</p>
        <p className="mt-2 text-2xl font-bold text-emerald-700">
          {formatNumber(tabs?.linked || 0)}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Ticket đã xác định tài khoản lưu ký</p>
      </Link>

      <Link
        href="/tickets"
        className="rounded-md border border-amber-100 bg-white p-4 shadow-sm transition hover:border-amber-200 hover:bg-amber-50"
      >
        <p className="text-xs font-medium text-slate-500">Chưa có TK liên kết</p>
        <p className="mt-2 text-2xl font-bold text-amber-700">
          {formatNumber(tabs?.unlinked || 0)}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Ticket chưa xác định được khách hàng</p>
      </Link>
    </div>
  );
}

function ActiveFilterSummary({
  dashboard,
  activeFilterCount,
}: {
  dashboard: ReturnType<typeof useCccDashboard>;
  activeFilterCount: number;
}) {
  const periodLabel = dashboard.dateFrom || dashboard.dateTo
    ? `${dashboard.dateFrom || "..."} → ${dashboard.dateTo || "..."}`
    : dashboard.period;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">


      {dashboard.accountLinkStatus && (
        <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700 ring-1 ring-sky-100">
          {dashboard.accountLinkStatus === "LINKED" ? "Có TK liên kết" : "Chưa có TK liên kết"}
        </span>
      )}
    </div>
  );
}

export function CccDashboardPage() {
  const dashboard = useCccDashboard();
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => getActiveFilterCount(dashboard), [
    dashboard.accountLinkStatus,
    dashboard.category,
    dashboard.dateFrom,
    dashboard.dateTo,
    dashboard.errorGroup,
    dashboard.errorType,
    dashboard.q,
    dashboard.relatedSystem,
    dashboard.source,
    dashboard.status,
    dashboard.vipTier,
  ]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/tickets/dashboard" },
        { label: "Dashboard CCC" },
      ]}
      rightAction={
        <div className="relative flex items-center gap-2">
          <Link
            href="/tickets"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Ticket size={15} />
            Danh sách ticket
          </Link>

          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            className={`relative flex h-8 items-center gap-1 rounded border px-3 text-xs font-semibold ${filterOpen || activeFilterCount > 0
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
            <FilterPopover
              dashboard={dashboard}
              onClose={() => setFilterOpen(false)}
            />
          )}

          <button
            type="button"
            onClick={dashboard.reload}
            disabled={dashboard.loading}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
          >
            <RefreshCw size={15} className={dashboard.loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <h1 className="mt-1 text-xl font-bold text-slate-900">
                CRM Mini · CCC Dashboard
              </h1>
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
            <CccDashboardCards overview={dashboard.data.overview} />
            <TicketTabSummary dashboard={dashboard} />
            <CccDashboardCharts charts={dashboard.data.charts} />
            <CccDashboardTables
              recurringIssues={dashboard.data.tables.recurring_issues}
              auditTrail={dashboard.data.tables.audit_trail}
              recentTickets={dashboard.data.tables.recent_tickets}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
