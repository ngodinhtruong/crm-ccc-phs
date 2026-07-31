"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BotMessageSquare,
  RefreshCw,
  SlidersHorizontal,
  Ticket,
  Users,
  X,
} from "lucide-react";
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
import { userService } from "@/apis/user.api";
import { chatbotDashboardService } from "@/services/chatbot-dashboard.service";
import { externalErrorService } from "@/services/external-error.service";

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
        <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
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
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
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
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500"
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
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500"
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
          className="h-9 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}

function SystemOverviewGrid({
  dashboard,
  systemMetrics,
}: {
  dashboard: ReturnType<typeof useCccDashboard>;
  systemMetrics: {
    totalUsers: number | null;
    chatbotReceived: number | null;
    chatbotBotDone: number | null;
    chatbotCcc: number | null;
    externalTotalErrors: number | null;
    externalNeedReview: number | null;
    externalClassificationRate: number | null;
    loading: boolean;
  };
}) {
  const overview = dashboard.data?.overview;
  const totalReceived = systemMetrics.chatbotReceived || 0;
  const botDone = systemMetrics.chatbotBotDone || 0;
  const botDoneRate = totalReceived > 0 ? Math.round((botDone / totalReceived) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Ticket CCC Card */}
      <Link
        href="/tickets"
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <Ticket size={13} />
              Tickets CCC
            </span>
            <p className="mt-2.5 text-2xl font-black tracking-tight text-slate-800">
              {formatNumber(overview?.total_tickets || 0)}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
            <ArrowUpRight size={17} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div>
            <span className="text-[11px] text-slate-400">Chờ XL:</span>
            <p className="text-xs font-extrabold text-amber-600">
              {formatNumber(overview?.pending_processing || 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Đã giải quyết:</span>
            <p className="text-xs font-extrabold text-emerald-600">
              {formatNumber(overview?.resolved_tickets || 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Đã liên kết:</span>
            <p className="text-xs font-extrabold text-blue-600">
              {formatNumber(overview?.linked_tickets || 0)}
            </p>
          </div>
        </div>
      </Link>

      {/* 2. System Users Card */}
      <Link
        href="/accounts/users"
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-sky-500 to-blue-600" />
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
              <Users size={13} />
              Người dùng hệ thống
            </span>
            <p className="mt-2.5 text-2xl font-black tracking-tight text-slate-800">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.totalUsers || 0)}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition group-hover:bg-sky-600 group-hover:text-white">
            <ArrowUpRight size={17} />
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Tài khoản CRM active:</span>
            <span className="font-extrabold text-slate-700">
              {systemMetrics.loading ? "..." : `${formatNumber(systemMetrics.totalUsers || 0)} user`}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">Đã gán phân quyền & chi nhánh</p>
        </div>
      </Link>

      {/* 3. Chatbot Card */}
      <Link
        href="/chatbots/dashboard"
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md"
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-purple-500 to-pink-600" />
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700">
              <BotMessageSquare size={13} />
              Trợ lý Chatbot AI
            </span>
            <p className="mt-2.5 text-2xl font-black tracking-tight text-slate-800">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.chatbotReceived || 0)}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 transition group-hover:bg-purple-600 group-hover:text-white">
            <ArrowUpRight size={17} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div>
            <span className="text-[11px] text-slate-400">Bot xử lý:</span>
            <p className="font-extrabold text-purple-700">
              {systemMetrics.loading ? "..." : `${formatNumber(systemMetrics.chatbotBotDone || 0)} (${botDoneRate}%)`}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Chuyển CCC:</span>
            <p className="font-extrabold text-indigo-600">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.chatbotCcc || 0)}
            </p>
          </div>
        </div>
      </Link>

      {/* 4. External Errors Card */}
      <Link
        href="/external-errors/dashboard"
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-amber-500 to-rose-600" />
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              <AlertTriangle size={13} />
              Lỗi hệ thống / Bên ngoài
            </span>
            <p className="mt-2.5 text-2xl font-black tracking-tight text-slate-800">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.externalTotalErrors || 0)}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition group-hover:bg-amber-600 group-hover:text-white">
            <ArrowUpRight size={17} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div>
            <span className="text-[11px] text-slate-400">Cần rà soát:</span>
            <p className="font-extrabold text-rose-600">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.externalNeedReview || 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Đã phân loại:</span>
            <p className="font-extrabold text-emerald-600">
              {systemMetrics.loading ? "..." : `${systemMetrics.externalClassificationRate || 0}%`}
            </p>
          </div>
        </div>
      </Link>
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
        className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
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

  const [systemMetrics, setSystemMetrics] = useState({
    totalUsers: null as number | null,
    chatbotReceived: null as number | null,
    chatbotBotDone: null as number | null,
    chatbotCcc: null as number | null,
    externalTotalErrors: null as number | null,
    externalNeedReview: null as number | null,
    externalClassificationRate: null as number | null,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const [usersRes, chatbotRes, errorRes] = await Promise.allSettled([
          userService.getUsers({ page: "1" }),
          chatbotDashboardService.getOverview(),
          externalErrorService.getDashboardOverview(),
        ]);

        if (!isMounted) return;

        const usersCount = usersRes.status === "fulfilled" ? usersRes.value.count || 0 : 0;

        const chatbotSummary = chatbotRes.status === "fulfilled" ? chatbotRes.value.summary : null;
        const chatbotReceived = chatbotSummary?.total_received?.value ?? 0;
        const chatbotBotDone = chatbotSummary?.bot_done?.value ?? 0;
        const chatbotCcc = chatbotSummary?.ccc?.value ?? 0;

        const errorSummary = errorRes.status === "fulfilled" ? errorRes.value.summary : null;
        const externalTotalErrors = errorSummary?.total_errors ?? 0;
        const externalNeedReview = errorSummary?.need_review_errors ?? 0;
        const externalClassificationRate = errorSummary?.classification_rate ?? 0;

        setSystemMetrics({
          totalUsers: usersCount,
          chatbotReceived,
          chatbotBotDone,
          chatbotCcc,
          externalTotalErrors,
          externalNeedReview,
          externalClassificationRate,
          loading: false,
        });
      } catch {
        if (isMounted) {
          setSystemMetrics((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    void fetchMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

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
                ? "border-[#10b981] bg-emerald-50 text-[#059669]"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc
            {dashboard.activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#10b981] px-1.5 py-0.5 text-[10px] font-bold text-white">
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
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
            title="Bỏ qua cache và tải dữ liệu mới từ backend"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-5">
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
              <span className="inline-flex shrink-0 items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                <RefreshCw size={13} className="animate-spin" />
                Đang cập nhật dữ liệu...
              </span>
            )}
          </div>
        </div>

        {/* 1. Core Unified System Executive Summary Grid (4 Cards) */}
        <SystemOverviewGrid
          dashboard={dashboard}
          systemMetrics={systemMetrics}
        />

        {/* 2. Ticket Status & Account Linking Quick Access */}
        <TicketTabSummary dashboard={dashboard} />

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
          <CccDashboardCharts
            charts={dashboard.data.charts}
            globalViewMode={globalViewMode}
            granularity={granularity}
            compareMode={compareMode}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

