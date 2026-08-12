"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BotMessageSquare,
  ClipboardCheck,
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
import { useExternalErrorDashboard } from "@/hooks/useExternalErrorDashboard";

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
        <div className="flex items-center gap-2 border-b border-sky-200/80 pb-2">
          <span className="h-3.5 w-1 rounded-full bg-sky-600" />
          <h2 className="text-xs font-black uppercase tracking-wider text-sky-900">
            1. Thống Kê Xác Thực Cuộc Gọi eKYC
          </h2>
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
        <div className="flex items-center gap-2 border-b border-amber-200/80 pb-2">
          <span className="h-3.5 w-1 rounded-full bg-amber-600" />
          <h2 className="text-xs font-black uppercase tracking-wider text-amber-900">
            2. Thống Kê Sự Cố Failed eKYC & Kết Quả Chăm Sóc KH
          </h2>
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

const ChatbotDashboardCharts = dynamic(
  () => import("@/components/chatbot-dashboard/ChatbotDashboardCharts").then((mod) => mod.ChatbotDashboardCharts),
  { ssr: false, loading: () => <CccDashboardChartSkeleton /> }
);

function ExternalErrorDashboardSection({
  dateFrom,
  dateTo,
  granularity,
  compareMode,
}: {
  dateFrom?: string;
  dateTo?: string;
  granularity: GranularityMode;
  compareMode: CompareMode;
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
    <ExternalErrorDashboardCharts
      charts={charts}
      recurringIssues={recurringIssues}
    />
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
}: {
  dateFrom?: string;
  dateTo?: string;
  granularity: GranularityMode;
}) {
  const surveyGranularity = granularity === "QUARTER" ? "quarter" : granularity === "YEAR" ? "year" : "month";
  const filters = {
    granularity: surveyGranularity as "month" | "quarter" | "year",
    period: "",
    startDate: dateFrom || "",
    endDate: dateTo || "",
  };

  return <SurveyDashboardSection filters={filters} />;
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

      {/* 3. Chatbot AI Card */}
      <Link
        href="/chatbots/dashboard"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-purple-100/80 bg-white p-4.5 shadow-xs hover:border-purple-300 hover:shadow-md"
      >
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-purple-500/5" />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800 ring-1 ring-purple-500/20">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                <BotMessageSquare size={12} />
              </div>
              Trợ Lý Chatbot AI
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-purple-600 group-hover:text-white">
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div className="mt-3.5 flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-slate-900">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.chatbotReceived || 0)}
            </p>
            <span className="text-xs font-medium text-slate-400">phiên chat</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
          <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
            <span className="block text-[10px] font-medium text-slate-400">Bot xử lý xong</span>
            <p className="text-xs font-black text-purple-700">
              {systemMetrics.loading ? "..." : `${formatNumber(systemMetrics.chatbotBotDone || 0)} (${botDoneRate}%)`}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
            <span className="block text-[10px] font-medium text-slate-400">Chuyển CCC</span>
            <p className="text-xs font-black text-indigo-600">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.chatbotCcc || 0)}
            </p>
          </div>
        </div>
      </Link>

      {/* 4. External Errors Card */}
      <Link
        href="/external-errors/dashboard"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-100/80 bg-white p-4.5 shadow-xs hover:border-amber-300 hover:shadow-md"
      >
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/5" />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-500/20">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                <AlertTriangle size={12} />
              </div>
              Lỗi Hệ Thống / Bên Ngoài
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-amber-600 group-hover:text-white">
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div className="mt-3.5 flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-slate-900">
              {systemMetrics.loading ? "..." : formatNumber(systemMetrics.externalTotalErrors || 0)}
            </p>
            <span className="text-xs font-medium text-slate-400">sự cố phát sinh</span>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
          <div
            className="rounded-lg bg-emerald-50/80 p-2 border border-emerald-100/90"
            title={`Tỷ lệ xử lý xong: ${systemMetrics.externalClassificationRate || 0}% (${systemMetrics.externalGrowth !== null ? (systemMetrics.externalGrowth >= 0 ? `+${systemMetrics.externalGrowth}%` : `${systemMetrics.externalGrowth}%`) : "--"} so với kỳ trước)`}
          >
            <span className="block text-[10px] font-bold text-emerald-800 truncate">
              Tỷ lệ xử lý xong
            </span>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <p className="text-xs font-black text-slate-900">
                {systemMetrics.loading ? "..." : `${systemMetrics.externalClassificationRate || 0}%`}
              </p>
              <span className="text-[10px] font-extrabold shrink-0">
                {systemMetrics.externalGrowth !== null ? (
                  systemMetrics.externalGrowth > 0 ? (
                    <span className="text-emerald-600">▲+{systemMetrics.externalGrowth}%</span>
                  ) : systemMetrics.externalGrowth < 0 ? (
                    <span className="text-rose-600">▼{systemMetrics.externalGrowth}%</span>
                  ) : (
                    <span className="text-slate-400">0%</span>
                  )
                ) : (
                  <span className="text-slate-400">--</span>
                )}
              </span>
            </div>
          </div>
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
  const [activeDashboardTab, setActiveDashboardTab] = useState<"tickets" | "ekyc" | "errors" | "surveys">("tickets");
  const dashboard = useCccDashboard("", { enabled: activeDashboardTab === "tickets" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [globalViewMode, setGlobalViewMode] = useState<ChartViewMode>("TREND_OVER_TIME");
  const [granularity, setGranularity] = useState<GranularityMode>("MONTH");
  const [compareMode, setCompareMode] = useState<CompareMode>("QOQ");
  const [globalMonth, setGlobalMonth] = useState<string>("");

  const [systemMetrics, setSystemMetrics] = useState({
    totalUsers: null as number | null,
    chatbotReceived: null as number | null,
    chatbotBotDone: null as number | null,
    chatbotCcc: null as number | null,
    externalTotalErrors: null as number | null,
    externalNeedReview: null as number | null,
    externalClassificationRate: null as number | null,
    externalGrowth: null as number | null,
    loading: true,
  });

  useEffect(() => {
    if (activeDashboardTab !== "tickets") return;

    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const [usersRes, chatbotRes, errorRes] = await Promise.allSettled([
          userService.getUsers({ page: "1" }),
          chatbotDashboardService.getOverview({
            start_date: dashboard.dateFrom || undefined,
            end_date: dashboard.dateTo || undefined,
          }),
          externalErrorService.getDashboardOverview({
            date_from: dashboard.dateFrom || undefined,
            date_to: dashboard.dateTo || undefined,
          }),
        ]);

        if (!isMounted) return;

        const usersCount = usersRes.status === "fulfilled" ? usersRes.value.count || 0 : 0;

        const chatbotSummary = chatbotRes.status === "fulfilled" ? chatbotRes.value.summary : null;
        const chatbotReceived = chatbotSummary?.total_received?.value ?? 0;
        const chatbotBotDone = chatbotSummary?.bot_done?.value ?? 0;
        const chatbotCcc = chatbotSummary?.ccc?.value ?? 0;

        const errorOverview = errorRes.status === "fulfilled" ? errorRes.value : null;
        const errorSummary = errorOverview?.summary;
        const externalTotalErrors = errorSummary?.total_errors ?? 0;
        const externalNeedReview = errorSummary?.need_review_errors ?? 0;
        const externalClassificationRate = errorSummary?.classification_rate ?? 0;

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

        setSystemMetrics({
          totalUsers: usersCount,
          chatbotReceived,
          chatbotBotDone,
          chatbotCcc,
          externalTotalErrors,
          externalNeedReview,
          externalClassificationRate,
          externalGrowth,
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
  }, [activeDashboardTab, dashboard.dateFrom, dashboard.dateTo]);

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
        <div className="relative flex flex-wrap items-center justify-end gap-2">
          <CccPeriodControls
            granularity={granularity}
            onGranularityChange={setGranularity}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
          />

          <Link
            href="/tickets"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400"
          >
            <Ticket size={14} className="text-emerald-600" />
            Danh sách ticket
          </Link>

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
            onClick={dashboard.reload}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
            title="Bỏ qua cache và tải dữ liệu mới từ backend"
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Executive Header Banner - Ultra-Compact Green & White theme */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/70 px-3 py-1.5 shadow-2xs">
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/80" />
                <h1 className="text-xs font-black uppercase tracking-tight text-slate-900">
                  Dashboard Ticket CCC
                </h1>
              </div>

              <span className="text-slate-300">•</span>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {report && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/80 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                    Báo cáo {reportMonthCount} tháng
                  </span>
                )}

                {report && (
                  <span className="font-semibold text-slate-600">
                    {formatDate(report.range_from)} - {formatDate(report.range_to)}
                  </span>
                )}

                <span className="text-slate-300">•</span>

                <span className="text-slate-500">
                  Cập nhật: {formatDateTime(dashboard.data?.generated_at)}
                </span>
              </div>
            </div>

            {dashboard.fetching && dashboard.data && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <RefreshCw size={12} className="text-emerald-600" />
                Đang cập nhật...
              </span>
            )}
          </div>
        </div>

        {/* Dashboard Switcher Nav Tabs - Ultra-Compact Spacing */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 pb-1.5">
          <button
            type="button"
            onClick={() => setActiveDashboardTab("tickets")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs ${
              activeDashboardTab === "tickets"
                ? "bg-[#059669] text-white shadow-2xs ring-1 ring-emerald-600 font-bold"
                : "border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold"
            }`}
          >
            <Ticket size={13} className={activeDashboardTab === "tickets" ? "text-white" : "text-emerald-600"} />
            <span>Tickets CCC</span>
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
            title="Xem Dashboard Khảo Sát Ý Kiến Khách Hàng"
          >
            <ClipboardCheck size={13} className={activeDashboardTab === "surveys" ? "text-white" : "text-purple-600"} />
            <span>Khảo Sát</span>
          </button>
        </div>

        {/* 1. System Overview Cards (Left 2x2) & Pending Ticket Table (Right) - ONLY VISIBLE ON TICKETS CCC TAB */}
        {activeDashboardTab === "tickets" && (
          <div className="grid grid-cols-12 gap-5 items-start">
            <div className="col-span-12 xl:col-span-5">
              <SystemOverviewGrid
                dashboard={dashboard}
                systemMetrics={systemMetrics}
              />
            </div>

            <div className="col-span-12 xl:col-span-7">
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
        )}

        {dashboard.error && <ErrorBlock message={dashboard.error} />}

        {dashboard.loading && !dashboard.data && <LoadingBlock />}

        {/* Dynamic Chart Suite below Overview Cards & Table */}
        {activeDashboardTab === "tickets" && dashboard.data && (
          <CccDashboardCharts
            charts={dashboard.data.charts}
            globalViewMode={globalViewMode}
            granularity={granularity}
            compareMode={compareMode}
          />
        )}

        {activeDashboardTab === "ekyc" && (
          <EkycAndFailedEkycDashboardSection
            granularity={granularity}
            compareMode={compareMode}
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
          />
        )}

        {activeDashboardTab === "errors" && (
          <ExternalErrorDashboardSection
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
            granularity={granularity}
            compareMode={compareMode}
          />
        )}

        {activeDashboardTab === "surveys" && (
          <SurveyDashboardWrapper
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
            granularity={granularity}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

