"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Minus,
  Phone,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import {
  formatMetricValue,
  formatNumber,
  formatPercent,
  getGrowthClass,
  getMetricTheme,
  toNumber,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminDashboardResponse, SaAdminOverviewMetric } from "@/types/sale-admin-dashboard.type";
import { CompareMode, GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";

function GrowthIcon({ value }: { value?: number | null }) {
  if (value === null || value === undefined || value === 0) return <Minus size={13} />;
  if (value > 0) return <ArrowUpRight size={13} />;
  return <ArrowDownRight size={13} />;
}

function MetricIcon({ type }: { type: string }) {
  const className = "h-4 w-4";

  if (type === "phone") return <Phone className={className} />;
  if (type === "refresh") return <RefreshCw className={className} />;
  if (type === "dollar") return <DollarSign className={className} />;
  return <TrendingUp className={className} />;
}

function previousValue(item: SaAdminOverviewMetric) {
  if (item.unit === "VND") {
    return formatMetricValue({ ...item, value: item.previous_value || 0 });
  }

  return formatNumber(item.previous_value);
}

export function AdminOverviewCards({
  items = [],
  compareMode = "NONE",
  granularity = "MONTH",
  historyData = [],
}: {
  items?: SaAdminOverviewMetric[];
  compareMode?: CompareMode;
  granularity?: GranularityMode;
  historyData?: SaAdminDashboardResponse[];
}) {
  const displayItems = useMemo(() => {
    if (!historyData || historyData.length === 0 || granularity === "MONTH") {
      return items;
    }

    const metricMap: Record<string, { value: number; previous_value: number; item: SaAdminOverviewMetric }> = {};

    historyData.forEach((res) => {
      const metrics = res.summary_cards || res.overview || [];
      metrics.forEach((m) => {
        if (!metricMap[m.key]) {
          metricMap[m.key] = { value: 0, previous_value: 0, item: m };
        }
        metricMap[m.key].value += toNumber(m.value);
        metricMap[m.key].previous_value += toNumber(m.previous_value);
      });
    });

    return items.map((item) => {
      const aggregated = metricMap[item.key];
      if (!aggregated) return item;

      const val = aggregated.value;
      const prev = aggregated.previous_value;
      let growth: number | null = null;
      if (prev > 0) {
        growth = Number((((val - prev) / prev) * 100).toFixed(1));
      } else if (val > 0) {
        growth = 100;
      } else {
        growth = 0;
      }

      return {
        ...item,
        value: val,
        previous_value: prev,
        growth_percent: growth,
      };
    });
  }, [items, historyData, granularity]);

  const getCompareFooterLabel = () => {
    if (compareMode === "YOY") return "Cùng kỳ năm trước (YoY)";
    if (compareMode === "QOQ") {
      if (granularity === "QUARTER") return "Quý trước (QoQ)";
      if (granularity === "YEAR") return "Năm trước (YoY)";
      return "Tháng trước (MoM)";
    }
    return "";
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {displayItems.map((item) => {
        const theme = getMetricTheme(item.key);

        return (
          <div
            key={item.key}
            className={`group relative overflow-hidden rounded-lg border ${theme.border} ${theme.bg} p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${theme.accent}`} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${theme.iconBg}`}>
                    <MetricIcon type={theme.icon} />
                  </span>
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                </div>

                <p className={`mt-3 truncate text-2xl font-bold leading-none ${theme.value}`}>
                  {formatMetricValue(item)}
                </p>
              </div>

              {compareMode !== "NONE" && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${getGrowthClass(
                    item.growth_percent
                  )}`}
                >
                  <GrowthIcon value={item.growth_percent} />
                  {formatPercent(item.growth_percent)}
                </span>
              )}
            </div>

            {compareMode !== "NONE" && (
              <div className="mt-4 flex items-center justify-between border-t border-white/70 pt-3 text-[11px] text-slate-500">
                <span>{getCompareFooterLabel()}</span>
                <span className="font-semibold text-slate-700">{previousValue(item)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
