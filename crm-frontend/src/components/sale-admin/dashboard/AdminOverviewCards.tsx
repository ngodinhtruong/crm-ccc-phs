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
  branchTotal,
}: {
  items?: SaAdminOverviewMetric[];
  compareMode?: CompareMode;
  granularity?: GranularityMode;
  historyData?: SaAdminDashboardResponse[];
  branchTotal?: any;
}) {
  const displayItems = useMemo(() => {
    if (!historyData || historyData.length === 0 || granularity === "MONTH") {
      return items;
    }

    const metricMap: Record<
      string,
      {
        value: number;
        previous_value: number;
        sa_value: number;
        previous_sa_value: number;
        broker_value: number;
        previous_broker_value: number;
        item: SaAdminOverviewMetric;
      }
    > = {};

    historyData.forEach((res) => {
      const metrics = res.summary_cards || res.overview || [];
      metrics.forEach((m) => {
        if (!metricMap[m.key]) {
          metricMap[m.key] = {
            value: 0,
            previous_value: 0,
            sa_value: 0,
            previous_sa_value: 0,
            broker_value: 0,
            previous_broker_value: 0,
            item: m,
          };
        }
        metricMap[m.key].value += toNumber(m.value);
        metricMap[m.key].previous_value += toNumber(m.previous_value);
        metricMap[m.key].sa_value += toNumber(m.sa_value);
        metricMap[m.key].previous_sa_value += toNumber(m.previous_sa_value);
        metricMap[m.key].broker_value += toNumber(m.broker_value);
        metricMap[m.key].previous_broker_value += toNumber(m.previous_broker_value);
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

      const saVal = aggregated.sa_value;
      const prevSaVal = aggregated.previous_sa_value;
      let saGrowth: number | null = null;
      if (prevSaVal > 0) {
        saGrowth = Number((((saVal - prevSaVal) / prevSaVal) * 100).toFixed(1));
      } else if (saVal > 0) {
        saGrowth = 100;
      } else {
        saGrowth = 0;
      }

      const brokerVal = aggregated.broker_value;
      const prevBrokerVal = aggregated.previous_broker_value;
      let brokerGrowth: number | null = null;
      if (prevBrokerVal > 0) {
        brokerGrowth = Number((((brokerVal - prevBrokerVal) / prevBrokerVal) * 100).toFixed(1));
      } else if (brokerVal > 0) {
        brokerGrowth = 100;
      } else {
        brokerGrowth = 0;
      }

      return {
        ...item,
        value: val,
        previous_value: prev,
        growth_percent: growth,
        sa_value: saVal,
        previous_sa_value: prevSaVal,
        sa_growth_percent: saGrowth,
        broker_value: brokerVal,
        previous_broker_value: prevBrokerVal,
        broker_growth_percent: brokerGrowth,
      };
    });
  }, [items, historyData, granularity]);

  const getShortCompareLabel = () => {
    if (compareMode === "YOY") return "YoY";
    if (compareMode === "QOQ") {
      if (granularity === "QUARTER") return "QoQ";
      if (granularity === "YEAR") return "YoY";
      return "MoM";
    }
    return "";
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {displayItems.map((item) => {
        const theme = getMetricTheme(item.key);

        let saVal: number | string | undefined = item.sa_value;
        let prevSaVal: number | string | null | undefined = item.previous_sa_value;
        let saGrowth: number | null | undefined = item.sa_growth_percent;

        let brokerVal: number | string | undefined = item.broker_value;
        let prevBrokerVal: number | string | null | undefined = item.previous_broker_value;
        let brokerGrowth: number | null | undefined = item.broker_growth_percent;

        if (item.key === "transaction_value") {
          if (saVal === undefined && branchTotal?.sa_transaction_value !== undefined) {
            saVal = branchTotal.sa_transaction_value;
          }
          if (brokerVal === undefined && branchTotal?.broker_transaction_value !== undefined) {
            brokerVal = branchTotal.broker_transaction_value;
          }
        } else if (item.key === "transaction_fee") {
          if (saVal === undefined && branchTotal?.sa_transaction_fee !== undefined) {
            saVal = branchTotal.sa_transaction_fee;
          }
          if (brokerVal === undefined && branchTotal?.broker_transaction_fee !== undefined) {
            brokerVal = branchTotal.broker_transaction_fee;
          }
        }

        if (saGrowth === undefined && saVal !== undefined && prevSaVal !== undefined) {
          const sVal = toNumber(saVal);
          const pSaVal = toNumber(prevSaVal);
          if (pSaVal > 0) {
            saGrowth = Number((((sVal - pSaVal) / pSaVal) * 100).toFixed(1));
          } else if (sVal > 0) {
            saGrowth = 100;
          } else {
            saGrowth = 0;
          }
        }

        if (brokerGrowth === undefined && brokerVal !== undefined && prevBrokerVal !== undefined) {
          const bVal = toNumber(brokerVal);
          const pBVal = toNumber(prevBrokerVal);
          if (pBVal > 0) {
            brokerGrowth = Number((((bVal - pBVal) / pBVal) * 100).toFixed(1));
          } else if (bVal > 0) {
            brokerGrowth = 100;
          } else {
            brokerGrowth = 0;
          }
        }

        const hasSubBreakdown =
          (item.key === "transaction_value" || item.key === "transaction_fee") &&
          (saVal !== undefined || brokerVal !== undefined);

        return (
          <div
            key={item.key}
            className={`group relative overflow-hidden rounded-lg border ${theme.border} ${theme.bg} p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${theme.accent}`} />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${theme.iconBg}`}>
                  <MetricIcon type={theme.icon} />
                </span>
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
              </div>

              {compareMode !== "NONE" && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1 ${getGrowthClass(
                    item.growth_percent
                  )}`}
                >
                  <GrowthIcon value={item.growth_percent} />
                  {formatPercent(item.growth_percent)}
                </span>
              )}
            </div>

            {/* Total value row with right-aligned MoM */}
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <span className={`text-2xl font-bold leading-none ${theme.value}`}>
                {formatMetricValue(item)}
              </span>

              {compareMode !== "NONE" && (
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap text-right">
                  {getShortCompareLabel()}: {previousValue(item)}
                </span>
              )}
            </div>

            {hasSubBreakdown && (
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                {/* SA */}
                <div className="flex items-center gap-1 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">SA:</span>
                  <span className="font-extrabold text-slate-800 truncate">
                    {formatMetricValue({ ...item, value: saVal ?? 0 })}
                  </span>
                  {compareMode !== "NONE" && saGrowth !== null && saGrowth !== undefined && (
                    <span
                      className={`shrink-0 text-[10px] font-bold ${
                        saGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      ({saGrowth >= 0 ? "+" : ""}{formatPercent(saGrowth)})
                    </span>
                  )}
                </div>

                <div className="h-3 w-px bg-slate-200 shrink-0" />

                {/* Môi giới */}
                <div className="flex items-center gap-1 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">MG:</span>
                  <span className="font-extrabold text-slate-800 truncate">
                    {formatMetricValue({ ...item, value: brokerVal ?? 0 })}
                  </span>
                  {compareMode !== "NONE" && brokerGrowth !== null && brokerGrowth !== undefined && (
                    <span
                      className={`shrink-0 text-[10px] font-bold ${
                        brokerGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      ({brokerGrowth >= 0 ? "+" : ""}{formatPercent(brokerGrowth)})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
