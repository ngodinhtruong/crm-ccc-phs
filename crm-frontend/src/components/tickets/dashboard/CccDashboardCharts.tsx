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
  aggregateTotalOverall,
  formatDays,
  formatNumber,
  getMonthLabel,
  pivot100PercentStacked,
  rootCauseLabel,
} from "./CccDashboardUtils";

const COLORS = [
  "#0097cf", // Primary PHS Sky Blue
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

/* ====================================================================
 * 1. TỔNG QUAN KẾT QUẢ TICKET
 * ==================================================================== */
function TicketResultChartCard({
  charts,
  globalViewMode,
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const rawData = useMemo(() => {
    return (charts.report_monthly_processing || []).map((item) => ({
      ...item,
      label: getMonthLabel(item),
      processed: item.processed ?? item.resolved ?? 0,
      cancelled: item.cancelled ?? 0,
      total: item.total ?? 0,
    }));
  }, [charts.report_monthly_processing]);

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const monthItem = rawData.find((d) => isSameMonth(d, selectedMonth));
    if (!monthItem) return [];
    return [
      { name: "Ticket đã xử lý", value: monthItem.processed, color: "#10b981" },
      { name: "Spam / Đã hủy", value: monthItem.cancelled, color: "#ef4444" },
    ];
  }, [rawData, selectedMonth]);

  if (isEmpty(rawData)) {
    return <EmptyState message="Không có dữ liệu kết quả xử lý ticket." />;
  }

  const totalsSum = rawData.reduce((acc, curr) => acc + curr.total, 0);
  const processedSum = rawData.reduce((acc, curr) => acc + curr.processed, 0);
  const cancelledSum = rawData.reduce((acc, curr) => acc + curr.cancelled, 0);
  const processedRate = totalsSum > 0 ? ((processedSum / totalsSum) * 100).toFixed(1) : "0";

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">Tổng Ticket Tiếp Nhận</p>
          <p className="mt-1 text-xl font-black text-sky-700">{formatNumber(totalsSum)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">Tổng Ticket Đã Xử Lý</p>
          <p className="mt-1 text-xl font-black text-emerald-700">{formatNumber(processedSum)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">Tỷ Lệ Xử Lý Thành Công</p>
          <p className="mt-1 text-xl font-black text-amber-700">{processedRate}%</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">Tổng Ticket Hủy / Spam</p>
          <p className="mt-1 text-xl font-black text-rose-600">{formatNumber(cancelledSum)}</p>
        </div>
      </div>

      <ChartCard
        title={
          selectedMonth
            ? `Kết quả xử lý Ticket - ${selectedMonth}`
            : "Xu hướng & Kết quả xử lý Ticket"
        }
        description={
          selectedMonth
            ? "Nhấp đúp hoặc bấm nút 'Quay lại' để xem xu hướng tất cả các tháng"
            : "Nhấp đúp vào cột tháng bất kỳ để xem biểu đồ Donut chi tiết của tháng đó"
        }
        headerRight={
          selectedMonth ? (
            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
            >
              ← Quay lại các tháng
            </button>
          ) : undefined
        }
      >
        <div className="h-[320px]">
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
              <ComposedChart
                data={rawData}
                onDoubleClick={handleChartClick}
                onClick={handleChartClick}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0097cf" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0097cf" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="total" name="Tổng ticket tiếp nhận" fill="url(#totalGradient)" stroke="#0097cf" strokeWidth={2} isAnimationActive={false} />
                <Bar dataKey="processed" name="Đã xử lý" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false}>
                  <LabelList dataKey="processed" position="top" style={{ fontSize: 10, fill: '#10b981', fontWeight: 700 }} formatter={(val: any) => (val && Number(val) > 0 ? val : "")} />
                </Bar>
                <Bar dataKey="cancelled" name="Spam / Đã hủy" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false}>
                  <LabelList dataKey="cancelled" position="top" style={{ fontSize: 10, fill: '#ef4444', fontWeight: 700 }} formatter={(val: any) => (val && Number(val) > 0 ? val : "")} />
                </Bar>
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

/* ====================================================================
 * 2. PHÂN TÍCH THEO NGUỒN TIẾP NHẬN
 * ==================================================================== */
function SourceDonutChartCard({ items, globalViewMode }: { items: any[]; globalViewMode?: ChartViewMode }) {
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

  return (
    <ChartCard
      title="Tỷ trọng Ticket theo Nguồn"
      description="Xếp hạng cơ cấu tổng lượng ticket từ các kênh tiếp nhận"
      className="xl:col-span-5"
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ left: 20, right: 65, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={90} />
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
    </ChartCard>
  );
}

function SourceTrendChartCard({ items, globalViewMode }: { items: any[]; globalViewMode?: ChartViewMode }) {
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");

  const pivotData = useMemo(() => {
    const monthMap = new Map<string, string>();
    for (const item of items) {
      const key = String(item.month_key || item.period_label || item.month_label || "");
      const label = item.month_label || item.period_label || key;
      if (key) monthMap.set(key, label);
    }

    const sortedMonthKeys = Array.from(monthMap.keys()).sort().slice(-5);
    const recentMonthLabels = sortedMonthKeys.map((k) => monthMap.get(k)!);

    const sourceMap = new Map<string, Record<string, any>>();
    for (const item of items) {
      const key = String(item.month_key || item.period_label || item.month_label || "");
      if (!sortedMonthKeys.includes(key)) continue;

      const source = getSourceName(item);
      const monthLabel = item.month_label || item.period_label || key;
      const value = item.processed ?? item.resolved ?? 0;

      if (!sourceMap.has(source)) {
        sourceMap.set(source, { source });
      }
      const record = sourceMap.get(source)!;
      record[monthLabel] = (record[monthLabel] || 0) + value;
    }

    return {
      monthDimensions: recentMonthLabels,
      rows: Array.from(sourceMap.values()),
    };
  }, [items]);

  const displayedMonths = useMemo(() => {
    if (selectedMonth === "ALL") return pivotData.monthDimensions;
    return pivotData.monthDimensions.filter((m) => m === selectedMonth);
  }, [selectedMonth, pivotData.monthDimensions]);

  return (
    <ChartCard
      title="Phân bổ Ticket đã xử lý theo Nguồn"
      description="Trục hoành: Nguồn tiếp nhận | Trục tung: Số lượng ticket (5 cột tháng nhóm cho mỗi nguồn)"
      className="xl:col-span-7"
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
      <div className="h-[320px]">
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
    </ChartCard>
  );
}

function SourceAnalysisCharts({ charts, globalViewMode }: { charts: CccCharts; globalViewMode?: ChartViewMode }) {
  const items = charts.report_source || [];
  if (isEmpty(items)) return <EmptyState message="Không có dữ liệu phân tích theo nguồn." />;

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <SourceDonutChartCard items={items} globalViewMode={globalViewMode} />
      <SourceTrendChartCard items={items} globalViewMode={globalViewMode} />
    </div>
  );
}

/* ====================================================================
 * 3. PHÂN TÍCH THEO DANH MỤC
 * ==================================================================== */
function CategoryProcessedChartCard({ items, globalViewMode }: { items: any[]; globalViewMode?: ChartViewMode }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const processedPivot = useMemo(
    () =>
      pivotByMonth(
        items,
        getCategoryName,
        (i) => i.month_label || i.period_label || String(i.month_key || ""),
        (i) => i.processed ?? i.resolved ?? 0
      ),
    [items]
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

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Tỷ trọng Ticket đã xử lý - ${selectedMonth}`
          : "Ticket đã xử lý theo Danh mục"
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các tháng"
          : "Nhấp đúp vào cột tháng bất kỳ để xem biểu đồ Donut chi tiết của tháng đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các tháng
          </button>
        ) : undefined
      }
    >
      <div className="h-[340px]">
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
    </ChartCard>
  );
}

function CategoryCancelledChartCard({ items, globalViewMode }: { items: any[]; globalViewMode?: ChartViewMode }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const cancelledPivot = useMemo(
    () =>
      pivotByMonth(
        items,
        getCategoryName,
        (i) => i.month_label || i.period_label || String(i.month_key || ""),
        (i) => i.cancelled || 0
      ),
    [items]
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

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Tỷ trọng Spam / Đã hủy - ${selectedMonth}`
          : "Spam / Đã hủy theo Danh mục"
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các tháng"
          : "Nhấp đúp vào cột tháng bất kỳ để xem biểu đồ Donut chi tiết của tháng đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các tháng
          </button>
        ) : undefined
      }
    >
      <div className="h-[340px]">
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
    </ChartCard>
  );
}

function CategoryAnalysisCharts({ charts, globalViewMode }: { charts: CccCharts; globalViewMode?: ChartViewMode }) {
  const items = charts.report_category || [];
  if (isEmpty(items)) return <EmptyState message="Không có dữ liệu phân tích theo danh mục." />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CategoryProcessedChartCard items={items} globalViewMode={globalViewMode} />
      <CategoryCancelledChartCard items={items} globalViewMode={globalViewMode} />
    </div>
  );
}

/* ====================================================================
 * 4. PHÂN TÍCH ĐƠN VỊ XỬ LÝ
 * ==================================================================== */
function UnitProcessedChartCard({ items, globalViewMode }: { items: any[]; globalViewMode?: ChartViewMode }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const item = items.find((i) => isSameMonth(i, selectedMonth));
    if (!item) return [];
    return [
      { name: "TT.CSKH trực tiếp xử lý", value: item.cs_processed || 0, color: "#10b981" },
      { name: "Chuyển PBLQ phối hợp", value: item.related_processed || 0, color: "#f59e0b" },
    ];
  }, [items, selectedMonth]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Ticket đã xử lý theo Đơn vị - ${selectedMonth}`
          : "Ticket đã xử lý theo Đơn vị"
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các tháng"
          : "Nhấp đúp vào cột tháng bất kỳ để xem biểu đồ Donut chi tiết của tháng đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các tháng
          </button>
        ) : undefined
      }
    >
      <div className="h-[310px]">
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
              data={items}
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
    </ChartCard>
  );
}

function UnitCancelledChartCard({ items, globalViewMode }: { items: any[]; globalViewMode?: ChartViewMode }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const monthDonutData = useMemo(() => {
    if (!selectedMonth) return [];
    const item = items.find((i) => isSameMonth(i, selectedMonth));
    if (!item) return [];
    return [
      { name: "TT.CSKH ghi nhận", value: item.cs_cancelled || 0, color: "#0097cf" },
      { name: "PBLQ ghi nhận", value: item.related_cancelled || 0, color: "#ef4444" },
    ];
  }, [items, selectedMonth]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedMonth(state.activeLabel);
    }
  };

  return (
    <ChartCard
      title={
        selectedMonth
          ? `Spam / Hủy theo Đơn vị - ${selectedMonth}`
          : "Spam / Đã hủy theo Đơn vị xử lý"
      }
      description={
        selectedMonth
          ? "Nhấp đúp vào biểu đồ hoặc bấm nút 'Quay lại' để xem tất cả các tháng"
          : "Nhấp đúp vào cột tháng bất kỳ để xem biểu đồ Donut chi tiết của tháng đó"
      }
      headerRight={
        selectedMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
          >
            ← Quay lại các tháng
          </button>
        ) : undefined
      }
    >
      <div className="h-[310px]">
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
              data={items}
              onDoubleClick={handleChartClick}
              onClick={handleChartClick}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cs_cancelled" name="TT.CSKH ghi nhận" fill="#0097cf" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="cs_cancelled" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
              </Bar>
              <Bar dataKey="related_cancelled" name="PBLQ ghi nhận" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="related_cancelled" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function UnitAnalysisCharts({ charts, globalViewMode }: { charts: CccCharts; globalViewMode?: ChartViewMode }) {
  const items = charts.report_unit || [];
  if (isEmpty(items)) return <EmptyState message="Không có dữ liệu phân tích theo đơn vị xử lý." />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <UnitProcessedChartCard items={items} globalViewMode={globalViewMode} />
      <UnitCancelledChartCard items={items} globalViewMode={globalViewMode} />
    </div>
  );
}

/* ====================================================================
 * 5. THỜI GIAN XỬ LÝ TRUNG BÌNH
 * ==================================================================== */
function SingleTimeChartCard({
  title,
  items,
  globalViewMode,
  currentLabel = "Tháng hiện tại",
  previousLabel = "Tháng trước",
}: {
  title: string;
  items: CccDashboardReportTimeCategoryItem[];
  globalViewMode?: ChartViewMode;
  currentLabel?: string;
  previousLabel?: string;
}) {
  if (isEmpty(items)) {
    return (
      <ChartCard title={title}>
        <EmptyState message="Không có dữ liệu thời gian xử lý." />
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
      <div className="h-[320px]">
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
    </ChartCard>
  );
}

function TimeAnalysisCharts({ charts, globalViewMode }: { charts: CccCharts; globalViewMode?: ChartViewMode }) {
  const time = charts.report_time;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SingleTimeChartCard title="Thời gian trung bình CS xử lý tiếp nhận" items={time?.cs_by_category || []} globalViewMode={globalViewMode} />
      <SingleTimeChartCard title="Thời gian trung bình phối hợp CS & PBLQ" items={time?.related_by_category || []} globalViewMode={globalViewMode} />
    </div>
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

  const slaGaugeData = [
    { name: "Đúng hạn (On-time)", value: onTimeSla, color: "#0097cf" },
    { name: "Trễ hạn (Overdue)", value: overdueSla, color: "#ef4444" },
  ];

  return (
    <ChartCard
      title="Tỷ lệ Tuân thủ SLA"
      description="Đánh giá chất lượng cam kết thời gian đáp ứng"
      headerRight={
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200">
          SLA Rate: {slaComplianceRate}%
        </span>
      }
    >
      {isEmpty(monthly) ? (
        <EmptyState message="Không có ticket có SLA." />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="relative h-[240px] w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slaGaugeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} startAngle={180} endAngle={0} paddingAngle={3} isAnimationActive={false}>
                  {slaGaugeData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ValueTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
              <span className="text-2xl font-black text-slate-800">{slaComplianceRate}%</span>
              <span className="text-[11px] font-medium text-slate-500">Đạt SLA</span>
            </div>
          </div>

          <div className="w-full space-y-2.5 sm:w-1/2">
            <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
                <span>Không trễ hạn</span>
                <span>{formatNumber(onTimeSla)} ticket ({totalSla > 0 ? ((onTimeSla / totalSla) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
                <span>Trễ hạn</span>
                <span>{formatNumber(overdueSla)} ticket ({totalSla > 0 ? ((overdueSla / totalSla) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
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
        <EmptyState message="Không phát sinh ticket trễ hạn." />
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={category} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="category_name" type="category" tick={{ fontSize: 10, fontWeight: 600 }} width={120} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="not_overdue" name="Không trễ hạn" fill="#0097cf" stackId="sla" isAnimationActive={false} />
              <Bar dataKey="overdue" name="Trễ hạn" fill="#ef4444" stackId="sla" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="overdue" position="right" style={{ fontSize: 10, fill: '#ef4444', fontWeight: 700 }} formatter={(v: any) => (v && Number(v) > 0 ? v : "")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function SlaUnitOverdueTableCard({ unitMonth, globalViewMode }: { unitMonth: any[]; globalViewMode?: ChartViewMode }) {
  return (
    <ChartCard
      title="Thống kê Ticket Trễ hạn theo Đơn vị"
      description="Bảng theo dõi chi tiết số lượng ticket trễ hạn phân bổ theo từng đơn vị xử lý"
    >
      {isEmpty(unitMonth) ? (
        <EmptyState message="Không có tác vụ PBLQ trễ hạn trong khoảng thời gian này." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2.5 font-bold">Tháng</th>
                <th className="px-4 py-2.5 font-bold">Đơn vị xử lý</th>
                <th className="px-4 py-2.5 text-right font-bold">Số ticket trễ hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unitMonth.map((item, index) => (
                <tr key={`${item.month_key}-${item.unit_name}-${index}`} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{item.month_label}</td>
                  <td className="px-4 py-2.5 text-slate-600">{item.unit_name}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-rose-600">{formatNumber(item.overdue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function SlaCharts({ charts, globalViewMode }: { charts: CccCharts; globalViewMode?: ChartViewMode }) {
  const sla = charts.report_sla;
  if (!sla) return <EmptyState message="Không có dữ liệu SLA." />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SlaGaugeChartCard monthly={sla.monthly || []} globalViewMode={globalViewMode} />
      <SlaCategoryOverdueChartCard category={sla.overdue_by_category || []} globalViewMode={globalViewMode} />
      <SlaUnitOverdueTableCard unitMonth={sla.overdue_by_unit_month || []} globalViewMode={globalViewMode} />
    </div>
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

  return (
    <ChartCard
      title="Xếp hạng Kết quả Xử lý theo NVCS"
      description="Sắp xếp theo sản lượng ticket đã hoàn tất"
    >
      <div className="h-[340px]">
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

  return (
    <ChartCard
      title="Thời gian Tiếp nhận & Xử lý trung bình theo NVCS"
      description="Đơn vị: Ngày hoặc Giờ/Phút nếu < 1 ngày"
    >
      <div className="h-[340px]">
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
    </ChartCard>
  );
}

function EmployeeCharts({ charts, globalViewMode }: { charts: CccCharts; globalViewMode?: ChartViewMode }) {
  const rawItems = charts.report_employee || [];
  const itemsSorted = useMemo(() => [...rawItems].sort((a, b) => (b.processed || 0) - (a.processed || 0)), [rawItems]);

  if (isEmpty(itemsSorted)) return <EmptyState message="Không có dữ liệu theo từng NVCS." />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <EmployeeRankedChartCard itemsSorted={itemsSorted} globalViewMode={globalViewMode} />
      <EmployeeTimeChartCard itemsSorted={itemsSorted} globalViewMode={globalViewMode} />
    </div>
  );
}

/* ====================================================================
 * 8. NHÓM LỖI PHÁT SINH NHIỀU
 * ==================================================================== */
function RootCausePieCard({ charts, globalViewMode }: { charts: CccCharts; globalViewMode?: ChartViewMode }) {
  const data = useMemo(
    () =>
      (charts.root_cause_breakdown || []).map((item) => ({
        name: rootCauseLabel(item),
        value: item.count || 0,
      })),
    [charts.root_cause_breakdown]
  );

  if (isEmpty(data)) return null;

  return (
    <ChartCard
      title="Cơ cấu Nhóm lỗi phát sinh phổ biến"
    >
      <div className="h-[320px]">
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
    </ChartCard>
  );
}

/* ====================================================================
 * MAIN DASHBOARD CHARTS COMPONENT
 * ==================================================================== */
export const CccDashboardCharts = memo(function CccDashboardCharts({
  charts,
  globalViewMode = "TREND_OVER_TIME",
}: {
  charts: CccCharts;
  globalViewMode?: ChartViewMode;
}) {
  return (
    <div className="space-y-6">
      <TicketResultChartCard charts={charts} globalViewMode={globalViewMode} />

      <LazyDashboardSection minHeight={400}>
        <SourceAnalysisCharts charts={charts} globalViewMode={globalViewMode} />
      </LazyDashboardSection>

      <LazyDashboardSection minHeight={420}>
        <CategoryAnalysisCharts charts={charts} globalViewMode={globalViewMode} />
      </LazyDashboardSection>

      <LazyDashboardSection minHeight={400}>
        <UnitAnalysisCharts charts={charts} globalViewMode={globalViewMode} />
      </LazyDashboardSection>

      <LazyDashboardSection minHeight={400}>
        <TimeAnalysisCharts charts={charts} globalViewMode={globalViewMode} />
      </LazyDashboardSection>

      <LazyDashboardSection minHeight={480}>
        <SlaCharts charts={charts} globalViewMode={globalViewMode} />
      </LazyDashboardSection>

      <LazyDashboardSection minHeight={420}>
        <EmployeeCharts charts={charts} globalViewMode={globalViewMode} />
      </LazyDashboardSection>

      <LazyDashboardSection minHeight={320}>
        <RootCausePieCard charts={charts} globalViewMode={globalViewMode} />
      </LazyDashboardSection>
    </div>
  );
});
