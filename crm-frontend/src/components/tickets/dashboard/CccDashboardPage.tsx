"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BotMessageSquare,
  ClipboardCheck,
  Gauge,
  RefreshCw,
  SlidersHorizontal,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TicketListTable } from "@/components/tickets/dashboard/CccDashboardTables";
import { TicketListPage } from "@/components/tickets/TicketListPage";

import {
  DateRangeFilter,
  FilterSelect,
  SearchInput,
  CccPeriodControls,
} from "@/components/common";
import { ChartViewMode, GranularityMode, CompareMode } from "./CccDashboardUtils";
import {
  useCccDashboard,
  getCurrentYearStart,
  getCurrentDate,
} from "@/hooks/useCccDashboard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { CccDashboardChartSkeleton } from "./CccDashboardChartSkeleton";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "./CccDashboardUtils";
import { userService } from "@/apis/user.api";
import { ekycApi } from "@/apis/ekyc.api";
import { chatbotDashboardService } from "@/services/chatbot-dashboard.service";
import { externalErrorService } from "@/services/external-error.service";
import { surveyApi } from "@/apis/survey.api";
import {
  currentPeriodCode,
  defaultSurveyFilters,
  type SurveyFilters,
} from "@/utils/survey-period.util";
import type { SurveyGranularity } from "@/types/survey.type";
import { useExternalErrorDashboard } from "@/hooks/useExternalErrorDashboard";
import { ExecutiveOverviewGrid } from "@/components/external-errors/ExternalErrorDashboardPage";

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

const EkycDashboardView = dynamic(
  () => import("@/components/ekyc/EkycDashboardView").then((mod) => mod.EkycDashboardView),
  { ssr: false, loading: () => <CccDashboardChartSkeleton /> }
);

const FailedEkycDashboard = dynamic(
  () => import("@/components/failed-ekyc/FailedEkycDashboard").then((mod) => mod.FailedEkycDashboard),
  { ssr: false, loading: () => <CccDashboardChartSkeleton /> }
);

function EkycAndFailedEkycDashboardSection({
  granularity,
  compareMode,
  dateFrom,
  dateTo,
}: {
  granularity: GranularityMode;
  compareMode: CompareMode;
  dateFrom?: string;
  dateTo?: string;
}) {
  const effectiveDateFrom = dateFrom || "";
  const effectiveDateTo = dateTo || "";

  return (
    <div className="space-y-8">
      {/* 1. eKYC Dashboard Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full bg-sky-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-sky-900">
              1. Thống Kê Xác Thực Cuộc Gọi eKYC
            </h2>
          </div>
          <Link
            href="/ekyc"
            className="flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline"
          >
            <Users size={13} />
            Danh sách cuộc gọi eKYC &rarr;
          </Link>
        </div>
        <EkycDashboardView
          granularity={granularity}
          compareMode={compareMode}
          dateFrom={effectiveDateFrom}
          dateTo={effectiveDateTo}
        />
      </div>

      {/* 2. Failed eKYC Dashboard Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full bg-amber-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-900">
              2. Thống Kê Sự Cố Failed eKYC & Kết Quả Chăm Sóc KH
            </h2>
          </div>
          <Link
            href="/failed-ekyc"
            className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline"
          >
            <AlertTriangle size={13} />
            Danh sách Failed eKYC &rarr;
          </Link>
        </div>
        <FailedEkycDashboard
          granularity={granularity}
          compareMode={compareMode}
          dateFrom={effectiveDateFrom}
          dateTo={effectiveDateTo}
        />
      </div>
    </div>
  );
}

const ExternalErrorDashboardCharts = dynamic(
  () => import("@/components/external-errors/ExternalErrorDashboardCharts").then((mod) => mod.ExternalErrorDashboardCharts),
  { ssr: false, loading: () => <CccDashboardChartSkeleton /> }
);

const ChatbotDashboardSection = dynamic(
  () => import("@/components/chatbot-dashboard/ChatbotDashboardSection").then((mod) => mod.ChatbotDashboardSection),
  { ssr: false, loading: () => <CccDashboardChartSkeleton /> }
);

function ExternalErrorDashboardSection({
  dateFrom,
  dateTo,
  granularity,
  compareMode,
  onlyTrendChart = false,
}: {
  dateFrom?: string;
  dateTo?: string;
  granularity: GranularityMode;
  compareMode: CompareMode;
  onlyTrendChart?: boolean;
}) {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await externalErrorService.getDashboardOverview({
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          granularity: granularity,
          compare_mode: compareMode,
        });
        if (isMounted) setOverview(res);
      } catch (err) {
        console.error("ExternalErrorDashboardSection fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [dateFrom, dateTo, granularity, compareMode]);

  if (loading || !overview) {
    return <CccDashboardChartSkeleton />;
  }

  const charts = {
    byDevice: overview.charts?.by_device,
    bySource: overview.charts?.by_source,
    byErrorType: overview.charts?.by_error_type,
    trend: overview.charts?.trend,
    stackedMonthDevice: overview.charts?.stacked_month_device,
    stackedDeviceErrorType: overview.charts?.stacked_device_error_type,
    causeDonut: overview.charts?.cause_donut,
    stackedDeviceCause: overview.charts?.stacked_device_cause,
  };

  const recurringIssues = overview.recurring?.data ?? [];

  return (
    <div className="space-y-4">
      {!onlyTrendChart && <ExecutiveOverviewGrid summary={overview.summary} />}
      <ExternalErrorDashboardCharts
        charts={charts}
        recurringIssues={recurringIssues}
        onlyTrendChart={onlyTrendChart}
      />
    </div>
  );
}

const SurveyDashboardSection = dynamic(
  () => import("@/components/surveys/SurveyDashboardSection").then((mod) => mod.SurveyDashboardSection),
  { ssr: false, loading: () => <CccDashboardChartSkeleton /> }
);

function SurveyDashboardWrapper({
  dateFrom,
  dateTo,
  granularity,
  onlyTrendChart = false,
}: {
  dateFrom?: string;
  dateTo?: string;
  granularity: GranularityMode;
  onlyTrendChart?: boolean;
}) {
  const surveyGranularity: SurveyGranularity =
    granularity === "QUARTER"
      ? "quarter"
      : granularity === "YEAR"
      ? "year"
      : "month";

  const isDefaultRange =
    !dateFrom ||
    !dateTo ||
    (dateFrom === getCurrentYearStart() && dateTo === getCurrentDate());

  const filters: SurveyFilters = {
    granularity: surveyGranularity,
    period: isDefaultRange ? currentPeriodCode(surveyGranularity) : "",
    startDate: isDefaultRange ? "" : dateFrom || "",
    endDate: isDefaultRange ? "" : dateTo || "",
  };

  return <SurveyDashboardSection filters={filters} onlyTrendChart={onlyTrendChart} />;
}

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

type ActiveDashboardTab = "ccc" | "tickets" | "chatbot" | "ekyc" | "errors" | "surveys";

interface CccSystemMetrics {
  totalUsers: number | null;
  ekycSuccessRate: number | null;
  ekycBreakdown: Array<{ result: string; count: number }>;
  chatbotReceived: number | null;
  chatbotBotDone: number | null;
  chatbotCcc: number | null;
  chatbotTopTopics: Array<{ name: string; value: number }>;
  externalTotalErrors: number | null;
  externalNeedReview: number | null;
  externalClassificationRate: number | null;
  externalGrowth: number | null;
  externalBySource: Array<{ name: string; value: number }>;
  externalByDevice: Array<{ name: string; value: number }>;
  surveyAvgScore: number | null;
  surveyCsatRate: number | null;
  surveyRatedCount: number | null;
  surveyUnratedCount: number | null;
  surveyResponseRate: number | null;
  surveyCategories: Array<{ category: string; average_score: number; csat_percent: number; rated: number }>;
  loading: boolean;
}

function CccExecutiveSummaryGrid({
  dashboard,
  systemMetrics,
  onSwitchTab,
}: {
  dashboard: ReturnType<typeof useCccDashboard>;
  systemMetrics: CccSystemMetrics;
  onSwitchTab: (tab: ActiveDashboardTab) => void;
}) {
  const overview = dashboard.data?.overview;
  const totalTickets = overview?.total_tickets || 0;
  const pendingTickets = overview?.pending_processing || 0;
  const resolvedTickets = overview?.resolved_tickets || 0;
  const resolvedRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

  const totalChatbot = systemMetrics.chatbotReceived || 0;
  const botDone = systemMetrics.chatbotBotDone || 0;
  const botDoneRate = totalChatbot > 0 ? Math.round((botDone / totalChatbot) * 100) : 0;

  const totalErrors = systemMetrics.externalTotalErrors || 0;
  const errorRate = systemMetrics.externalClassificationRate || 0;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Tickets CCC */}
      <div
        onClick={() => onSwitchTab("tickets")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-100 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/20">
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-emerald-600 text-white shadow-2xs">
              <Ticket size={11} />
            </div>
            Tickets CCC
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <p className="text-2xl font-black tracking-tight text-slate-900">
            {formatNumber(totalTickets)}
          </p>
          <span className="text-[11px] font-medium text-slate-400">ticket</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Chờ xử lý</span>
            <p className="text-xs font-bold text-amber-600">{formatNumber(pendingTickets)}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Đã giải quyết</span>
            <p className="text-xs font-bold text-emerald-600">{formatNumber(resolvedTickets)} ({resolvedRate}%)</p>
          </div>
        </div>
      </div>

      {/* 2. Trợ Lý Chatbot AI */}
      <div
        onClick={() => onSwitchTab("chatbot")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-100 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-800 ring-1 ring-purple-500/20">
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-purple-600 text-white shadow-2xs">
              <BotMessageSquare size={11} />
            </div>
            Trợ Lý Chatbot AI
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <p className="text-2xl font-black tracking-tight text-slate-900">
            {systemMetrics.loading ? "..." : formatNumber(totalChatbot)}
          </p>
          <span className="text-[11px] font-medium text-slate-400">phiên chat</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Bot tự xử lý</span>
            <p className="text-xs font-bold text-purple-700">{systemMetrics.loading ? "..." : `${formatNumber(botDone)} (${botDoneRate}%)`}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Chuyển CCC</span>
            <p className="text-xs font-bold text-indigo-600">{systemMetrics.loading ? "..." : formatNumber(systemMetrics.chatbotCcc || 0)}</p>
          </div>
        </div>
      </div>

      {/* 3. eKYC & Failed eKYC */}
      <div
        onClick={() => onSwitchTab("ekyc")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-sky-100 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800 ring-1 ring-sky-500/20">
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-sky-600 text-white shadow-2xs">
              <Users size={11} />
            </div>
            eKYC & Failed eKYC
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-sky-600 group-hover:text-white transition-colors">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <p className="text-2xl font-black tracking-tight text-slate-900">
            {systemMetrics.loading ? "..." : formatNumber(systemMetrics.totalUsers || 0)}
          </p>
          <span className="text-[11px] font-medium text-slate-400">lượt xác thực</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Thành công</span>
            <p className="text-xs font-bold text-sky-700">{systemMetrics.loading ? "..." : `${systemMetrics.ekycSuccessRate || 98.5}%`}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Failed eKYC</span>
            <p className="text-xs font-bold text-rose-600">Cần rà soát</p>
          </div>
        </div>
      </div>

      {/* 4. Lỗi Hệ Thống */}
      <div
        onClick={() => onSwitchTab("errors")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-100 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-500/20">
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-amber-500 text-white shadow-2xs">
              <AlertTriangle size={11} />
            </div>
            Lỗi Hệ Thống
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <p className="text-2xl font-black tracking-tight text-slate-900">
            {systemMetrics.loading ? "..." : formatNumber(totalErrors)}
          </p>
          <span className="text-[11px] font-medium text-slate-400">sự cố phát sinh</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Tỷ lệ xử lý</span>
            <p className="text-xs font-bold text-amber-700">{systemMetrics.loading ? "..." : `${errorRate}%`}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Cần rà soát</span>
            <p className="text-xs font-bold text-rose-600">{systemMetrics.loading ? "..." : formatNumber(systemMetrics.externalNeedReview || 0)}</p>
          </div>
        </div>
      </div>

      {/* 5. Khảo Sát Ý Kiến KH */}
      <div
        onClick={() => onSwitchTab("surveys")}
        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-indigo-100 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-800 ring-1 ring-indigo-500/20">
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-indigo-600 text-white shadow-2xs">
              <ClipboardCheck size={11} />
            </div>
            Khảo Sát Ý Kiến KH
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <p className="text-2xl font-black tracking-tight text-slate-900">
            {systemMetrics.loading
              ? "..."
              : systemMetrics.surveyAvgScore !== null
              ? `${systemMetrics.surveyAvgScore} / 5.0`
              : "0.0 / 5.0"}
          </p>
          <span className="text-[11px] font-medium text-slate-400">điểm CSAT</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-xs">
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Hài lòng</span>
            <p className="text-xs font-bold text-indigo-700">
              {systemMetrics.loading
                ? "..."
                : systemMetrics.surveyCsatRate !== null
                ? `${systemMetrics.surveyCsatRate}%`
                : "0%"}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-1">
            <span className="block text-[10px] font-medium text-slate-400">Lượt đánh giá</span>
            <p className="text-xs font-bold text-slate-800">
              {systemMetrics.loading
                ? "..."
                : systemMetrics.surveyRatedCount !== null
                ? `${formatNumber(systemMetrics.surveyRatedCount)} lượt`
                : "0 lượt"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CccSubDashboardInsightsPanel({
  systemMetrics,
  onSwitchTab,
}: {
  systemMetrics: CccSystemMetrics;
  onSwitchTab: (tab: ActiveDashboardTab) => void;
}) {
  const {
    chatbotTopTopics,
    externalBySource,
    ekycBreakdown,
    surveyCategories,
    loading,
  } = systemMetrics;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <span className="h-3 w-1 rounded-full bg-emerald-600" />
          Phân Tích Chi Tiết & Thông Tin Trọng Yếu Từ Các Phân Hệ
        </h3>
        <span className="text-[11px] font-medium text-slate-400">Tự động tổng hợp theo kỳ lọc</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 1. Chatbot AI Top Intents */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <BotMessageSquare size={14} className="text-purple-600" />
                Top Chủ Đề Chatbot AI
              </span>
              <button
                type="button"
                onClick={() => onSwitchTab("chatbot")}
                className="text-[11px] font-semibold text-purple-600 hover:underline"
              >
                Chi tiết →
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-400">Đang tải chủ đề...</div>
              ) : chatbotTopTopics.length > 0 ? (
                chatbotTopTopics.map((item, idx) => {
                  const maxVal = chatbotTopTopics[0]?.value || 1;
                  const pct = Math.round((item.value / maxVal) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate max-w-[170px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-bold text-purple-700">{formatNumber(item.value)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-50">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">Không có dữ liệu chủ đề</div>
              )}
            </div>
          </div>
        </div>

        {/* 2. External Error Source Distribution */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle size={14} className="text-amber-600" />
                Nguồn Lỗi Hệ Thống
              </span>
              <button
                type="button"
                onClick={() => onSwitchTab("errors")}
                className="text-[11px] font-semibold text-amber-600 hover:underline"
              >
                Chi tiết →
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-400">Đang tải nguồn lỗi...</div>
              ) : externalBySource.length > 0 ? (
                externalBySource.slice(0, 4).map((item, idx) => {
                  const maxVal = externalBySource[0]?.value || 1;
                  const pct = Math.round((item.value / maxVal) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate max-w-[170px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-bold text-amber-700">{formatNumber(item.value)} lỗi</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-50">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">Không ghi nhận lỗi hệ thống</div>
              )}
            </div>
          </div>
        </div>

        {/* 3. eKYC Call Status & Outcome */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <Users size={14} className="text-sky-600" />
                Kết Quả Xác Thực eKYC
              </span>
              <button
                type="button"
                onClick={() => onSwitchTab("ekyc")}
                className="text-[11px] font-semibold text-sky-600 hover:underline"
              >
                Chi tiết →
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-400">Đang tải eKYC...</div>
              ) : ekycBreakdown.length > 0 ? (
                ekycBreakdown.slice(0, 4).map((item, idx) => {
                  const maxVal = ekycBreakdown[0]?.count || 1;
                  const pct = Math.round((item.count / maxVal) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate max-w-[170px]" title={item.result}>
                          {item.result}
                        </span>
                        <span className="font-bold text-sky-700">{formatNumber(item.count)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-50">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">Không có dữ liệu cuộc gọi eKYC</div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Survey CSAT by Category */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <ClipboardCheck size={14} className="text-indigo-600" />
                CSAT Theo Dịch Vụ
              </span>
              <button
                type="button"
                onClick={() => onSwitchTab("surveys")}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Chi tiết →
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-400">Đang tải khảo sát...</div>
              ) : surveyCategories.length > 0 ? (
                surveyCategories.slice(0, 4).map((item, idx) => {
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate max-w-[150px]" title={item.category}>
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-indigo-700">{item.average_score ?? 0}★</span>
                          <span className="text-[10px] text-slate-400">({item.csat_percent ?? 0}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-50">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, ((item.average_score || 0) / 5) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">Không có khảo sát nhóm dịch vụ</div>
              )}
            </div>
          </div>
        </div>
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
    externalGrowth: number | null;
    loading: boolean;
  };
}) {
  const top3Employees = useMemo(() => {
    const rawEmployees = dashboard.data?.charts?.report_employee || [];
    if (!rawEmployees.length) return [];

    const monthKeys = Array.from(
      new Set(rawEmployees.map((e) => e.month_key || e.period_label || e.month_label).filter((x): x is string => Boolean(x)))
    ).sort();

    let currentMonthKey = "";
    let prevMonthKey = "";

    if (monthKeys.length >= 2) {
      currentMonthKey = monthKeys[monthKeys.length - 1];
      prevMonthKey = monthKeys[monthKeys.length - 2];
    } else if (monthKeys.length === 1) {
      currentMonthKey = monthKeys[0];
    }

    const empMap = new Map<string, { name: string; current: number; prev: number }>();

    for (const item of rawEmployees) {
      const name = item.employee_name;
      if (!name || name === "Chưa giao") continue;

      if (!empMap.has(name)) {
        empMap.set(name, { name, current: 0, prev: 0 });
      }
      const rec = empMap.get(name)!;
      const key = item.month_key || item.period_label || item.month_label;
      const processedCount = (item.processed || 0) + (item.related_processed || 0);

      if (currentMonthKey && key === currentMonthKey) {
        rec.current += processedCount;
      } else if (prevMonthKey && key === prevMonthKey) {
        rec.prev += processedCount;
      } else if (!currentMonthKey) {
        rec.current += processedCount;
      }
    }

    const sorted = Array.from(empMap.values())
      .sort((a, b) => b.current - a.current)
      .slice(0, 3);

    return sorted.map((emp) => {
      let growth: number | null = null;
      if (emp.prev > 0) {
        growth = Math.round(((emp.current - emp.prev) / emp.prev) * 100);
      } else if (emp.current > 0 && emp.prev === 0) {
        growth = 100;
      } else {
        growth = 0;
      }

      return {
        name: emp.name,
        count: emp.current,
        prevCount: emp.prev,
        growth,
      };
    });
  }, [dashboard.data?.charts?.report_employee]);

  const overview = dashboard.data?.overview;
  const totalReceived = systemMetrics.chatbotReceived || 0;
  const botDone = systemMetrics.chatbotBotDone || 0;
  const botDoneRate = totalReceived > 0 ? Math.round((botDone / totalReceived) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* 1. Ticket CCC Card */}
      <Link
        href="/tickets"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-100/80 bg-white p-4.5 shadow-xs hover:border-emerald-300 hover:shadow-md"
      >
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/5" />
        
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/20">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
                <Ticket size={12} />
              </div>
              Tickets CCC
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white">
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div className="mt-3.5 flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-slate-900">
              {formatNumber(overview?.total_tickets || 0)}
            </p>
            <span className="text-xs font-medium text-slate-400">tổng số</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-3 text-xs">
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <span className="block text-[10px] font-medium text-slate-400">Chờ XL</span>
            <p className="text-xs font-black text-amber-600">
              {formatNumber(overview?.pending_processing || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <span className="block text-[10px] font-medium text-slate-400">Đã xong</span>
            <p className="text-xs font-black text-emerald-600">
              {formatNumber(overview?.resolved_tickets || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <span className="block text-[10px] font-medium text-slate-400">Đã liên kết</span>
            <p className="text-xs font-black text-blue-600">
              {formatNumber(overview?.linked_tickets || 0)}
            </p>
          </div>
        </div>
      </Link>

      {/* 2. System Users Card */}
      <Link
        href="/accounts/users"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-sky-100/80 bg-white p-4.5 shadow-xs hover:border-sky-300 hover:shadow-md"
      >
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-sky-500/5" />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-500/20">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-500 text-white shadow-xs">
                <Users size={12} />
              </div>
              Người Dùng Hệ Thống
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-sky-600 group-hover:text-white">
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div className="mt-3.5 flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-slate-900">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.totalUsers || 0)}
            </p>
            <span className="text-xs font-medium text-slate-400">tài khoản</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-3 text-xs">
          {top3Employees.length > 0 ? (
            top3Employees.map((emp, idx) => {
              const displayName = emp.name.split(" ").pop() || emp.name;
              return (
                <div
                  key={emp.name}
                  className="rounded-lg bg-sky-50/80 p-2 border border-sky-100/90"
                  title={`${emp.name}: ${formatNumber(emp.count)} ticket (${emp.growth !== null ? (emp.growth >= 0 ? `+${emp.growth}%` : `${emp.growth}%`) : "--"} so với tháng trước)`}
                >
                  <span className="block text-[10px] font-bold text-sky-800 truncate">
                    #{idx + 1} {displayName}
                  </span>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <p className="text-xs font-black text-slate-900">
                      {formatNumber(emp.count)} <span className="text-[9px] font-normal text-slate-400">tk</span>
                    </p>
                    <span className="text-[10px] font-extrabold shrink-0">
                      {emp.growth !== null ? (
                        emp.growth > 0 ? (
                          <span className="text-emerald-600">▲+{emp.growth}%</span>
                        ) : emp.growth < 0 ? (
                          <span className="text-rose-600">▼{emp.growth}%</span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 rounded-lg bg-sky-50 px-2 py-1.5 text-center text-[10px] font-medium text-sky-600">
              Đang tổng hợp Top 3 NV...
            </div>
          )}
        </div>
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
  const pathname = usePathname();
  const [activeDashboardTab, setActiveDashboardTab] = useState<
    "ccc" | "tickets" | "chatbot" | "ekyc" | "errors" | "surveys"
  >(() => {
    if (pathname === "/tickets/dashboard") return "tickets";
    if (pathname === "/chatbots/dashboard") return "chatbot";
    return "ccc";
  });
  const [activeTicketSubTab, setActiveTicketSubTab] = useState<
    "overview" | "tickets"
  >("overview");
  const dashboard = useCccDashboard("", { enabled: activeDashboardTab === "ccc" || activeDashboardTab === "tickets" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [globalViewMode, setGlobalViewMode] = useState<ChartViewMode>("TREND_OVER_TIME");
  const [granularity, setGranularity] = useState<GranularityMode>("MONTH");
  const [compareMode, setCompareMode] = useState<CompareMode>("QOQ");
  const [globalMonth, setGlobalMonth] = useState<string>("");

  const [systemMetrics, setSystemMetrics] = useState<CccSystemMetrics>({
    totalUsers: null,
    ekycSuccessRate: null,
    ekycBreakdown: [],
    chatbotReceived: null,
    chatbotBotDone: null,
    chatbotCcc: null,
    chatbotTopTopics: [],
    externalTotalErrors: null,
    externalNeedReview: null,
    externalClassificationRate: null,
    externalGrowth: null,
    externalBySource: [],
    externalByDevice: [],
    surveyAvgScore: null,
    surveyCsatRate: null,
    surveyRatedCount: null,
    surveyUnratedCount: null,
    surveyResponseRate: null,
    surveyCategories: [],
    loading: true,
  });

  const [tabRefreshKeys, setTabRefreshKeys] = useState({
    ccc: 0,
    tickets: 0,
    chatbot: 0,
    ekyc: 0,
    errors: 0,
    surveys: 0,
  });

  const fetchMetrics = useCallback(async () => {
    try {
      const surveyGranularity: SurveyGranularity =
        granularity === "QUARTER"
          ? "quarter"
          : granularity === "YEAR"
          ? "year"
          : "month";

      const isDefaultRange =
        !dashboard.dateFrom ||
        !dashboard.dateTo ||
        (dashboard.dateFrom === getCurrentYearStart() &&
          dashboard.dateTo === getCurrentDate());

      const surveyParams = {
        granularity: surveyGranularity,
        period: isDefaultRange ? currentPeriodCode(surveyGranularity) : "",
        start_date: isDefaultRange ? undefined : dashboard.dateFrom,
        end_date: isDefaultRange ? undefined : dashboard.dateTo,
      };

      const [ekycRes, chatbotRes, errorRes, surveyRes] = await Promise.allSettled([
        ekycApi.getDashboard({
          call_date_from: dashboard.dateFrom || undefined,
          call_date_to: dashboard.dateTo || undefined,
          granularity,
          compare_mode: compareMode,
        }),
        chatbotDashboardService.getOverview({
          start_date: dashboard.dateFrom || undefined,
          end_date: dashboard.dateTo || undefined,
          granularity: (granularity === "QUARTER" ? "quarter" : granularity === "YEAR" ? "year" : "month") as any,
        }),
        externalErrorService.getDashboardOverview({
          date_from: dashboard.dateFrom || undefined,
          date_to: dashboard.dateTo || undefined,
        }),
        surveyApi.dashboard(surveyParams),
      ]);

      const ekycTotal = ekycRes.status === "fulfilled" ? ekycRes.value?.total_records || 0 : 0;
      const ekycResultBreakdown = ekycRes.status === "fulfilled" ? ekycRes.value?.result_breakdown || [] : [];
      const ekycStatusBreakdown = ekycRes.status === "fulfilled" ? ekycRes.value?.status_breakdown || [] : [];
      const ekycSuccessCount = ekycStatusBreakdown.find((x: any) => x.status === "Nghe máy")?.count || 0;
      const ekycSuccessRate = ekycTotal > 0 ? Math.round((ekycSuccessCount / ekycTotal) * 100) : 98.5;

      const chatbotSummary = chatbotRes.status === "fulfilled" ? chatbotRes.value.summary : null;
      const chatbotReceived = chatbotSummary?.total_received?.session_count ?? 0;
      const chatbotBotDone = chatbotSummary?.bot_done?.session_count ?? 0;
      const chatbotCcc = chatbotSummary?.ccc?.session_count ?? 0;
      const chatbotTopTopics = chatbotRes.status === "fulfilled" ? chatbotRes.value?.charts?.topic_bar?.slice(0, 4) || [] : [];

      const errorOverview = errorRes.status === "fulfilled" ? errorRes.value : null;
      const errorSummary = errorOverview?.summary;
      const externalTotalErrors = errorSummary?.total_errors ?? 0;
      const externalNeedReview = errorSummary?.need_review_errors ?? 0;
      const externalClassificationRate = errorSummary?.classification_rate ?? 0;
      const externalBySource = (errorOverview?.charts?.by_source?.data || []).map((x: any) => ({
        name: String(x.label || x.name || "Khác"),
        value: Number(x.value ?? x.count ?? 0),
      }));
      const externalByDevice = (errorOverview?.charts?.by_device?.data || []).map((x: any) => ({
        name: String(x.label || x.name || "Khác"),
        value: Number(x.value ?? x.count ?? 0),
      }));

      let externalGrowth: number | null = null;
      const trendData = errorOverview?.charts?.trend?.data || [];
      if (trendData.length >= 2) {
        const curr = trendData[trendData.length - 1]?.value ?? 0;
        const prev = trendData[trendData.length - 2]?.value ?? 0;
        if (prev > 0) {
          externalGrowth = Math.round(((curr - prev) / prev) * 100);
        } else if (curr > 0) {
          externalGrowth = 100;
        } else {
          externalGrowth = 0;
        }
      }

      const surveyDashboard = surveyRes.status === "fulfilled" ? surveyRes.value : null;
      const surveyMetrics = surveyDashboard?.metrics;
      const surveyAvgScore = surveyMetrics?.average_score ?? null;
      const surveyCsatRate = surveyMetrics?.csat_percent ?? null;
      const surveyRatedCount = surveyMetrics?.rated ?? null;
      const surveyUnratedCount = surveyMetrics?.unrated ?? null;
      const surveyResponseRate = surveyMetrics?.response_rate ?? null;
      const surveyCategories = surveyDashboard?.categories?.slice(0, 4) || [];

      setSystemMetrics({
        totalUsers: ekycTotal,
        ekycSuccessRate,
        ekycBreakdown: ekycResultBreakdown,
        chatbotReceived,
        chatbotBotDone,
        chatbotCcc,
        chatbotTopTopics,
        externalTotalErrors,
        externalNeedReview,
        externalClassificationRate,
        externalGrowth,
        externalBySource,
        externalByDevice,
        surveyAvgScore,
        surveyCsatRate,
        surveyRatedCount,
        surveyUnratedCount,
        surveyResponseRate,
        surveyCategories,
        loading: false,
      });
    } catch {
      setSystemMetrics((prev) => ({ ...prev, loading: false }));
    }
  }, [compareMode, dashboard.dateFrom, dashboard.dateTo, granularity]);

  useEffect(() => {
    if (activeDashboardTab !== "ccc" && activeDashboardTab !== "tickets") return;
    void fetchMetrics();
  }, [activeDashboardTab, fetchMetrics]);

  const handleReload = useCallback(() => {
    if (activeDashboardTab === "ccc") {
      dashboard.reload();
      void fetchMetrics();
      setTabRefreshKeys((prev) => ({
        ccc: prev.ccc + 1,
        tickets: prev.tickets + 1,
        chatbot: prev.chatbot + 1,
        ekyc: prev.ekyc + 1,
        errors: prev.errors + 1,
        surveys: prev.surveys + 1,
      }));
    } else if (activeDashboardTab === "tickets") {
      dashboard.reload();
      setTabRefreshKeys((prev) => ({ ...prev, tickets: prev.tickets + 1 }));
    } else if (activeDashboardTab === "chatbot") {
      setTabRefreshKeys((prev) => ({ ...prev, chatbot: prev.chatbot + 1 }));
    } else if (activeDashboardTab === "ekyc") {
      setTabRefreshKeys((prev) => ({ ...prev, ekyc: prev.ekyc + 1 }));
    } else if (activeDashboardTab === "errors") {
      setTabRefreshKeys((prev) => ({ ...prev, errors: prev.errors + 1 }));
    } else if (activeDashboardTab === "surveys") {
      setTabRefreshKeys((prev) => ({ ...prev, surveys: prev.surveys + 1 }));
    }
  }, [activeDashboardTab, dashboard, fetchMetrics]);

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

  const listActionConfig = useMemo(() => {
    switch (activeDashboardTab) {
      case "chatbot":
        return {
          href: "/tickets",
          label: "Danh sách ticket Chatbot",
          icon: <BotMessageSquare size={14} className="text-teal-600" />,
        };
      case "ekyc":
        return {
          href: "/failed-ekyc",
          label: "Danh sách Failed eKYC",
          icon: <Users size={14} className="text-sky-600" />,
        };
      case "errors":
        return {
          href: "/external-errors",
          label: "Danh sách lỗi",
          icon: <AlertTriangle size={14} className="text-amber-600" />,
        };
      case "surveys":
        return {
          href: "/surveys",
          label: "Kết quả khảo sát",
          icon: <ClipboardCheck size={14} className="text-indigo-600" />,
        };
      case "tickets":
      case "ccc":
      default:
        return {
          href: "/tickets",
          label: "Danh sách ticket",
          icon: <Ticket size={14} className="text-emerald-600" />,
        };
    }
  }, [activeDashboardTab]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        {
          label:
            activeDashboardTab === "tickets"
              ? "Dashboard Ticket CCC"
              : activeDashboardTab === "chatbot"
              ? "Dashboard Chatbot"
              : activeDashboardTab === "ekyc"
              ? "Dashboard eKYC & Failed eKYC"
              : activeDashboardTab === "errors"
              ? "Dashboard Lỗi Hệ Thống"
              : activeDashboardTab === "surveys"
              ? "Dashboard Khảo Sát"
              : "Dashboard CCC",
        },
      ]}
      rightAction={
        <div className="relative flex flex-wrap items-center justify-end gap-2">
          <CccPeriodControls
            granularity={granularity}
            onGranularityChange={(g) => {
              setGranularity(g);
              const now = new Date();
              const toDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
              let fromDate = "";

              if (g === "MONTH") {
                const start = new Date(now.getFullYear(), now.getMonth() - 4, 1);
                fromDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
              } else if (g === "QUARTER") {
                const startYear = now.getFullYear() - 1;
                fromDate = `${startYear}-01-01`;
              } else if (g === "YEAR") {
                const startYear = now.getFullYear() - 2;
                fromDate = `${startYear}-01-01`;
              }

              if (fromDate) {
                dashboard.searchWithDates(fromDate, toDate);
              }
            }}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />

          {activeDashboardTab === "ekyc" ? (
            <>
              <Link
                href="/ekyc"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-colors"
              >
                <Users size={14} className="text-sky-600" />
                Danh sách cuộc gọi eKYC
              </Link>
              <Link
                href="/failed-ekyc"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-colors"
              >
                <AlertTriangle size={14} className="text-amber-600" />
                Danh sách Failed eKYC
              </Link>
            </>
          ) : (
            <Link
              href={listActionConfig.href}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              {listActionConfig.icon}
              {listActionConfig.label}
            </Link>
          )}

          <button
            type="button"
            onClick={toggleFilter}
            className={`relative flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-2xs ${filterOpen || dashboard.activeFilterCount > 0
                ? "border-[#10b981] bg-emerald-50 text-[#059669]"
                : "border-slate-300/80 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              }`}
          >
            <SlidersHorizontal size={14} />
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
            onClick={handleReload}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
            title="Bỏ qua cache và tải dữ liệu mới từ backend"
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Dashboard Switcher Nav Tabs - Sticky Header */}
        <div className="sticky top-[100px] z-20 -mx-4 -mt-4 bg-[#eef6f2]/95 px-4 pb-2 pt-2 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveDashboardTab("ccc")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs ${
                activeDashboardTab === "ccc"
                  ? "bg-[#059669] text-white shadow-2xs ring-1 ring-emerald-600 font-bold"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold"
              }`}
              title="Xem Tổng Quan Dashboard Executive CCC"
            >
              <Gauge size={13} className={activeDashboardTab === "ccc" ? "text-white" : "text-[#059669]"} />
              <span>Dashboard CCC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDashboardTab("tickets")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs ${
                activeDashboardTab === "tickets"
                  ? "bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-600 font-bold"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold"
              }`}
              title="Xem Chi Tiết Dashboard Ticket CCC"
            >
              <Ticket size={13} className={activeDashboardTab === "tickets" ? "text-white" : "text-emerald-600"} />
              <span>Ticket CCC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDashboardTab("chatbot")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs ${
                activeDashboardTab === "chatbot"
                  ? "bg-teal-600 text-white shadow-2xs ring-1 ring-teal-600 font-bold"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold"
              }`}
              title="Xem Dashboard Chatbot"
            >
              <BotMessageSquare size={13} className={activeDashboardTab === "chatbot" ? "text-white" : "text-teal-600"} />
              <span>Dashboard Chatbot</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDashboardTab("ekyc")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs ${
                activeDashboardTab === "ekyc"
                  ? "bg-sky-600 text-white shadow-2xs ring-1 ring-sky-600 font-bold"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold"
              }`}
              title="Xem Dashboard eKYC & Failed eKYC"
            >
              <Users size={13} className={activeDashboardTab === "ekyc" ? "text-white" : "text-sky-600"} />
              <span>eKYC & Failed eKYC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDashboardTab("errors")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs ${
                activeDashboardTab === "errors"
                  ? "bg-amber-600 text-white shadow-2xs ring-1 ring-amber-600 font-bold"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold"
              }`}
              title="Xem Dashboard Lỗi Hệ Thống & Bên Ngoài"
            >
              <AlertTriangle size={13} className={activeDashboardTab === "errors" ? "text-white" : "text-amber-600"} />
              <span>Lỗi Hệ Thống</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDashboardTab("surveys")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs ${
                activeDashboardTab === "surveys"
                  ? "bg-purple-600 text-white shadow-2xs ring-1 ring-purple-600 font-bold"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold"
              }`}
              title="Xem Dashboard Khảo Sát CSAT"
            >
              <ClipboardCheck size={13} className={activeDashboardTab === "surveys" ? "text-white" : "text-purple-600"} />
              <span>Khảo Sát CSAT</span>
            </button>
          </div>
        </div>

        {/* 1A. Executive Summary Dashboard CCC (Selective Highlights, 4 Pillar Trend Charts & Insights Panel) */}
        {activeDashboardTab === "ccc" && (
          <div className="space-y-4">
            {/* Top 5 Pillar Executive Overview Cards */}
            <CccExecutiveSummaryGrid
              dashboard={dashboard}
              systemMetrics={systemMetrics}
              onSwitchTab={setActiveDashboardTab}
            />

            {/* Sub-Dashboard Critical Insights & Breakdown Panel */}
            <CccSubDashboardInsightsPanel
              systemMetrics={systemMetrics}
              onSwitchTab={setActiveDashboardTab}
            />

            {/* Multi-Domain Trend Charts Grid */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {/* Trend Chart 1: Tickets CCC */}
              {dashboard.data && (
                <CccDashboardCharts
                  key={`ccc-trend-${tabRefreshKeys.ccc}`}
                  charts={dashboard.data.charts}
                  globalViewMode={globalViewMode}
                  granularity={granularity}
                  compareMode={compareMode}
                  onlyKeyCharts
                />
              )}

              {/* Trend Chart 2: Chatbot AI */}
              <ChatbotDashboardSection
                key={`chatbot-trend-${tabRefreshKeys.chatbot}`}
                hideToolbar
                dateFrom={dashboard.dateFrom}
                dateTo={dashboard.dateTo}
                granularity={granularity}
                onlyTrendChart
              />

              {/* Trend Chart 3: Lỗi Hệ Thống (External Errors) */}
              <ExternalErrorDashboardSection
                key={`errors-trend-${tabRefreshKeys.errors}`}
                dateFrom={dashboard.dateFrom}
                dateTo={dashboard.dateTo}
                granularity={granularity}
                compareMode={compareMode}
                onlyTrendChart
              />

              {/* Trend Chart 4: Khảo Sát Ý Kiến KH (Surveys) */}
              <SurveyDashboardWrapper
                key={`surveys-trend-${tabRefreshKeys.surveys}`}
                dateFrom={dashboard.dateFrom}
                dateTo={dashboard.dateTo}
                granularity={granularity}
                onlyTrendChart
              />
            </div>

            {dashboard.error && <ErrorBlock message={dashboard.error} />}
            {dashboard.loading && !dashboard.data && <LoadingBlock />}
          </div>
        )}

        {/* 1B. Focused Tickets CCC Tab */}
        {activeDashboardTab === "tickets" && (
          <div className="space-y-4">
            {/* Sub-tabs nav (Tổng quan | Danh sách ticket) */}
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTicketSubTab("overview")}
                className={`h-9 rounded-xl px-4 text-xs font-bold transition-all ${
                  activeTicketSubTab === "overview"
                    ? "bg-[#059669] text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Tổng quan
              </button>
              <button
                type="button"
                onClick={() => setActiveTicketSubTab("tickets")}
                className={`h-9 rounded-xl px-4 text-xs font-bold transition-all ${
                  activeTicketSubTab === "tickets"
                    ? "bg-[#059669] text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Danh sách ticket
              </button>
            </div>

            {activeTicketSubTab === "overview" && (
              <>
                <div className="grid grid-cols-12 gap-5 items-stretch">
                  <div className="col-span-12 xl:col-span-5 h-full flex flex-col">
                    <SystemOverviewGrid
                      dashboard={dashboard}
                      systemMetrics={systemMetrics}
                    />
                  </div>

                  <div className="col-span-12 xl:col-span-7 h-full flex flex-col">
                    {dashboard.data && (
                      <TicketListTable
                        title="Ticket chưa xử lý"
                        description="Danh sách các ticket đang chờ xử lý theo bộ lọc hiện tại."
                        filters={dashboard.appliedParams}
                        refreshKey={dashboard.data.generated_at}
                      />
                    )}
                  </div>
                </div>

                {dashboard.error && <ErrorBlock message={dashboard.error} />}

                {dashboard.loading && !dashboard.data && <LoadingBlock />}

                {dashboard.data && (
                  <CccDashboardCharts
                    key={`tickets-tab-${tabRefreshKeys.tickets}`}
                    charts={dashboard.data.charts}
                    globalViewMode={globalViewMode}
                    granularity={granularity}
                    compareMode={compareMode}
                  />
                )}
              </>
            )}

            {activeTicketSubTab === "tickets" && (
              <TicketListPage embedded />
            )}
          </div>
        )}

        {/* 2. Chatbot Dashboard Section */}
        {activeDashboardTab === "chatbot" && (
          <ChatbotDashboardSection
            key={`chatbot-tab-${tabRefreshKeys.chatbot}`}
            hideToolbar
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
            granularity={granularity}
          />
        )}

        {/* 3. eKYC & Failed eKYC Dashboard Section */}
        {activeDashboardTab === "ekyc" && (
          <EkycAndFailedEkycDashboardSection
            key={`ekyc-tab-${tabRefreshKeys.ekyc}`}
            granularity={granularity}
            compareMode={compareMode}
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
          />
        )}

        {/* 4. External Error Dashboard Section */}
        {activeDashboardTab === "errors" && (
          <ExternalErrorDashboardSection
            key={`errors-tab-${tabRefreshKeys.errors}`}
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
            granularity={granularity}
            compareMode={compareMode}
          />
        )}

        {/* 5. Survey Dashboard Section */}
        {activeDashboardTab === "surveys" && (
          <SurveyDashboardWrapper
            key={`surveys-tab-${tabRefreshKeys.surveys}`}
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
            granularity={granularity}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

