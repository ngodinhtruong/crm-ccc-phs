"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ExpandableChartCard } from "@/components/common";
import {
  CHART_COLORS,
  formatNumber,
  toNumber,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import {
  SaAdminDashboardResponse,
  SaAdminIcpDistributionRow,
} from "@/types/sale-admin-dashboard.type";
import { GranularityMode, CompareMode } from "@/components/tickets/dashboard/CccDashboardUtils";

function getGranularityLabelFromResponse(res: SaAdminDashboardResponse, granularity: GranularityMode = "MONTH"): string {
  const year = res.period?.year || (res.period?.date_from ? new Date(res.period.date_from).getFullYear() : null);
  const month = res.period?.month || (res.period?.date_from ? new Date(res.period.date_from).getMonth() + 1 : null);

  if (granularity === "QUARTER" && month && year) {
    const q = Math.floor((Number(month) - 1) / 3) + 1;
    return `Q${q}/${year}`;
  }

  if (granularity === "YEAR" && year) {
    return `${year}`;
  }

  if (month && year) {
    return `T${Number(month)}/${year}`;
  }

  if (res.period?.label) {
    const match = String(res.period.label).match(/(\d{4})[-/](\d{1,2})/) || String(res.period.label).match(/(\d{1,2})[-/](\d{4})/);
    if (match) {
      if (match[1].length === 4) return `T${Number(match[2])}/${match[1]}`;
      return `T${Number(match[1])}/${match[2]}`;
    }
    return res.period.label;
  }

  return "—";
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum: number, item: any) => sum + toNumber(item.value), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 text-xs shadow-xl backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 font-bold text-slate-800">
        <span>{label}</span>
        <span className="text-[#0097cf]">Tổng: {formatNumber(total)} KH</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((item: any) => {
          const pct = total > 0 ? ((toNumber(item.value) / total) * 100).toFixed(1) : "0";
          return (
            <div key={item.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-slate-600">{item.name}</span>
              </div>
              <span className="font-bold text-slate-900">
                {formatNumber(item.value)} KH ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IcpDistributionChart({
  rows = [],
  historyData = [],
  month,
  year,
  periodLabel,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  rows?: SaAdminIcpDistributionRow[];
  historyData?: SaAdminDashboardResponse[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const { chartData, icpKeys } = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      const currLabel = (month && year) ? `T${Number(month)}/${year}` : (periodLabel || "Kỳ hiện tại");
      const singlePoint: Record<string, any> = {
        monthLabel: currLabel,
      };
      const keys = rows.map((r) => r.label);
      rows.forEach((r) => {
        singlePoint[r.label] = toNumber(r.count);
      });
      return {
        chartData: [singlePoint],
        icpKeys: keys,
      };
    }

    const allIcpLabels = new Set<string>();
    historyData.forEach((res) => {
      (res.icp_distribution || []).forEach((row) => {
        if (row.label) allIcpLabels.add(row.label);
      });
    });

    const keys = Array.from(allIcpLabels);

    const pointsMap = new Map<string, Record<string, number>>();

    historyData.forEach((res) => {
      const label = getGranularityLabelFromResponse(res, granularity);
      if (!pointsMap.has(label)) {
        pointsMap.set(label, {});
      }
      const currentObj = pointsMap.get(label)!;
      keys.forEach((icpLabel) => {
        const found = (res.icp_distribution || []).find((i) => i.label === icpLabel);
        const cnt = found ? toNumber(found.count) : 0;
        currentObj[icpLabel] = (currentObj[icpLabel] || 0) + cnt;
      });
    });

    const points = Array.from(pointsMap.entries()).map(([monthLabel, icpMap]) => ({
      monthLabel,
      ...icpMap,
    }));

    return {
      chartData: points,
      icpKeys: keys,
    };
  }, [historyData, rows, month, year, periodLabel, granularity]);

  const hasData = chartData.some((point: Record<string, any>) =>
    icpKeys.some((key) => (point[key] || 0) > 0)
  );

  const granularityDesc = granularity === "QUARTER" ? "theo Quý" : granularity === "YEAR" ? "theo Năm" : "theo Tháng";
  const compareDesc = compareMode === "YOY" ? " (So sánh cùng kỳ YoY)" : compareMode === "QOQ" ? " (So sánh kỳ trước QoQ)" : "";

  return (
    <ExpandableChartCard
      title="Tỷ lệ Tiềm năng / Không TN"
      description={`Biến động cơ cấu phân bổ khách hàng theo ICP ${granularityDesc}${compareDesc}`}
      className="h-full"
    >
      {(isExpanded) => (
        <div style={{ width: "100%", height: isExpanded ? "100%" : 380 }}>
          {!hasData ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Chưa có dữ liệu ICP.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 0, bottom: 12 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatNumber}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} isAnimationActive={false} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
                {icpKeys.map((icpLabel, index) => (
                  <Bar
                    key={icpLabel}
                    dataKey={icpLabel}
                    name={icpLabel}
                    stackId="icpStack"
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    radius={index === icpKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={56}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </ExpandableChartCard>
  );
}
