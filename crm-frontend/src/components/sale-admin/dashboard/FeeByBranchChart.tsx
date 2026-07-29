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
  formatCompactNumber,
  formatMoney,
  toNumber,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import {
  SaAdminBranchFeeChartRow,
  SaAdminDashboardResponse,
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 text-xs shadow-xl backdrop-blur-sm">
      <p className="mb-2 font-bold text-slate-800 border-b border-slate-100 pb-1.5">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-600">{item.name}</span>
            </div>
            <span className="font-bold text-slate-900">{formatMoney(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeeByBranchChart({
  rows = [],
  historyData = [],
  month,
  year,
  periodLabel,
  previousLabel,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  rows?: SaAdminBranchFeeChartRow[];
  historyData?: SaAdminDashboardResponse[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
  previousLabel?: string;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const { chartData, periodKeys } = useMemo(() => {
    const sortedRows = [...(rows || [])]
      .sort((a, b) => toNumber(b.current_fee) - toNumber(a.current_fee))
      .slice(0, 5);

    if (compareMode !== "NONE") {
      const currLabel = (month && year) ? `T${Number(month)}/${year}` : (periodLabel || "Kỳ hiện tại");
      let compLabel = previousLabel || "Kỳ trước";

      if (month && year) {
        if (compareMode === "YOY") {
          compLabel = `T${Number(month)}/${Number(year) - 1}`;
        } else if (compareMode === "QOQ") {
          const prevMonthDate = new Date(Number(year), Number(month) - 2, 1);
          compLabel = `T${prevMonthDate.getMonth() + 1}/${prevMonthDate.getFullYear()}`;
        }
      }

      const keys = [currLabel, compLabel];

      const branchMap = new Map<string, { current: number; previous: number }>();

      sortedRows.forEach((r) => {
        if (r.branch_name) {
          branchMap.set(r.branch_name, {
            current: toNumber(r.current_fee),
            previous: toNumber(r.previous_fee),
          });
        }
      });

      const points = Array.from(branchMap.entries()).map(([branch_name, feeObj]) => ({
        branch_name,
        [currLabel]: feeObj.current,
        [compLabel]: feeObj.previous,
      }));

      return { chartData: points, periodKeys: keys };
    }

    if (!historyData || historyData.length === 0) {
      const currLabel = (month && year) ? `T${Number(month)}/${year}` : (periodLabel || "Kỳ hiện tại");
      const points = sortedRows.map((r) => ({
        branch_name: r.branch_name,
        [currLabel]: toNumber(r.current_fee),
      }));
      return { chartData: points, periodKeys: [currLabel] };
    }

    const pKeysSet = new Set<string>();
    const branchPeriodMap = new Map<string, Record<string, number>>();

    const topBranchNames = new Set(sortedRows.map((r) => r.branch_name));

    historyData.forEach((res) => {
      const label = getGranularityLabelFromResponse(res, granularity);
      pKeysSet.add(label);

      (res.fee_by_branch || []).forEach((r) => {
        if (r.branch_name && (topBranchNames.size === 0 || topBranchNames.has(r.branch_name))) {
          if (!branchPeriodMap.has(r.branch_name)) {
            branchPeriodMap.set(r.branch_name, {});
          }
          const bObj = branchPeriodMap.get(r.branch_name)!;
          bObj[label] = (bObj[label] || 0) + toNumber(r.current_fee);
        }
      });
    });

    const keys = Array.from(pKeysSet);

    const points = Array.from(branchPeriodMap.entries()).map(([branch_name, pMap]) => ({
      branch_name,
      ...pMap,
    }));

    return { chartData: points, periodKeys: keys };
  }, [rows, historyData, compareMode, granularity, month, year, periodLabel, previousLabel]);

  const hasData = chartData.some((point: Record<string, any>) =>
    periodKeys.some((pKey) => (point[pKey] || 0) > 0)
  );

  const granularityDesc = granularity === "QUARTER" ? "theo Quý" : granularity === "YEAR" ? "theo Năm" : "theo Tháng";
  const compareDesc = compareMode === "YOY" ? " (So sánh cùng kỳ YoY)" : compareMode === "QOQ" ? " (So sánh kỳ trước QoQ)" : "";

  return (
    <ExpandableChartCard
      title="Phí theo chi nhánh"
      description={`Báo cáo phí giao dịch của từng Chi nhánh ${granularityDesc}${compareDesc} (Trục X: Chi nhánh, Trục Y: Phí GD VNĐ)`}
      className="h-full"
    >
      {(isExpanded) => (
        <div style={{ width: "100%", height: isExpanded ? "100%" : 380 }}>
          {!hasData ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Chưa có dữ liệu phí theo chi nhánh.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 0, bottom: 28 }}
                barCategoryGap="18%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="branch_name"
                  tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tickFormatter={formatCompactNumber}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} isAnimationActive={false} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  iconType="circle"
                />
                {periodKeys.map((pKey, index) => (
                  <Bar
                    key={pKey}
                    dataKey={pKey}
                    name={pKey}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
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
