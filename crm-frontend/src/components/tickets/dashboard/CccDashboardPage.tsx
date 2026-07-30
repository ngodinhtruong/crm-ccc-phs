"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { RefreshCw, SlidersHorizontal, Ticket, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TicketListTable } from "@/components/tickets/dashboard/CccDashboardTables";

import {
  DateRangeFilter,
  FilterSelect,
  SearchInput,
  CccPeriodControls,
} from "@/components/common";
import { ChartViewMode, GranularityMode, CompareMode } from "./CccDashboardUtils";
import { useCccDashboard } from "@/hooks/useCccDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { CccDashboardChartSkeleton } from "./CccDashboardChartSkeleton";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "./CccDashboardUtils";

const CccDashboardCharts = dynamic(
  () =>
    import("./CccDashboardCharts").then(
      (module) => module.CccDashboardCharts
    ),
  {
    ssr: false,
    loading: () => <CccDashboardChartSkeleton />,
  }
);

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

function FilterPopover({
  dashboard,
  onClose,
}: {
  dashboard: ReturnType<typeof useCccDashboard>;
  onClose: () => void;
}) {
  const busy = dashboard.loading || dashboard.fetching;

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
          <h2 className="text-sm font-semibold text-slate-800">
            Bộ lọc Dashboard Ticket
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Lọc theo kỳ, trạng thái, danh mục, nguồn, Linked/Unlinked,
            VIP tier và nhóm lỗi.
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

      {dashboard.masterLoading && (
        <div className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-xs text-sky-700">
          Đang tải danh mục bộ lọc...
        </div>
      )}

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
              label="Danh mục"
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
              label="Nguồn"
              value={dashboard.source}
              onChange={dashboard.setSource}
              options={dashboard.sources.map((item) => ({
                label: item.source_name,
                value: String(item.id),
              }))}
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

          <div className="col-span-12 md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              VIP tier
            </label>
            <input
              value={dashboard.vipTier}
              onChange={(event) => dashboard.setVipTier(event.target.value)}
              placeholder="Nhập VIP / tier"
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Hệ thống liên quan
            </label>
            <input
              value={dashboard.relatedSystem}
              onChange={(event) =>
                dashboard.setRelatedSystem(event.target.value)
              }
              placeholder="BASE / FLEX / APP / CRM..."
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
        <button
          type="button"
          onClick={dashboard.setThisMonth}
          disabled={busy}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Tháng này
        </button>

        <button
          type="button"
          onClick={clearFilter}
          disabled={busy}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Xóa lọc
        </button>

        <button
          type="button"
          onClick={applyFilter}
          disabled={busy}
          className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}

function TicketTabSummary({
  dashboard,
}: {
  dashboard: ReturnType<typeof useCccDashboard>;
}) {
  const tabs = dashboard.data?.my_ticket_tabs;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Link
        href="/tickets"
        className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
      >
        <p className="text-xs font-medium text-slate-500">Danh sách Ticket</p>
        <p className="mt-2 text-2xl font-bold text-slate-800">
          {formatNumber(tabs?.all || 0)}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Tất cả ticket theo phạm vi quyền
        </p>
      </Link>

      <Link
        href="/tickets?account_link_status=LINKED"
        className="rounded-md border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
      >
        <p className="text-xs font-medium text-slate-500">Có TK liên kết</p>
        <p className="mt-2 text-2xl font-bold text-emerald-700">
          {formatNumber(tabs?.linked || 0)}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Ticket đã xác định tài khoản lưu ký
        </p>
      </Link>

      <Link
        href="/tickets?account_link_status=UNLINKED"
        className="rounded-md border border-amber-100 bg-white p-4 shadow-sm transition hover:border-amber-200 hover:bg-amber-50"
      >
        <p className="text-xs font-medium text-slate-500">
          Chưa có TK liên kết
        </p>
        <p className="mt-2 text-2xl font-bold text-amber-700">
          {formatNumber(tabs?.unlinked || 0)}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Ticket cần đối chiếu tài khoản
        </p>
      </Link>
    </div>
  );
}

function getMonthCount(
  rangeFrom?: string | null,
  rangeTo?: string | null
) {
  if (!rangeFrom || !rangeTo) return 0;

  const from = new Date(rangeFrom);
  const to = new Date(rangeTo);

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from > to
  ) {
    return 0;
  }

  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    1
  );
}

export function CccDashboardPage() {
  const dashboard = useCccDashboard();
  const [filterOpen, setFilterOpen] = useState(false);
  const [globalViewMode, setGlobalViewMode] = useState<ChartViewMode>("TREND_OVER_TIME");
  const [granularity, setGranularity] = useState<GranularityMode>("MONTH");
  const [compareMode, setCompareMode] = useState<CompareMode>("NONE");
  const [globalMonth, setGlobalMonth] = useState<string>("");

  const report = dashboard.data?.report;
  const reportMonthCount = getMonthCount(report?.range_from, report?.range_to);
  const busy = dashboard.loading || dashboard.fetching;

  const availableMonths = useMemo(() => {
    if (!dashboard.data?.charts?.report_monthly_processing) return [];
    return dashboard.data.charts.report_monthly_processing
      .map((item) => item.month_label || item.period_label || "")
      .filter(Boolean);
  }, [dashboard.data?.charts?.report_monthly_processing]);

  useEffect(() => {
    if (availableMonths.length > 0) {
      if (!globalMonth || !availableMonths.includes(globalMonth)) {
        setGlobalMonth(availableMonths[0]);
      }
    }
  }, [availableMonths, globalMonth]);

  const toggleFilter = useCallback(() => {
    setFilterOpen((current) => {
      const next = !current;
      if (next) {
        void dashboard.ensureMasterData();
      }
      return next;
    });
  }, [dashboard.ensureMasterData]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Dashboard Ticket CCC" },
      ]}
      rightAction={
        <div className="relative flex flex-wrap items-center gap-2">
          <CccPeriodControls
            granularity={granularity}
            onGranularityChange={setGranularity}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />

          <Link
            href="/tickets"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Ticket size={15} />
            Danh sách ticket
          </Link>

          <button
            type="button"
            onClick={toggleFilter}
            className={`relative flex h-8 items-center gap-1 rounded border px-3 text-xs font-semibold ${filterOpen || dashboard.activeFilterCount > 0
                ? "border-[#0097cf] bg-sky-50 text-[#007ead]"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc
            {dashboard.activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#0097cf] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {dashboard.activeFilterCount}
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
            disabled={busy}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
            title="Bỏ qua cache và tải dữ liệu mới từ backend"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-gradient-to-r from-lime-50 via-white to-sky-50 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Dashboard Ticket CCC
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {report && (
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    Báo cáo {reportMonthCount} tháng
                  </span>
                )}

                {report && (
                  <span className="text-xs text-slate-500">
                    {formatDate(report.range_from)} - {formatDate(report.range_to)}
                  </span>
                )}

                <span className="hidden text-slate-300 md:inline">•</span>

                <span className="text-xs text-slate-500">
                  Cập nhật: {formatDateTime(dashboard.data?.generated_at)}
                </span>
              </div>
            </div>

            {dashboard.fetching && dashboard.data && (
              <span className="inline-flex shrink-0 items-center gap-2 rounded-md bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
                <RefreshCw size={13} className="animate-spin" />
                Đang cập nhật dữ liệu...
              </span>
            )}
          </div>
        </div>

        {dashboard.error && <ErrorBlock message={dashboard.error} />}

        {dashboard.loading && !dashboard.data && <LoadingBlock />}

        {dashboard.data && (
          <TicketListTable
            title="Ticket chưa xử lý"
            description="Danh sách các ticket đang chờ xử lý theo bộ lọc hiện tại."
            filters={dashboard.appliedParams}
            refreshKey={dashboard.data.generated_at}
          />
        )}

        {dashboard.data && (
          <>
            <CccDashboardCharts
              charts={dashboard.data.charts}
              globalViewMode={globalViewMode}
              granularity={granularity}
              compareMode={compareMode}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

