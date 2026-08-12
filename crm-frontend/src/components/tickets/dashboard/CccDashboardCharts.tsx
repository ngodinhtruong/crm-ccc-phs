"use client";

import { memo, useMemo, useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import {
  ExpandableChartCard as ChartCard,
} from "@/components/common";
import { LazyDashboardSection } from "./LazyDashboardSection";
import {
  CccDashboardCharts as CccCharts,
  CccDashboardReportTimeCategoryItem,
} from "@/types/ccc-dashboard.type";
import {
  ChartViewMode,
  GranularityMode,
  CompareMode,
  aggregateTotalOverall,
  formatDays,
  formatNumber,
  getMonthLabel,
  pivot100PercentStacked,
  rootCauseLabel,
  parsePeriodDate,
  getQuarterLabel,
  getYearLabel,
  calculateGrowthRate,
} from "./CccDashboardUtils";

const COLORS = [
  "#10b981", // Bright Cool Emerald Green
  "#10b981", // Emerald Green
  "#f59e0b", // Amber / Warm Yellow
  "#ef4444", // Rose / Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#0f766e", // Teal
  "#7c3aed", // Violet
  "#64748b", // Slate
  "#dc2626", // Dark Red
];

function EmptyChartAxisPlaceholder({
  message = "Không có dữ liệu trong khoảng thời gian này",
  height = 220,
  type = "bar",
  categories = ["T4/2026", "T5/2026", "T6/2026", "T7/2026", "T8/2026"],
}: {
  message?: string;
  height?: number;
  type?: "bar" | "horizontal" | "line";
  categories?: string[];
}) {
  const dummyData = categories.map((cat) => ({
    name: cat,
    value: 0,
  }));

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "horizontal" ? (
          <BarChart layout="vertical" data={dummyData} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, 10]} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={85} />
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={dummyData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, 10]} />
          </LineChart>
        ) : (
          <BarChart data={dummyData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, 10]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="rounded-xl border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-500 shadow-2xs backdrop-blur-xs">
          {message}
        </span>
      </div>
    </div>
  );
}

function getDashboardAvailableMonths(charts: CccCharts): string[] {
  const months = new Set<string>();

  (charts.report_monthly_processing || []).forEach((item) => {
    const label = getMonthLabel(item);
    if (label) months.add(label);
  });

  (charts.report_source || []).forEach((item) => {
    const label = item.month_label || item.period_label || String(item.month_key || "");
    if (label) months.add(label);
  });

  (charts.report_category || []).forEach((item) => {
    const label = item.month_label || item.period_label || String(item.month_key || "");
    if (label) months.add(label);
  });

  (charts.report_unit || []).forEach((item) => {
    if (item.month_label) months.add(item.month_label);
  });

  if (charts.report_sla?.monthly) {
    charts.report_sla.monthly.forEach((item) => {
      if (item.month_label) months.add(item.month_label);
    });
  }

  return Array.from(months);
}

function isSameMonth(item: any, selectedMonth: string): boolean {
  if (!selectedMonth) return true;
  const target = selectedMonth.trim().toLowerCase();

  const candidateLabels = [
    item.month_label,
    item.period_label,
    item.month_key,
    item.month_str,
    item.month,
    getMonthLabel(item),
  ].filter(Boolean).map((s) => String(s).trim().toLowerCase());

  return candidateLabels.some((lbl) => lbl === target || lbl.includes(target) || target.includes(lbl));
}



function ValueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      {label && <div className="mb-1.5 font-bold text-slate-800">{label}</div>}
      <div className="space-y-1">
        {payload.map((item: any, index: number) => (
          <div key={`${item.dataKey || item.name}-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-slate-600">{item.name}</span>
            </div>
            <span className="font-bold text-slate-900">
              {typeof item.value === "number" ? formatNumber(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PercentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      {label && <div className="mb-1.5 font-bold text-slate-800">{label}</div>}
      <div className="space-y-1">
        {payload.map((item: any, index: number) => {
          const name = item.name || item.dataKey;
          const rawVal = item.payload?.[`${name}_raw`];
          return (
            <div key={`${name}-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                <span className="text-slate-600">{name}</span>
              </div>
              <span className="font-bold text-slate-900">
                {item.value}% {rawVal !== undefined ? `(${formatNumber(rawVal)} ticket)` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DaysTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      {label && <div className="mb-1.5 font-bold text-slate-800">{label}</div>}
      <div className="space-y-1">
        {payload.map((item: any, index: number) => (
          <div key={`${item.dataKey || item.name}-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-slate-600">{item.name}</span>
            </div>
            <span className="font-bold text-slate-900">{formatDays(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isEmpty(items?: unknown[]) {
  return !items || items.length === 0;
}

function getSourceName(item: any) {
  return item.source_name || item.source__source_name || "Chưa có nguồn";
}

function getCategoryName(item: any) {
  return item.category_name || item.support_category__category_name || "Chưa có danh mục";
}

function pivotByMonth<T>(
  items: T[],
  getDimension: (item: T) => string,
  getMonth: (item: T) => string,
  getValue: (item: T) => number
) {
  const dimensions = Array.from(new Set(items.map(getDimension))).filter(Boolean);
  const map = new Map<string, Record<string, number | string>>();

  for (const item of items) {
    const month = getMonth(item);
    const dimension = getDimension(item);
    const value = getValue(item);

    if (!map.has(month)) {
      map.set(month, { month });
    }

    map.get(month)![dimension] = Number(map.get(month)![dimension] || 0) + value;
  }

  return {
    dimensions,
    rows: Array.from(map.values()),
  };
}

function getPeriodLabelFromItem(item: any, granularity: GranularityMode): string {
  const rawKey = item.month_key || item.period_label || item.month_label || item.month_str || item.month || "";
  const parsedDate = parsePeriodDate(rawKey);

  if (granularity === "QUARTER" && parsedDate) {
    return getQuarterLabel(parsedDate);
  }
  if (granularity === "YEAR" && parsedDate) {
    return getYearLabel(parsedDate);
  }
  return getMonthLabel(item);
}

function aggregateMonthlyDataByGranularity(
  rawList: any[],
  granularity: GranularityMode,
  compareMode: CompareMode
) {
  const periodMap = new Map<string, { label: string; total: number; processed: number; cancelled: number; sortKey: string }>();

  for (const item of rawList) {
    const label = getPeriodLabelFromItem(item, granularity);
    const rawKey = item.month_key || item.period_label || item.month_label || item.month_str || item.month || "";

    if (!periodMap.has(label)) {
      periodMap.set(label, { label, total: 0, processed: 0, cancelled: 0, sortKey: String(rawKey) });
    }

    const rec = periodMap.get(label)!;
    rec.total += item.total || 0;
    rec.processed += item.processed ?? item.resolved ?? 0;
    rec.cancelled += item.cancelled || 0;
  }

  const periodList = Array.from(periodMap.values());

  if (compareMode === "NONE" && granularity === "MONTH") {
    return periodList.map((p) => ({
      ...p,
      growth_processed: null as number | null,
    }));
  }

  return periodList.map((p, index) => {
    let compareItem: typeof p | undefined;
    if (compareMode === "QOQ" && index > 0) {
      compareItem = periodList[index - 1];
    } else if (compareMode === "YOY") {
      const parts = p.label.split("/");
      if (parts.length === 2) {
        const year = parseInt(parts[1], 10);
        if (!isNaN(year)) {
          const targetPrevLabel = `${parts[0]}/${year - 1}`;
          compareItem = periodList.find((x) => x.label === targetPrevLabel);
        }
      }
    }

    const compareProcessed = compareItem ? compareItem.processed : 0;
    const growthProcessed = compareItem ? calculateGrowthRate(p.processed, compareProcessed) : null;

    return {
      ...p,
      compare_label: compareItem ? compareItem.label : "",
      compare_processed: compareProcessed,
      growth_processed: growthProcessed,
    };
  });
}

/* ====================================================================
 * 1. TỔNG QUAN KẾT QUẢ TICKET
 * ==================================================================== */
function TicketResultChartCard({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const rawMonthly = useMemo(() => {
    return (charts.report_monthly_processing || []).map((item) => ({
      ...item,
      label: getMonthLabel(item),
      processed: item.processed ?? item.resolved ?? 0,
      cancelled: item.cancelled ?? 0,
      total: item.total ?? 0,
    }));
  }, [charts.report_monthly_processing]);

  const chartData = useMemo(() => {
    return aggregateMonthlyDataByGranularity(rawMonthly, granularity, compareMode);
  }, [rawMonthly, granularity, compareMode]);

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const monthItem = rawMonthly.find((d) => isSameMonth(d, selectedMonth));
    if (!monthItem) return [];
    return [
      { name: "Ticket đã xử lý", value: monthItem.processed, color: "#10b981" },
      { name: "Spam / Đã hủy", value: monthItem.cancelled, color: "#ef4444" },
    ];
  }, [rawMonthly, selectedMonth]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  const isAggregatedOrCompared = granularity !== "MONTH";
  const periodLabelText = granularity === "QUARTER" ? "theo Quý" : granularity === "YEAR" ? "theo Năm" : "theo Tháng";
  const compareLabelText = compareMode === "YOY" ? " (So sánh YoY)" : "";

  if (isEmpty(rawMonthly)) {
    return (
      <div className="space-y-4">
        <ChartCard
          title={`Xu hướng & Kết quả xử lý Ticket ${periodLabelText}${compareLabelText}`}
          description="Biểu đồ xu hướng tổng sản lượng ticket tiếp nhận và xử lý qua các kỳ"
        >
          <EmptyChartAxisPlaceholder message="Không có dữ liệu kết quả xử lý ticket trong kỳ." />
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <ChartCard
        title={
          selectedMonth
            ? `Kết quả xử lý Ticket - ${selectedMonth}`
            : `Xu hướng & Kết quả xử lý Ticket ${periodLabelText}${compareLabelText}`
        }
        description={
          selectedMonth
            ? "Nhấp đúp hoặc bấm nút 'Quay lại' để xem xu hướng tất cả các kỳ"
            : isAggregatedOrCompared
            ? "Biểu đồ cột ghép nhóm so sánh sản lượng ticket xử lý giữa các kỳ"
            : "Nhấp đúp vào cột tháng bất kỳ để xem biểu đồ Donut chi tiết của tháng đó"
        }
        headerRight={
          selectedMonth ? (
            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#059669] hover:bg-emerald-100 ring-1 ring-emerald-200 transition-all shadow-2xs"
            >
              ← Quay lại các kỳ
            </button>
          ) : undefined
        }
      >
        {(isExpanded) => (
          <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
            <ResponsiveContainer width="100%" height="100%">
              {selectedMonth ? (
                <PieChart onDoubleClick={() => setSelectedMonth(null)}>
                  <Pie
                    data={monthDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    isAnimationActive={false}
                    label={({ name, value, percent }) =>
                      percent && percent >= 0.02 ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)` : ""
                    }
                  >
                    {monthDonutData.map((entry, index) => (
                      <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ValueTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value: string, entry: any) => {
                      const item = entry.payload;
                      const total = monthDonutData.reduce((acc, curr) => acc + curr.value, 0);
                      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                      return `${value}: ${formatNumber(item.value)} (${pct}%)`;
                    }}
                  />
                </PieChart>
              ) : isAggregatedOrCompared ? (
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ValueTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="processed" name="Đã xử lý (Kỳ này)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false}>
                    <LabelList dataKey="processed" position="top" style={{ fontSize: 10, fill: '#10b981', fontWeight: 700 }} formatter={(val: any) => (val && Number(val) > 0 ? formatNumber(Number(val)) : "")} />
                  </Bar>
                  {compareMode === "YOY" && (
                    <Bar dataKey="compare_processed" name="Đã xử lý (Cùng kỳ năm trước)" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false}>
                      <LabelList dataKey="compare_processed" position="top" style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} formatter={(val: any) => (val ? formatNumber(Number(val)) : "")} />
                    </Bar>
                  )}
                  <Bar dataKey="cancelled" name="Spam / Đã hủy" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false}>
                    <LabelList dataKey="cancelled" position="top" style={{ fontSize: 10, fill: '#ef4444', fontWeight: 700 }} formatter={(val: any) => (val && Number(val) > 0 ? formatNumber(Number(val)) : "")} />
                  </Bar>
                </BarChart>
              ) : (
                <ComposedChart
                  data={chartData}
                  onDoubleClick={handleChartClick}
                  onClick={handleChartClick}
                  className="cursor-pointer"
                >
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ValueTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="total" name="Tổng ticket tiếp nhận" fill="url(#totalGradient)" stroke="#10b981" strokeWidth={2} isAnimationActive={false} />
                  <Bar dataKey="processed" name="Đã xử lý" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false}>
                    <LabelList
                      dataKey="processed"
                      position="top"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (!value && value !== 0) return null;
                        const numText = formatNumber(value);
                        const cx = Number(x) + Number(width) / 2;
                        const cy = Number(y) - 6;
                        return (
                          <g className="pointer-events-none">
                            <text
                              x={cx}
                              y={cy}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={4}
                              strokeLinejoin="round"
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={800}
                            >
                              {numText}
                            </text>
                            <text
                              x={cx}
                              y={cy}
                              fill="#059669"
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={800}
                            >
                              {numText}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Bar>
                  <Bar dataKey="cancelled" name="Spam / Đã hủy" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false}>
                    <LabelList
                      dataKey="cancelled"
                      position="top"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (!value && value !== 0) return null;
                        const numText = formatNumber(value);
                        const cx = Number(x) + Number(width) / 2;
                        const cy = Number(y) - 6;
                        return (
                          <g className="pointer-events-none">
                            <text
                              x={cx}
                              y={cy}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={4}
                              strokeLinejoin="round"
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={800}
                            >
                              {numText}
                            </text>
                            <text
                              x={cx}
                              y={cy}
                              fill="#dc2626"
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={800}
                            >
                              {numText}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Bar>
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

/* ====================================================================
 * 2. PHÂN TÍCH THEO NGUỒN TIẾP NHẬN
 * ==================================================================== */
function SourceDonutChartCard({
  items,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  items: any[];
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const chartData = useMemo(() => {
    const raw = aggregateTotalOverall(items, getSourceName, (item) => (item.processed ?? item.resolved ?? 0) + (item.cancelled || 0));
    const totalSum = raw.reduce((acc, curr) => acc + curr.value, 0);
    return raw
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        pct: totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : "0",
      }));
  }, [items]);

  const totalSum = useMemo(() => chartData.reduce((acc, curr) => acc + curr.value, 0), [chartData]);

  if (isEmpty(chartData)) {
    return (
      <ChartCard
        title="Tỷ trọng Ticket theo Nguồn"
        description="Xếp hạng cơ cấu tổng lượng ticket từ các kênh tiếp nhận"
        className="xl:col-span-5"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo nguồn" type="horizontal" categories={["Web", "App", "Hotline", "Email"]} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Tỷ trọng Ticket theo Nguồn"
      description="Xếp hạng cơ cấu tổng lượng ticket từ các kênh tiếp nhận"
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ left: 10, right: 55, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={80} />
              <Tooltip content={<ValueTooltip />} />
              <Bar dataKey="value" name="Số lượng ticket" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }}
                  formatter={(val: any) => {
                    const pct = totalSum > 0 ? ((Number(val) / totalSum) * 100).toFixed(1) : "0";
                    return val ? `${formatNumber(val)} (${pct}%)` : "";
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function SourceTrendChartCard({
  items,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  items: any[];
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");

  const pivotData = useMemo(() => {
    const periodMap = new Map<string, string>();
    for (const item of items) {
      const label = getPeriodLabelFromItem(item, granularity);
      if (label) periodMap.set(label, label);
    }

    const recentPeriodLabels = Array.from(periodMap.keys()).slice(-5);

    const sourceMap = new Map<string, Record<string, any>>();
    for (const item of items) {
      const periodLabel = getPeriodLabelFromItem(item, granularity);
      if (!recentPeriodLabels.includes(periodLabel)) continue;

      const source = getSourceName(item);
      const value = item.processed ?? item.resolved ?? 0;

      if (!sourceMap.has(source)) {
        sourceMap.set(source, { source });
      }
      const record = sourceMap.get(source)!;
      record[periodLabel] = (record[periodLabel] || 0) + value;
    }

    return {
      monthDimensions: recentPeriodLabels,
      rows: Array.from(sourceMap.values()),
    };
  }, [items, granularity]);

  const displayedMonths = useMemo(() => {
    if (selectedMonth === "ALL") return pivotData.monthDimensions;
    return pivotData.monthDimensions.filter((m) => m === selectedMonth);
  }, [selectedMonth, pivotData.monthDimensions]);

  if (isEmpty(pivotData.rows)) {
    return (
      <ChartCard
        title="Phân bổ Ticket đã xử lý theo Nguồn"
        description="Trục hoành: Nguồn tiếp nhận | Trục tung: Số lượng ticket (5 cột tháng nhóm cho mỗi nguồn)"
        className="xl:col-span-7"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu phân bổ theo nguồn" type="bar" categories={["Web", "App", "Hotline", "Email"]} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Phân bổ Ticket đã xử lý theo Nguồn"
      description="Trục hoành: Nguồn tiếp nhận | Trục tung: Số lượng ticket (5 cột tháng nhóm cho mỗi nguồn)"
      headerRight={
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Xem tháng:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
          >
            <option value="ALL">5 tháng gần nhất (5 cột / nguồn)</option>
            {pivotData.monthDimensions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pivotData.rows}
              margin={{ left: 10, right: 20, top: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="source" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {displayedMonths.map((month, index) => {
                const monthIndexInAll = pivotData.monthDimensions.indexOf(month);
                const color = COLORS[monthIndexInAll % COLORS.length];
                return (
                  <Bar
                    key={month}
                    dataKey={month}
                    name={month}
                    fill={color}
                    radius={[4, 4, 0, 0]}
                    barSize={displayedMonths.length === 1 ? 28 : undefined}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey={month}
                      position="top"
                      style={{ fontSize: 10, fill: color, fontWeight: 700 }}
                      formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                    />
                  </Bar>
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function SourceAnalysisCharts({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const items = charts.report_source || [];

  return (
    <>
      <SourceDonutChartCard items={items} globalViewMode={globalViewMode} />
      <SourceTrendChartCard items={items} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
    </>
  );
}

/* ====================================================================
 * 3. PHÂN TÍCH THEO DANH MỤC
 * ==================================================================== */
function CategoryProcessedChartCard({
  items,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  items: any[];
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const processedPivot = useMemo(
    () =>
      pivotByMonth(
        items,
        getCategoryName,
        (i) => getPeriodLabelFromItem(i, granularity),
        (i) => i.processed ?? i.resolved ?? 0
      ),
    [items, granularity]
  );

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const filtered = items.filter((i) => isSameMonth(i, selectedMonth));
    return aggregateTotalOverall(filtered, getCategoryName, (item) => item.processed ?? item.resolved ?? 0);
  }, [items, selectedMonth]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  if (isEmpty(processedPivot.rows)) {
    return (
      <ChartCard
        title={`Ticket đã xử lý theo Danh mục ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`}
        description="Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo danh mục" type="bar" height={340} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Tỷ trọng Ticket đã xử lý - ${selectedMonth}`
          : `Ticket đã xử lý theo Danh mục ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các kỳ"
          : "Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các kỳ
          </button>
        ) : undefined
      }
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            {selectedMonth ? (
              <PieChart onDoubleClick={() => setSelectedMonth(null)}>
                <Pie
                  data={monthDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  isAnimationActive={false}
                  label={({ name, value, percent }) =>
                    percent && percent >= 0.02 ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)` : ""
                  }
                >
                  {monthDonutData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ValueTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string, entry: any) => {
                    const item = entry.payload;
                    const total = monthDonutData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                    return `${value}: ${formatNumber(item.value)} (${pct}%)`;
                  }}
                />
              </PieChart>
            ) : (
              <BarChart
                data={processedPivot.rows}
                onDoubleClick={handleChartClick}
                onClick={handleChartClick}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {processedPivot.dimensions.map((dimension, index) => (
                  <Bar key={dimension} dataKey={dimension} name={dimension} stackId="processed" fill={COLORS[index % COLORS.length]} isAnimationActive={false}>
                    <LabelList dataKey={dimension} position="center" style={{ fontSize: 9, fill: "#ffffff", fontWeight: 700 }} formatter={(val: any) => (val && Number(val) > 0 ? val : "")} />
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function CategoryCancelledChartCard({
  items,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  items: any[];
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const cancelledPivot = useMemo(
    () =>
      pivotByMonth(
        items,
        getCategoryName,
        (i) => getPeriodLabelFromItem(i, granularity),
        (i) => i.cancelled || 0
      ),
    [items, granularity]
  );

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const filtered = items.filter((i) => isSameMonth(i, selectedMonth));
    return aggregateTotalOverall(filtered, getCategoryName, (item) => item.cancelled || 0);
  }, [items, selectedMonth]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  if (isEmpty(cancelledPivot.rows)) {
    return (
      <ChartCard
        title={`Spam / Đã hủy theo Danh mục ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`}
        description="Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo danh mục" type="bar" height={340} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Tỷ trọng Spam / Đã hủy - ${selectedMonth}`
          : `Spam / Đã hủy theo Danh mục ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các kỳ"
          : "Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các kỳ
          </button>
        ) : undefined
      }
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            {selectedMonth ? (
              <PieChart onDoubleClick={() => setSelectedMonth(null)}>
                <Pie
                  data={monthDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  isAnimationActive={false}
                  label={({ name, value, percent }) =>
                    percent && percent >= 0.02 ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)` : ""
                  }
                >
                  {monthDonutData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ValueTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string, entry: any) => {
                    const item = entry.payload;
                    const total = monthDonutData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                    return `${value}: ${formatNumber(item.value)} (${pct}%)`;
                  }}
                />
              </PieChart>
            ) : (
              <BarChart
                data={cancelledPivot.rows}
                onDoubleClick={handleChartClick}
                onClick={handleChartClick}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {cancelledPivot.dimensions.map((dimension, index) => (
                  <Bar key={dimension} dataKey={dimension} name={dimension} stackId="cancelled" fill={COLORS[index % COLORS.length]} isAnimationActive={false}>
                    <LabelList dataKey={dimension} position="center" style={{ fontSize: 9, fill: "#ffffff", fontWeight: 700 }} formatter={(val: any) => (val && Number(val) > 0 ? val : "")} />
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function CategoryAnalysisCharts({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const items = charts.report_category || [];
  if (isEmpty(items)) {
    return (
      <>
        <ChartCard
          title="Ticket đã xử lý theo Danh mục"
          description="Cơ cấu phân bổ ticket xử lý theo các nhóm danh mục"
        >
          <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo danh mục." height={220} />
        </ChartCard>
        <ChartCard
          title="Spam / Đã hủy theo Danh mục"
          description="Cơ cấu phân bổ ticket bị hủy / spam theo các nhóm danh mục"
        >
          <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo danh mục." height={220} />
        </ChartCard>
      </>
    );
  }

  return (
    <>
      <CategoryProcessedChartCard items={items} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
      <CategoryCancelledChartCard items={items} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
    </>
  );
}

/* ====================================================================
 * 4. PHÂN TÍCH ĐƠN VỊ XỬ LÝ
 * ==================================================================== */
function aggregateUnitDataByGranularity(items: any[], granularity: GranularityMode) {
  const map = new Map<string, { month_label: string; cs_processed: number; related_processed: number; cs_cancelled: number; related_cancelled: number }>();

  for (const item of items) {
    const label = getPeriodLabelFromItem(item, granularity);
    if (!map.has(label)) {
      map.set(label, {
        month_label: label,
        cs_processed: 0,
        related_processed: 0,
        cs_cancelled: 0,
        related_cancelled: 0,
      });
    }
    const rec = map.get(label)!;
    rec.cs_processed += item.cs_processed || 0;
    rec.related_processed += item.related_processed || 0;
    rec.cs_cancelled += item.cs_cancelled || 0;
    rec.related_cancelled += item.related_cancelled || 0;
  }

  return Array.from(map.values());
}

function UnitProcessedChartCard({
  items,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  items: any[];
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const aggregatedItems = useMemo(() => aggregateUnitDataByGranularity(items, granularity), [items, granularity]);

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const item = aggregatedItems.find((i) => isSameMonth(i, selectedMonth));
    if (!item) return [];
    return [
      { name: "TT.CSKH trực tiếp xử lý", value: item.cs_processed || 0, color: "#10b981" },
      { name: "Chuyển PBLQ phối hợp", value: item.related_processed || 0, color: "#f59e0b" },
    ];
  }, [aggregatedItems, selectedMonth]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  if (isEmpty(aggregatedItems)) {
    return (
      <ChartCard
        title={`Ticket đã xử lý theo Đơn vị ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`}
        description="Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo đơn vị xử lý" type="bar" height={310} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Ticket đã xử lý theo Đơn vị - ${selectedMonth}`
          : `Ticket đã xử lý theo Đơn vị ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các kỳ"
          : "Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các kỳ
          </button>
        ) : undefined
      }
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            {selectedMonth ? (
              <PieChart onDoubleClick={() => setSelectedMonth(null)}>
                <Pie
                  data={monthDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  isAnimationActive={false}
                  label={({ name, value, percent }) =>
                    percent && percent >= 0.02 ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)` : ""
                  }
                >
                  {monthDonutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ValueTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string, entry: any) => {
                    const item = entry.payload;
                    const total = monthDonutData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                    return `${value}: ${formatNumber(item.value)} (${pct}%)`;
                  }}
                />
              </PieChart>
            ) : (
              <BarChart
                data={aggregatedItems}
                onDoubleClick={handleChartClick}
                onClick={handleChartClick}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month_label" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cs_processed" name="TT.CSKH trực tiếp xử lý" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="cs_processed" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="related_processed" name="Chuyển PBLQ phối hợp" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="related_processed" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function UnitCancelledChartCard({
  items,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  items: any[];
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const aggregatedItems = useMemo(() => aggregateUnitDataByGranularity(items, granularity), [items, granularity]);

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const item = aggregatedItems.find((i) => isSameMonth(i, selectedMonth));
    if (!item) return [];
    return [
      { name: "TT.CSKH ghi nhận", value: item.cs_cancelled || 0, color: "#10b981" },
      { name: "PBLQ ghi nhận", value: item.related_cancelled || 0, color: "#ef4444" },
    ];
  }, [aggregatedItems, selectedMonth]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  if (isEmpty(aggregatedItems)) {
    return (
      <ChartCard
        title={`Spam / Đã hủy theo Đơn vị xử lý ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`}
        description="Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo đơn vị xử lý" type="bar" height={310} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Spam / Hủy theo Đơn vị - ${selectedMonth}`
          : `Spam / Đã hủy theo Đơn vị xử lý ${granularity === "QUARTER" ? "(Theo Quý)" : granularity === "YEAR" ? "(Theo Năm)" : ""}`
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các kỳ"
          : "Nhấp đúp vào cột kỳ bất kỳ để xem biểu đồ Donut chi tiết của kỳ đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các kỳ
          </button>
        ) : undefined
      }
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            {selectedMonth ? (
              <PieChart onDoubleClick={() => setSelectedMonth(null)}>
                <Pie
                  data={monthDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  isAnimationActive={false}
                  label={({ name, value, percent }) =>
                    percent && percent >= 0.02 ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)` : ""
                  }
                >
                  {monthDonutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ValueTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string, entry: any) => {
                    const item = entry.payload;
                    const total = monthDonutData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                    return `${value}: ${formatNumber(item.value)} (${pct}%)`;
                  }}
                />
              </PieChart>
            ) : (
              <BarChart
                data={aggregatedItems}
                onDoubleClick={handleChartClick}
                onClick={handleChartClick}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month_label" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cs_cancelled" name="TT.CSKH ghi nhận" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="cs_cancelled" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="related_cancelled" name="PBLQ ghi nhận" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="related_cancelled" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function UnitAnalysisCharts({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const items = charts.report_unit || [];
  if (isEmpty(items)) {
    return (
      <>
        <ChartCard
          title="Ticket đã xử lý theo Đơn vị"
          description="Cơ cấu ticket đã xử lý theo từng đơn vị"
        >
          <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo đơn vị xử lý." height={220} />
        </ChartCard>
        <ChartCard
          title="Spam / Đã hủy theo Đơn vị xử lý"
          description="Cơ cấu ticket hủy / spam theo từng đơn vị"
        >
          <EmptyChartAxisPlaceholder message="Không có dữ liệu phân tích theo đơn vị xử lý." height={220} />
        </ChartCard>
      </>
    );
  }

  return (
    <>
      <UnitProcessedChartCard items={items} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
      <UnitCancelledChartCard items={items} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
    </>
  );
}

/* ====================================================================
 * 5. THỜI GIAN XỬ LÝ TRUNG BÌNH
 * ==================================================================== */
function SingleTimeChartCard({
  title,
  items,
  globalViewMode,
  currentLabel = "Kỳ hiện tại",
  previousLabel = "Kỳ so sánh",
}: {
  title: string;
  items: CccDashboardReportTimeCategoryItem[];
  globalViewMode?: ChartViewMode;
  currentLabel?: string;
  previousLabel?: string;
}) {
  if (isEmpty(items)) {
    return (
      <ChartCard title={title} description="Đơn vị: Ngày hoặc Giờ/Phút nếu < 1 ngày. So sánh xu hướng rút ngắn thời gian xử lý qua 2 kỳ.">
        <EmptyChartAxisPlaceholder message="Không có dữ liệu thời gian xử lý" type="line" height={320} categories={["Chung", "Hệ thống", "Khác"]} />
      </ChartCard>
    );
  }

  const data = items.map((item) => ({
    category_name: item.category_name,
    current_avg_days: item.current_avg_days || 0,
    previous_avg_days: item.previous_avg_days || 0,
  }));

  return (
    <ChartCard
      title={title}
      description="Đơn vị: Ngày hoặc Giờ/Phút nếu < 1 ngày. So sánh xu hướng rút ngắn thời gian xử lý qua 2 kỳ."
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="category_name" tick={{ fontSize: 10, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<DaysTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="previous_avg_days" name={previousLabel} stroke="#64748b" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="current_avg_days" name={currentLabel} stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#f59e0b" }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function TimeAnalysisCharts({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const time = charts.report_time;
  const previousLabel = compareMode === "YOY" ? "Cùng kỳ năm trước" : compareMode === "QOQ" ? "Kỳ liền trước" : "Kỳ trước";

  return (
    <>
      <SingleTimeChartCard title="Thời gian trung bình CS xử lý tiếp nhận" items={time?.cs_by_category || []} globalViewMode={globalViewMode} previousLabel={previousLabel} />
      <SingleTimeChartCard title="Thời gian trung bình phối hợp CS & PBLQ" items={time?.related_by_category || []} globalViewMode={globalViewMode} previousLabel={previousLabel} />
    </>
  );
}

/* ====================================================================
 * 6. KẾT QUẢ SLA
 * ==================================================================== */
function SlaGaugeChartCard({ monthly, globalViewMode }: { monthly: any[]; globalViewMode?: ChartViewMode }) {
  const totalSla = monthly.reduce((acc, curr) => acc + (curr.total_sla || 0), 0);
  const onTimeSla = monthly.reduce((acc, curr) => acc + (curr.on_time || 0), 0);
  const overdueSla = monthly.reduce((acc, curr) => acc + (curr.overdue || 0), 0);
  const slaComplianceRate = totalSla > 0 ? ((onTimeSla / totalSla) * 100).toFixed(1) : "0";

  const { onTimeGrowth, overdueGrowth } = useMemo(() => {
    if (!monthly || monthly.length < 2) {
      return { onTimeGrowth: null, overdueGrowth: null };
    }

    const currentItem = monthly[monthly.length - 1];
    const prevItem = monthly[monthly.length - 2];

    const currentOnTime = currentItem.on_time ?? 0;
    const prevOnTime = prevItem.on_time ?? 0;
    let onTimeG: number | null = null;
    if (prevOnTime > 0) {
      onTimeG = Math.round(((currentOnTime - prevOnTime) / prevOnTime) * 100);
    } else if (currentOnTime > 0) {
      onTimeG = 100;
    } else {
      onTimeG = 0;
    }

    const currentOverdue = currentItem.overdue ?? 0;
    const prevOverdue = prevItem.overdue ?? 0;
    let overdueG: number | null = null;
    if (prevOverdue > 0) {
      overdueG = Math.round(((currentOverdue - prevOverdue) / prevOverdue) * 100);
    } else if (currentOverdue > 0) {
      overdueG = 100;
    } else {
      overdueG = 0;
    }

    return { onTimeGrowth: onTimeG, overdueGrowth: overdueG };
  }, [monthly]);

  const slaGaugeData = [
    { name: "Đúng hạn (On-time)", value: onTimeSla, color: "#10b981" },
    { name: "Trễ hạn (Overdue)", value: overdueSla, color: "#ef4444" },
  ];

  return (
    <ChartCard
      title="Tỷ lệ Tuân thủ SLA"
      description="Đánh giá chất lượng cam kết thời gian đáp ứng"
      headerRight={
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#059669] ring-1 ring-emerald-200">
          SLA Rate: {slaComplianceRate}%
        </span>
      }
    >
      {isEmpty(monthly) ? (
        <EmptyChartAxisPlaceholder message="Không có dữ liệu SLA." height={220} />
      ) : (
        (isExpanded) => (
          <div className={`flex flex-col items-center justify-center gap-2 ${isExpanded ? "h-[480px] sm:flex-row" : "h-[220px]"}`}>
            <div className={`relative w-full ${isExpanded ? "h-[350px] sm:w-1/2" : "h-[140px]"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slaGaugeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={isExpanded ? 70 : 40} outerRadius={isExpanded ? 110 : 60} startAngle={180} endAngle={0} paddingAngle={3} isAnimationActive={false}>
                    {slaGaugeData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ValueTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className={`absolute inset-0 flex flex-col items-center justify-end ${isExpanded ? "pb-12" : "pb-2"}`}>
                <span className={`${isExpanded ? "text-3xl" : "text-xl"} font-black text-slate-800`}>{slaComplianceRate}%</span>
                <span className="text-[10px] font-medium text-slate-500">Đạt SLA</span>
              </div>
            </div>

            <div className={`w-full space-y-1.5 ${isExpanded ? "sm:w-1/2" : ""}`}>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-800">
                  <span>Không trễ hạn</span>
                  <div className="flex items-center gap-1.5">
                    <span>{formatNumber(onTimeSla)} ({totalSla > 0 ? ((onTimeSla / totalSla) * 100).toFixed(1) : 0}%)</span>
                    {onTimeGrowth !== null && (
                      onTimeGrowth > 0 ? (
                        <span className="text-emerald-600 font-extrabold text-[10px]">▲+{onTimeGrowth}%</span>
                      ) : onTimeGrowth < 0 ? (
                        <span className="text-rose-600 font-extrabold text-[10px]">▼{onTimeGrowth}%</span>
                      ) : (
                        <span className="text-slate-400 font-extrabold text-[10px]">0%</span>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-rose-800">
                  <span>Trễ hạn</span>
                  <div className="flex items-center gap-1.5">
                    <span>{formatNumber(overdueSla)} ({totalSla > 0 ? ((overdueSla / totalSla) * 100).toFixed(1) : 0}%)</span>
                    {overdueGrowth !== null && (
                      overdueGrowth > 0 ? (
                        <span className="text-rose-600 font-extrabold text-[10px]">▲+{overdueGrowth}%</span>
                      ) : overdueGrowth < 0 ? (
                        <span className="text-emerald-600 font-extrabold text-[10px]">▼{overdueGrowth}%</span>
                      ) : (
                        <span className="text-slate-400 font-extrabold text-[10px]">0%</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </ChartCard>
  );
}

function SlaCategoryOverdueChartCard({ category, globalViewMode }: { category: any[]; globalViewMode?: ChartViewMode }) {
  return (
    <ChartCard
      title="Phân loại Ticket Trễ hạn theo Danh mục"
      description="Nhận diện các mảng dịch vụ phát sinh quá hạn SLA nhiều nhất"
    >
      {isEmpty(category) ? (
        <EmptyChartAxisPlaceholder message="Không phát sinh ticket trễ hạn" type="horizontal" height={220} categories={["Tài khoản", "Giao dịch", "Chung"]} />
      ) : (
        (isExpanded) => (
          <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={category} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="category_name" type="category" tick={{ fontSize: 10, fontWeight: 600 }} width={120} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="not_overdue" name="Không trễ hạn" fill="#10b981" stackId="sla" isAnimationActive={false} />
                <Bar dataKey="overdue" name="Trễ hạn" fill="#ef4444" stackId="sla" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList dataKey="overdue" position="right" style={{ fontSize: 10, fill: '#ef4444', fontWeight: 700 }} formatter={(v: any) => (v && Number(v) > 0 ? v : "")} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      )}
    </ChartCard>
  );
}

function SlaCharts({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const sla = charts.report_sla;

  if (!sla) {
    return (
      <>
        <ChartCard title="Tỷ lệ Tuân thủ SLA" description="Đánh giá chất lượng cam kết thời gian đáp ứng">
          <EmptyChartAxisPlaceholder message="Không có dữ liệu SLA" type="bar" height={220} />
        </ChartCard>
        <ChartCard title="Phân loại Ticket Trễ hạn theo Danh mục" description="Nhận diện các mảng dịch vụ phát sinh quá hạn SLA nhiều nhất">
          <EmptyChartAxisPlaceholder message="Không có dữ liệu SLA" type="horizontal" height={220} categories={["Tài khoản", "Giao dịch", "Chung"]} />
        </ChartCard>
      </>
    );
  }

  return (
    <>
      <SlaGaugeChartCard monthly={sla.monthly || []} globalViewMode={globalViewMode} />
      <SlaCategoryOverdueChartCard category={sla.overdue_by_category || []} globalViewMode={globalViewMode} />
    </>
  );
}

function EmployeeRankedChartCard({ itemsSorted, globalViewMode }: { itemsSorted: any[]; globalViewMode?: ChartViewMode }) {
  const displayData = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of itemsSorted) {
      const name = item.employee_name;
      if (!map.has(name)) {
        map.set(name, { employee_name: name, processed: 0, related_processed: 0, cancelled: 0, ekyc: 0, total: 0 });
      }
      const existing = map.get(name)!;
      existing.processed += item.processed || 0;
      existing.related_processed += item.related_processed || 0;
      existing.cancelled += item.cancelled || 0;
      existing.ekyc += item.ekyc || 0;
      existing.total += item.total || 0;
    }

    return Array.from(map.values())
      .sort((a, b) => b.processed - a.processed)
      .slice(0, 15);
  }, [itemsSorted]);

  if (isEmpty(displayData)) {
    return (
      <ChartCard
        title="Xếp hạng Kết quả Xử lý theo NVCS"
        description="Sắp xếp theo sản lượng ticket đã hoàn tất"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu theo từng NVCS" type="horizontal" height={340} categories={["NVCS 01", "NVCS 02", "NVCS 03"]} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Xếp hạng Kết quả Xử lý theo NVCS"
      description="Sắp xếp theo sản lượng ticket đã hoàn tất"
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="employee_name" type="category" tick={{ fontSize: 11, fontWeight: 600 }} width={110} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="processed" name="Ticket xử lý" fill="#10b981" stackId="emp" isAnimationActive={false}>
                <LabelList dataKey="processed" position="center" style={{ fontSize: 9, fill: "#ffffff", fontWeight: 700 }} formatter={(v: any) => (v && Number(v) > 0 ? v : "")} />
              </Bar>
              <Bar dataKey="related_processed" name="Chuyển PBLQ" fill="#f59e0b" stackId="emp" isAnimationActive={false}>
                <LabelList dataKey="related_processed" position="center" style={{ fontSize: 9, fill: "#ffffff", fontWeight: 700 }} formatter={(v: any) => (v && Number(v) > 0 ? v : "")} />
              </Bar>
              <Bar dataKey="cancelled" name="Ticket hủy" fill="#ef4444" stackId="emp" isAnimationActive={false}>
                <LabelList dataKey="cancelled" position="center" style={{ fontSize: 9, fill: "#ffffff", fontWeight: 700 }} formatter={(v: any) => (v && Number(v) > 0 ? v : "")} />
              </Bar>
              <Bar dataKey="ekyc" name="Gọi eKYC" fill="#0097cf" stackId="emp" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="ekyc" position="center" style={{ fontSize: 9, fill: "#ffffff", fontWeight: 700 }} formatter={(v: any) => (v && Number(v) > 0 ? v : "")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function EmployeeTimeChartCard({ itemsSorted, globalViewMode }: { itemsSorted: any[]; globalViewMode?: ChartViewMode }) {
  const displayData = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of itemsSorted) {
      const name = item.employee_name;
      if (!map.has(name)) {
        map.set(name, { employee_name: name, cs_sum: 0, cs_cnt: 0, rel_sum: 0, rel_cnt: 0 });
      }
      const existing = map.get(name)!;
      if (item.avg_cs_days) {
        existing.cs_sum += item.avg_cs_days;
        existing.cs_cnt += 1;
      }
      if (item.avg_related_days) {
        existing.rel_sum += item.avg_related_days;
        existing.rel_cnt += 1;
      }
    }

    return Array.from(map.values())
      .map((row) => ({
        employee_name: row.employee_name,
        avg_cs_days: row.cs_cnt > 0 ? Number((row.cs_sum / row.cs_cnt).toFixed(2)) : 0,
        avg_related_days: row.rel_cnt > 0 ? Number((row.rel_sum / row.rel_cnt).toFixed(2)) : 0,
      }))
      .slice(0, 15);
  }, [itemsSorted]);

  if (isEmpty(displayData)) {
    return (
      <ChartCard
        title="Thời gian Tiếp nhận & Xử lý trung bình theo NVCS"
        description="Đơn vị: Ngày hoặc Giờ/Phút nếu < 1 ngày"
      >
        <EmptyChartAxisPlaceholder message="Không có dữ liệu theo từng NVCS" type="horizontal" height={340} categories={["NVCS 01", "NVCS 02", "NVCS 03"]} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Thời gian Tiếp nhận & Xử lý trung bình theo NVCS"
      description="Đơn vị: Ngày hoặc Giờ/Phút nếu < 1 ngày"
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} layout="vertical" margin={{ left: 10, right: 35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="employee_name" type="category" tick={{ fontSize: 11, fontWeight: 600 }} width={110} />
              <Tooltip content={<DaysTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="avg_cs_days" name="Thời gian CS xử lý" fill="#8b5cf6" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="avg_cs_days" position="right" style={{ fontSize: 10, fill: "#8b5cf6", fontWeight: 700 }} formatter={(v: any) => (v ? formatDays(v) : "")} />
              </Bar>
              <Bar dataKey="avg_related_days" name="Thời gian chuyển PBLQ" fill="#06b6d4" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="avg_related_days" position="right" style={{ fontSize: 10, fill: "#06b6d4", fontWeight: 700 }} formatter={(v: any) => (v ? formatDays(v) : "")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function EmployeeCharts({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const rawItems = charts.report_employee || [];
  const itemsSorted = useMemo(() => [...rawItems].sort((a, b) => (b.processed || 0) - (a.processed || 0)), [rawItems]);

  return (
    <>
      <EmployeeRankedChartCard itemsSorted={itemsSorted} globalViewMode={globalViewMode} />
      <EmployeeTimeChartCard itemsSorted={itemsSorted} globalViewMode={globalViewMode} />
    </>
  );
}

/* ====================================================================
 * 8. NHÓM LỖI PHÁT SINH NHIỀU
 * ==================================================================== */
function RootCausePieCard({
  charts,
  globalViewMode,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const data = useMemo(
    () =>
      (charts.root_cause_breakdown || []).map((item) => ({
        name: rootCauseLabel(item),
        value: item.count || 0,
      })),
    [charts.root_cause_breakdown]
  );

  if (isEmpty(data)) {
    return (
      <ChartCard title="Cơ cấu Nhóm lỗi phát sinh phổ biến">
        <EmptyChartAxisPlaceholder message="Không có dữ liệu nhóm lỗi" type="bar" height={320} categories={["Hệ thống", "Nghiệp vụ", "Khác"]} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Cơ cấu Nhóm lỗi phát sinh phổ biến"
    >
      {(isExpanded) => (
        <div className={isExpanded ? "h-[480px]" : "h-[220px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                isAnimationActive={false}
                label={({ name, value, percent }) =>
                  percent && percent >= 0.02 ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)` : ""
                }
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ValueTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string, entry: any) => {
                  const item = entry.payload;
                  const total = data.reduce((acc, curr) => acc + curr.value, 0);
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                  return `${value}: ${formatNumber(item.value)} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ====================================================================
 * MAIN DASHBOARD CHARTS COMPONENT
 * ==================================================================== */
export const CccDashboardCharts = memo(function CccDashboardCharts({
  charts,
  globalViewMode = "TREND_OVER_TIME",
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <LazyDashboardSection minHeight={260}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TicketResultChartCard charts={charts} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
          <SourceDonutChartCard items={charts.report_source || []} globalViewMode={globalViewMode} />
          <SourceTrendChartCard items={charts.report_source || []} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
        </div>
      </LazyDashboardSection>

      {/* Row 2 */}
      <LazyDashboardSection minHeight={260}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CategoryProcessedChartCard items={charts.report_category || []} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
          <CategoryCancelledChartCard items={charts.report_category || []} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
          <UnitProcessedChartCard items={charts.report_unit || []} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
        </div>
      </LazyDashboardSection>

      {/* Row 3 */}
      <LazyDashboardSection minHeight={260}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UnitCancelledChartCard items={charts.report_unit || []} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
          <TimeAnalysisCharts charts={charts} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
        </div>
      </LazyDashboardSection>

      {/* Row 4 */}
      <LazyDashboardSection minHeight={260}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SlaGaugeChartCard monthly={charts.report_sla?.monthly || []} globalViewMode={globalViewMode} />
          <SlaCategoryOverdueChartCard category={charts.report_sla?.overdue_by_category || []} globalViewMode={globalViewMode} />
          <RootCausePieCard charts={charts} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
        </div>
      </LazyDashboardSection>

      {/* Row 5 */}
      <LazyDashboardSection minHeight={260}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EmployeeCharts charts={charts} globalViewMode={globalViewMode} granularity={granularity} compareMode={compareMode} />
        </div>
      </LazyDashboardSection>
    </div>
  );
});

