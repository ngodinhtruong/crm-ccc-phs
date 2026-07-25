"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import {
  ChatbotSeriesItem,
  ChartItem,
} from "@/types/chatbot-dashboard.type";

const CHART_COLORS = [
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

const integerFormatter = new Intl.NumberFormat("vi-VN");
const decimalFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

function formatCount(value: number) {
  return integerFormatter.format(value);
}

function MetricChip({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm shadow-slate-100/70 backdrop-blur">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{caption}</div>
    </div>
  );
}

function SeriesTooltip({
  active,
  payload,
  label,
  total,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  total: number;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload as ChatbotSeriesItem | undefined;
  const count = Number(item?.count ?? payload[0]?.value ?? 0);
  const share = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="min-w-[200px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/80">
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-3 flex items-end justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Ticket chatbot
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {formatCount(count)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Tỷ trọng
          </div>
          <div className="mt-1 text-sm font-semibold text-sky-700">
            {decimalFormatter.format(share)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: any[];
  total: number;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload as ChartItem | undefined;
  const count = Number(item?.value ?? payload[0]?.value ?? 0);
  const share = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/80">
      <div className="text-sm font-semibold text-slate-700">{item?.name}</div>
      <div className="mt-3 flex items-end justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Số lượng
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {formatCount(count)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Tỷ trọng
          </div>
          <div className="mt-1 text-sm font-semibold text-sky-700">
            {decimalFormatter.format(share)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export function DailyTicketChart({
  data,
}: {
  data?: ChatbotSeriesItem[] | null;
}) {
  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu ticket chatbot theo ngày." />;
  }

  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  const peakDay = chartData.reduce(
    (best, item) => (item.count > best.count ? item : best),
    chartData[0],
  );
  const average = total / chartData.length;
  const gradientId = "chatbot-daily-ticket-gradient";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricChip
          label="Tổng ticket"
          value={formatCount(total)}
          caption="trong kỳ lọc"
        />
        <MetricChip
          label="Ngày cao nhất"
          value={peakDay.label}
          caption={`${formatCount(peakDay.count)} ticket`}
        />
        <MetricChip
          label="Trung bình / ngày"
          value={decimalFormatter.format(average)}
          caption="ticket chatbot"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Biểu đồ ticket theo ngày
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Mỗi điểm là số ticket/request chatbot được sinh trong một ngày của kỳ lọc.
            </div>
          </div>

          <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
            {chartData.length} ngày
          </div>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                interval="preserveStartEnd"
                tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />

              <Tooltip content={<SeriesTooltip total={total} />} />

              <Area
                type="monotone"
                dataKey="count"
                name="Ticket chatbot"
                stroke="#0ea5e9"
                strokeWidth={3}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function HourlyTicketChart({
  data,
}: {
  data?: ChatbotSeriesItem[] | null;
}) {
  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu ticket chatbot theo giờ." />;
  }

  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  const peakHour = chartData.reduce(
    (best, item) => (item.count > best.count ? item : best),
    chartData[0],
  );
  const activeHours = chartData.filter((item) => item.count > 0).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricChip
          label="Tổng ticket"
          value={formatCount(total)}
          caption="trong kỳ lọc"
        />
        <MetricChip
          label="Giờ cao nhất"
          value={peakHour.label}
          caption={`${formatCount(peakHour.count)} ticket`}
        />
        <MetricChip
          label="Giờ có ticket"
          value={formatCount(activeHours)}
          caption="trong 24 giờ"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Biểu đồ ticket theo giờ
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Mỗi cột là số ticket/request chatbot được sinh theo giờ trong ngày.
            </div>
          </div>

          <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-100">
            24 khung giờ
          </div>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                interval={2}
                tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />

              <Tooltip content={<SeriesTooltip total={total} />} />

              <Bar
                dataKey="count"
                name="Ticket chatbot"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth={1}
                radius={[0, 0, 0, 0]}
                barSize={16}
                isAnimationActive={false}
              >
                {chartData.map((item, index) => (
                  <Cell
                    key={item.key}
                    fill={
                      item.count > 0
                        ? CHART_COLORS[index % CHART_COLORS.length]
                        : "#e2e8f0"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function DistributionDonutChart({
  data,
  emptyMessage,
}: {
  data?: ChartItem[] | null;
  emptyMessage: string;
}) {
  const chartData = Array.isArray(data)
    ? data.filter((item) => item.value > 0)
    : [];

  if (chartData.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="relative h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={92}
              paddingAngle={3}
              stroke="white"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {chartData.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400">Tổng</span>
          <span className="text-2xl font-bold text-slate-800">
            {formatCount(total)}
          </span>
        </div>
      </div>

      <div className="space-y-2 self-center">
        {chartData.map((item, index) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                <span className="truncate text-xs font-semibold text-slate-700">
                  {item.name}
                </span>
              </div>

              <span className="shrink-0 text-xs font-bold text-slate-800">
                {formatCount(item.value)} · {decimalFormatter.format(percent)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}