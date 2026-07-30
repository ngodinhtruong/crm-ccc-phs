"use client";

import { memo, useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ExternalErrorChartResponse, ExternalErrorRecurringIssue } from "@/types/external-error.type";
import {
  CHART_COLORS,
  formatNumber,
  formatPercent,
  toChartValue,
} from "./ExternalErrorUtils";

function ChartCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyChart({ text = "Không có dữ liệu biểu đồ." }: { text?: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {text}
    </div>
  );
}

function chartData(chart?: ExternalErrorChartResponse) {
  return (chart?.data || []).map((item) => ({
    ...item,
    value: toChartValue(item.value ?? item.count),
    count: toChartValue(item.count ?? item.value),
  }));
}

function SimpleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={`${entry.dataKey}-${index}`} className="text-slate-600">
          {entry.name || entry.dataKey}: <span className="font-semibold">{formatNumber(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function HorizontalBarChart({
  chart,
  title,
  description,
}: {
  chart?: ExternalErrorChartResponse;
  title: string;
  description?: string;
}) {
  const data = useMemo(() => chartData(chart), [chart]);

  return (
    <ChartCard title={title} description={description}>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip content={<SimpleTooltip />} />
              <Bar
                dataKey="count"
                name="Số lỗi"
                radius={[0, 6, 6, 0]}
                fill="#0097cf"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function ColumnChart({
  chart,
  title,
  description,
}: {
  chart?: ExternalErrorChartResponse;
  title: string;
  description?: string;
}) {
  const data = useMemo(() => chartData(chart), [chart]);

  return (
    <ChartCard title={title} description={description}>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 4, right: 10, top: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<SimpleTooltip />} />
              <Bar
                dataKey="count"
                name="Số lỗi"
                radius={[6, 6, 0, 0]}
                fill="#0097cf"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function LineTrendChart({ chart }: { chart?: ExternalErrorChartResponse }) {
  const data = useMemo(() => chartData(chart), [chart]);

  return (
    <ChartCard title="Xu hướng lỗi theo thời gian" description="Theo tháng/ngày nhận lỗi trong khoảng lọc.">
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 4, right: 16, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<SimpleTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Số lỗi"
                stroke="#0097cf"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function DonutChart({
  chart,
  title,
  description,
}: {
  chart?: ExternalErrorChartResponse;
  title: string;
  description?: string;
}) {
  const data = useMemo(() => chartData(chart), [chart]);
  const total = useMemo(
    () => data.reduce((sum, item) => sum + toChartValue(item.count), 0),
    [data]
  );

  return (
    <ChartCard title={title} description={description}>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="grid min-h-[280px] grid-cols-1 gap-4 lg:grid-cols-[240px_1fr] lg:items-center">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {data.map((_, index) => (
                    <Cell key={`slice-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SimpleTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data.slice(0, 8).map((item, index) => {
              const percent = total ? (toChartValue(item.count) / total) * 100 : 0;
              return (
                <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 rounded border border-slate-100 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 flex-shrink-0 rounded-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="truncate text-xs font-medium text-slate-700" title={String(item.label)}>{item.label}</span>
                  </div>
                  <div className="text-right text-xs font-bold text-slate-800">
                    {formatNumber(item.count)}
                    <div className="text-[11px] font-normal text-slate-500">{formatPercent(percent)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function StackedBarChart({
  chart,
  title,
  description,
  horizontal = false,
}: {
  chart?: ExternalErrorChartResponse;
  title: string;
  description?: string;
  horizontal?: boolean;
}) {
  const data = useMemo(() => chart?.data || [], [chart?.data]);
  const categories = useMemo(
    () => chart?.categories || [],
    [chart?.categories]
  );

  return (
    <ChartCard title={title} description={description}>
      {data.length === 0 || categories.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={horizontal ? "vertical" : "horizontal"}
              margin={{ left: horizontal ? 20 : 4, right: 14, top: 10, bottom: horizontal ? 10 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              {horizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11 }} />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                </>
              )}
              <Tooltip content={<SimpleTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {categories.map((category, index) => (
                <Bar
                  key={category}
                  dataKey={category}
                  name={category}
                  stackId="errors"
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  radius={index === categories.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function RecurringIssuesTable({ items }: { items: ExternalErrorRecurringIssue[] }) {
  return (
    <ChartCard title="Vấn đề lặp lại" description="Các lỗi có normalized issue xuất hiện từ 2 lần trở lên." className="xl:col-span-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-xs">
          <thead className="border-b bg-[#f8fafc] text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Vấn đề</th>
              <th className="px-3 py-2 text-right font-semibold">Số lần</th>
              <th className="px-3 py-2 font-semibold">Thiết bị liên quan</th>
              <th className="px-3 py-2 font-semibold">Loại lỗi</th>
              <th className="px-3 py-2 font-semibold">Nhóm nguyên nhân</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="h-24 text-center text-slate-500">Chưa có vấn đề lặp lại.</td>
              </tr>
            )}
            {items.map((item, index) => (
              <tr key={`${item.normalized_issue}-${index}`} className="border-b border-slate-100 hover:bg-emerald-50">
                <td className="px-3 py-3 font-semibold text-slate-800">{item.normalized_issue}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-800">{formatNumber(item.count)}</td>
                <td className="px-3 py-3 text-slate-600">{item.devices?.join(", ") || "-"}</td>
                <td className="px-3 py-3 text-slate-600">{item.error_types?.join(", ") || "-"}</td>
                <td className="px-3 py-3 text-slate-600">{item.cause_groups?.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

export const ExternalErrorDashboardCharts = memo(function ExternalErrorDashboardCharts({
  charts,
  recurringIssues,
}: {
  charts: {
    byDevice?: ExternalErrorChartResponse;
    bySource?: ExternalErrorChartResponse;
    byErrorType?: ExternalErrorChartResponse;
    trend?: ExternalErrorChartResponse;
    stackedMonthDevice?: ExternalErrorChartResponse;
    stackedDeviceErrorType?: ExternalErrorChartResponse;
    causeDonut?: ExternalErrorChartResponse;
    stackedDeviceCause?: ExternalErrorChartResponse;
  };
  recurringIssues: ExternalErrorRecurringIssue[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RecurringIssuesTable items={recurringIssues} />
      <HorizontalBarChart
        chart={charts.byDevice}
        title="Số lượng lỗi theo thiết bị"
        description="So sánh thiết bị/hệ thống nào phát sinh lỗi nhiều nhất."
      />

      <DonutChart
        chart={charts.bySource}
        title="Nguồn phát hiện lỗi"
        description="Tỷ trọng lỗi đến từ khách hàng, nội bộ hoặc nguồn khác."
      />

      <LineTrendChart chart={charts.trend} />

      <ColumnChart
        chart={charts.byErrorType}
        title="Phân loại lỗi bằng LLM"
        description="Cơ cấu 8 nhóm lỗi sau khi clean và phân loại."
      />

      <StackedBarChart
        chart={charts.stackedMonthDevice}
        title="Cơ cấu thiết bị lỗi theo thời gian"
        description="Theo dõi thiết bị nào tăng/giảm lỗi qua từng tháng."
      />

      <DonutChart
        chart={charts.causeDonut}
        title="Phân bổ nguyên nhân chính"
        description="Tỷ trọng nhóm nguyên nhân sau khi LLM chuẩn hóa."
      />

      <StackedBarChart
        chart={charts.stackedDeviceErrorType}
        title="Loại lỗi theo thiết bị"
        description="Mỗi thiết bị thường gặp loại lỗi nào."
        horizontal
      />

      <StackedBarChart
        chart={charts.stackedDeviceCause}
        title="Nguyên nhân lỗi theo từng thiết bị"
        description="Mỗi thiết bị thường phát sinh từ nhóm nguyên nhân nào."
        horizontal
      />


    </div>
  );
});
