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
  SaAdminTopEmployeeRow,
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
            <span className="font-bold text-slate-900">{formatNumber(item.value)} TK</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopEmployeeChart({
  rows = [],
  historyData = [],
  month,
  year,
  periodLabel,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  rows?: SaAdminTopEmployeeRow[];
  historyData?: SaAdminDashboardResponse[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const { chartData, topEmployees } = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      const fallbackEmployees = rows.slice(0, 5).map((r) => r.employee_name);
      const currLabel = (month && year) ? `T${Number(month)}/${year}` : (periodLabel || "Kỳ hiện tại");
      const singlePoint: Record<string, any> = {
        monthLabel: currLabel,
      };
      rows.slice(0, 5).forEach((r) => {
        singlePoint[r.employee_name] = toNumber(r.reactivated_accounts);
      });
      return {
        chartData: [singlePoint],
        topEmployees: fallbackEmployees,
      };
    }

    const employeeTotals: Record<string, number> = {};
    historyData.forEach((res) => {
      (res.top_employees || []).forEach((row) => {
        if (row.employee_name) {
          employeeTotals[row.employee_name] =
            (employeeTotals[row.employee_name] || 0) + toNumber(row.reactivated_accounts);
        }
      });
    });

    const topNames = Object.entries(employeeTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const pointsMap = new Map<string, Record<string, number>>();

    historyData.forEach((res) => {
      const label = getGranularityLabelFromResponse(res, granularity);
      if (!pointsMap.has(label)) {
        pointsMap.set(label, {});
      }
      const currentObj = pointsMap.get(label)!;
      topNames.forEach((empName) => {
        const found = (res.top_employees || []).find((e) => e.employee_name === empName);
        const accVal = found ? toNumber(found.reactivated_accounts) : 0;
        currentObj[empName] = (currentObj[empName] || 0) + accVal;
      });
    });

    const points = Array.from(pointsMap.entries()).map(([monthLabel, empMap]) => ({
      monthLabel,
      ...empMap,
    }));

    return {
      chartData: points,
      topEmployees: topNames,
    };
  }, [historyData, rows, month, year, periodLabel, granularity]);

  const hasData = chartData.some((point: Record<string, any>) =>
    topEmployees.some((eName) => (point[eName] || 0) > 0)
  );

  const granularityDesc = granularity === "QUARTER" ? "theo Quý" : granularity === "YEAR" ? "theo Năm" : "theo Tháng";
  const compareDesc = compareMode === "YOY" ? " (So sánh cùng kỳ YoY)" : compareMode === "QOQ" ? " (So sánh kỳ trước QoQ)" : "";

  return (
    <ExpandableChartCard
      title="Số TK kích hoạt theo NV"
      description={`Thống kê số lượng tài khoản kích hoạt thành công theo nhân viên ${granularityDesc}${compareDesc}`}
      className="h-full"
    >
      {(isExpanded) => (
        <div style={{ width: "100%", height: isExpanded ? "100%" : 380 }}>
          {!hasData ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Chưa có dữ liệu nhân viên kích hoạt.
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
                {topEmployees.map((empName, index) => (
                  <Bar
                    key={empName}
                    dataKey={empName}
                    name={empName}
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
