"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  PhoneCall,
  PhoneOff,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  UserX,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ekycApi } from "@/apis/ekyc.api";
import {
  EkycDashboardData,
  EkycRecord,
  EkycStatusBreakdown,
  EkycResultBreakdown,
} from "@/types/ekyc.type";
import { GranularityMode, CompareMode } from "@/components/tickets/dashboard/CccDashboardUtils";
import { EkycDashboardCharts } from "@/components/ekyc/EkycDashboardCharts";
import { DateRangeFilter } from "@/components/common";
import { getLast5MonthsDateRange } from "@/utils/date.util";

interface EkycDashboardViewProps {
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}

export function EkycDashboardView({
  granularity = "MONTH",
  compareMode = "NONE",
}: EkycDashboardViewProps) {
  const defaultDateRange = getLast5MonthsDateRange();
  const [data, setData] = useState<EkycDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(defaultDateRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultDateRange.dateTo);

  const hasValidDateRange = Boolean(
    dateFrom && dateTo && dateFrom <= dateTo
  );

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await ekycApi.getDashboard({
        call_date_from: dateFrom,
        call_date_to: dateTo,
        granularity,
        compare_mode: compareMode,
      });
      setData(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasValidDateRange) {
      fetchDashboard();
    }
  }, [granularity, compareMode, dateFrom, dateTo, hasValidDateRange]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const total = data?.total_records || 0;
  const comparison = data?.comparison;

  const getStatusCount = (st: string) => {
    return (
      data?.status_breakdown?.find((item: EkycStatusBreakdown) => item.status === st)?.count || 0
    );
  };

  const getResultCount = (res: string) => {
    return (
      data?.result_breakdown?.find((item: EkycResultBreakdown) => item.result === res)?.count || 0
    );
  };

  const answeredCount = getStatusCount("Nghe máy");
  const noAnswerCount = getStatusCount("Không nghe máy");
  const unreachableCount = getStatusCount("Thuê bao không tồn tại");

  const keyPressedCount = getResultCount("Khách hàng bấm phím");
  const noKeyCount = getResultCount("KH không bấm phím");
  const hungUpCount = getResultCount("Khách hàng tắt máy ngang");

  const answeredPercent = total > 0 ? ((answeredCount / total) * 100).toFixed(1) : "0";
  const keyPressedPercent = total > 0 ? ((keyPressedCount / total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
            <DateRangeFilter
              fromLabel="Từ ngày gọi"
              toLabel="Đến ngày gọi"
              fromValue={dateFrom}
              toValue={dateTo}
              onFromChange={setDateFrom}
              onToChange={setDateTo}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const range = getLast5MonthsDateRange();
              setDateFrom(range.dateFrom);
              setDateTo(range.dateTo);
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Đặt lại 5 tháng gần nhất
          </button>
        </div>

        {!hasValidDateRange && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
          </p>
        )}
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng bản ghi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              TỔNG SỐ CUỘC GỌI eKYC
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <PhoneCall size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-800">{total}</p>
            {comparison && (
              <span
                className={`text-xs font-bold ${
                  comparison.total_growth_percent >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {comparison.total_growth_percent >= 0 ? "+" : ""}
                {comparison.total_growth_percent}%
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <TrendingUp size={14} className="text-emerald-600" />
            <span>
              {comparison
                ? `So với ${comparison.prev_total} cuộc gọi kỳ trước`
                : "Mặc định 5 tháng gần nhất"}
            </span>
          </div>
        </div>

        {/* Nghe máy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              TỶ LỆ NGHE MÁY
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-teal-700">{answeredCount}</p>
            <span className="text-xs font-semibold text-teal-600">
              ({answeredPercent}%)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Khách hàng bắt máy thành công
          </p>
        </div>

        {/* Khách hàng bấm phím */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              KHÁCH HÀNG BẤM PHÍM
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-blue-700">
              {keyPressedCount}
            </p>
            <span className="text-xs font-semibold text-blue-600">
              ({keyPressedPercent}%)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Xác thực phím bấm thành công
          </p>
        </div>

        {/* Tắt máy ngang / Không nghe */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              TẮT MÁY NGANG / KHÔNG NGHE
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <PhoneOff size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-700">
            {noAnswerCount + hungUpCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Cần theo dõi & follow-up lại
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <EkycDashboardCharts trends={data?.daily_trends || []} />
    </div>
  );
}
