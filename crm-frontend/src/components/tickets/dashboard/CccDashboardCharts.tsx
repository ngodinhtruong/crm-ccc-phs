"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  CccDashboardCharts as CccCharts,
  CccDashboardMonthlyCategoryItem,
  CccDashboardMonthlySourceItem,
  CccDashboardReportTimeCategoryItem,
} from "@/types/ccc-dashboard.type";
import {
  formatDate,
  formatDays,
  formatNumber,
  getMonthLabel,
  rootCauseLabel,
} from "./CccDashboardUtils";

const COLORS = [
  "#00713d",
  "#0097cf",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#84cc16",
  "#f97316",
  "#0f766e",
  "#7c3aed",
  "#64748b",
  "#dc2626",
];

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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#00713d]">
          {title}
        </h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

function ValueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-slate-700">{label}</div>
      <div className="space-y-0.5">
        {payload.map((item: any, index: number) => (
          <div key={`${item.dataKey}-${index}`} className="flex items-center justify-between gap-4">
            <span style={{ color: item.color }}>{item.name}</span>
            <span className="font-semibold text-slate-800">
              {typeof item.value === "number" ? formatNumber(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DaysTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-slate-700">{label}</div>
      <div className="space-y-0.5">
        {payload.map((item: any, index: number) => (
          <div key={`${item.dataKey}-${index}`} className="flex items-center justify-between gap-4">
            <span style={{ color: item.color }}>{item.name}</span>
            <span className="font-semibold text-slate-800">{formatDays(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isEmpty(items?: unknown[]) {
  return !items || items.length === 0;
}



function TicketResultCharts({ charts }: { charts: CccCharts }) {
  const data = (charts.report_monthly_processing || []).map((item) => ({
    ...item,
    label: getMonthLabel(item),
    processed: item.processed ?? item.resolved ?? 0,
    cancelled: item.cancelled ?? 0,
    total: item.total ?? 0,
  }));

  if (isEmpty(data)) {
    return <EmptyState message="Không có dữ liệu kết quả xử lý ticket." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Tổng số ticket">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Bar isAnimationActive={false} dataKey="total" name="Tổng ticket" fill="#0072bc" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Tổng ticket xử lý">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Bar isAnimationActive={false} dataKey="processed" name="Đã xử lý" fill="#5ca05a" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="processed" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="space-y-4">
        <ChartCard title="Tổng ticket hủy">
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Bar isAnimationActive={false} dataKey="cancelled" name="Spam / Đã hủy" fill="#df6b32" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="cancelled" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function getSourceName(item: CccDashboardMonthlySourceItem) {
  return item.source_name || item.source__source_name || "Chưa có nguồn";
}

function getCategoryName(item: CccDashboardMonthlyCategoryItem) {
  return item.category_name || item.support_category__category_name || "Chưa có danh mục";
}

function pivotByDimension<T>(
  items: T[],
  getDimension: (item: T) => string,
  getMonth: (item: T) => string,
  getValue: (item: T) => number
) {
  const months = Array.from(new Set(items.map(getMonth))).filter(Boolean);
  const map = new Map<string, Record<string, number | string>>();

  for (const item of items) {
    const name = getDimension(item);
    const month = getMonth(item);
    const value = getValue(item);

    if (!map.has(name)) {
      map.set(name, { name });
    }

    map.get(name)![month] = Number(map.get(name)![month] || 0) + value;
  }

  return {
    months,
    rows: Array.from(map.values()),
  };
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

function SourceAnalysisCharts({ charts }: { charts: CccCharts }) {
  const items = charts.report_source || [];

  if (isEmpty(items)) {
    return <EmptyState message="Không có dữ liệu phân tích theo nguồn." />;
  }

  const processedPivot = pivotByDimension(
    items,
    getSourceName,
    (item) => item.month_label || item.period_label || String(item.month_key || ""),
    (item) => item.processed ?? item.resolved ?? 0
  );

  const cancelledPivot = pivotByDimension(
    items,
    getSourceName,
    (item) => item.month_label || item.period_label || String(item.month_key || ""),
    (item) => item.cancelled || 0
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Ticket đã xử lý" description="So sánh ticket đã xử lý theo nguồn và tháng.">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedPivot.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {processedPivot.months.map((month, index) => (
                  <Bar
                    key={month}
                    dataKey={month}
                    name={month}
                    fill={COLORS[index % COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Spam / Đã hủy" description="So sánh ticket spam/hủy theo nguồn và tháng.">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cancelledPivot.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {cancelledPivot.months.map((month, index) => (
                  <Bar
                    key={month}
                    dataKey={month}
                    name={month}
                    fill={COLORS[index % COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
    </div>
  );
}

function CategoryAnalysisCharts({ charts }: { charts: CccCharts }) {
  const items = charts.report_category || [];

  if (isEmpty(items)) {
    return <EmptyState message="Không có dữ liệu phân tích theo danh mục." />;
  }

  const processedPivot = pivotByMonth(
    items,
    getCategoryName,
    (item) => item.month_label || item.period_label || String(item.month_key || ""),
    (item) => item.processed ?? item.resolved ?? 0
  );

  const cancelledPivot = pivotByMonth(
    items,
    getCategoryName,
    (item) => item.month_label || item.period_label || String(item.month_key || ""),
    (item) => item.cancelled || 0
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Ticket đã xử lý theo danh mục"
        description="Stacked bar theo tháng, trừ ticket khảo sát eKYC/spam."
      >
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedPivot.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {processedPivot.dimensions.map((dimension, index) => (
                <Bar
                  key={dimension}
                  dataKey={dimension}
                  name={dimension}
                  stackId="processed"
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Spam / Đã hủy theo danh mục"
        description="Stacked bar theo danh mục và tháng."
      >
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cancelledPivot.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {cancelledPivot.dimensions.map((dimension, index) => (
                <Bar
                  key={dimension}
                  dataKey={dimension}
                  name={dimension}
                  stackId="cancelled"
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

function UnitAnalysisCharts({ charts }: { charts: CccCharts }) {
  const items = charts.report_unit || [];

  if (isEmpty(items)) {
    return <EmptyState message="Không có dữ liệu phân tích theo đơn vị xử lý." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Ticket đã xử lý theo đơn vị xử lý"
        description="Tách ticket do TT.CSKH xử lý và ticket chuyển PBLQ."
      >
        <div className="h-[310px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive={false} dataKey="cs_processed" name="Ticket xử lý bởi TT.CSKH" fill="#5ca05a" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="cs_processed" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
              <Bar isAnimationActive={false} dataKey="related_processed" name="Ticket chuyển đến PBLQ xử lý" fill="#ff9466" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="related_processed" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Spam / Đã hủy theo đơn vị xử lý"
        description="Ticket hủy/spam do CS hoặc PBLQ xử lý."
      >
        <div className="h-[310px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive={false} dataKey="cs_cancelled" name="Ticket xử lý bởi TT.CSKH" fill="#0072bc" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="cs_cancelled" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
              <Bar isAnimationActive={false} dataKey="related_cancelled" name="Ticket chuyển đến PBLQ xử lý" fill="#ffc84a" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="related_cancelled" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

function TimeChart({
  title,
  items,
  currentLabel = "Tháng hiện tại",
  previousLabel = "Tháng trước",
}: {
  title: string;
  items: CccDashboardReportTimeCategoryItem[];
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
    <ChartCard title={title} description="ĐVT: ngày xử lý. Benchmark tham chiếu: 1–3 ngày tùy luồng.">
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="category_name" tick={{ fontSize: 10, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<DaysTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar isAnimationActive={false} dataKey="previous_avg_days" name={previousLabel} fill="#7c8f22" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="previous_avg_days" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
            </Bar>
            <Bar isAnimationActive={false} dataKey="current_avg_days" name={currentLabel} fill="#d97706" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="current_avg_days" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function TimeAnalysisCharts({ charts }: { charts: CccCharts }) {
  const time = charts.report_time;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <TimeChart
        title="Thời gian trung bình CS xử lý ticket tiếp nhận"
        items={time?.cs_by_category || []}
      />

      <TimeChart
        title="Thời gian trung bình CS & PBLQ xử lý ticket"
        items={time?.related_by_category || []}
      />
    </div>
  );
}

function SlaCharts({ charts }: { charts: CccCharts }) {
  const sla = charts.report_sla;

  if (!sla) {
    return <EmptyState message="Không có dữ liệu SLA." />;
  }

  const monthly = sla.monthly || [];
  const category = sla.overdue_by_category || [];
  const unitMonth = sla.overdue_by_unit_month || [];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Kết quả ticket có SLA">
        {isEmpty(monthly) ? (
          <EmptyState message="Không có ticket có SLA." />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month_label" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar isAnimationActive={false} dataKey="on_time" name="Không trễ hạn" fill="#0097cf" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="on_time" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
                <Bar isAnimationActive={false} dataKey="overdue" name="Trễ hạn" fill="#ef4444" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="overdue" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
                <Bar isAnimationActive={false} dataKey="processing" name="Đang xử lý" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="processing" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Phân loại ticket trễ hạn">
        {isEmpty(category) ? (
          <EmptyState message="Không phát sinh ticket trễ hạn." />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={category}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category_name" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar isAnimationActive={false} dataKey="not_overdue" name="Không trễ hạn" fill="#0097cf" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="not_overdue" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
                <Bar isAnimationActive={false} dataKey="overdue" name="Trễ hạn" fill="#ef4444" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="overdue" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Chi tiết tác vụ PBLQ trễ hạn"
        description="Số ticket trễ hạn theo đơn vị xử lý và tháng."
        className="xl:col-span-2"
      >
        {isEmpty(unitMonth) ? (
          <EmptyState message="Không có tác vụ PBLQ trễ hạn." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Tháng</th>
                  <th className="px-3 py-2 font-semibold">Đơn vị xử lý</th>
                  <th className="px-3 py-2 text-right font-semibold">Số ticket trễ hạn</th>
                </tr>
              </thead>
              <tbody>
                {unitMonth.map((item, index) => (
                  <tr key={`${item.month_key}-${item.unit_name}-${index}`} className="border-t">
                    <td className="px-3 py-2 font-medium">{item.month_label}</td>
                    <td className="px-3 py-2">{item.unit_name}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatNumber(item.overdue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function EmployeeCharts({ charts }: { charts: CccCharts }) {
  const items = charts.report_employee || [];

  if (isEmpty(items)) {
    return <EmptyState message="Không có dữ liệu theo từng NVCS." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Kết quả xử lý ticket theo từng NVCS">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="employee_name" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive={false} dataKey="processed" name="Ticket xử lý" fill="#5ca05a" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="processed" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
              <Bar isAnimationActive={false} dataKey="related_processed" name="Chuyển PBLQ xử lý" fill="#ffbf00" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="related_processed" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
              <Bar isAnimationActive={false} dataKey="cancelled" name="Ticket hủy" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="cancelled" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
              <Bar isAnimationActive={false} dataKey="ekyc" name="Ticket gọi eKYC" fill="#60a5fa" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="ekyc" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Thời gian trung bình CS tiếp nhận ticket">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="employee_name" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<DaysTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive={false} dataKey="avg_cs_days" name="Ticket xử lý" fill="#7c8f22" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="avg_cs_days" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
              <Bar isAnimationActive={false} dataKey="avg_related_days" name="Ticket chuyển PBLQ" fill="#e8b2dc" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="avg_related_days" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

function RootCausePie({ charts }: { charts: CccCharts }) {
  const data = (charts.root_cause_breakdown || []).map((item) => ({
    name: rootCauseLabel(item),
    value: item.count || 0,
  }));

  if (isEmpty(data)) return null;

  return (
    <ChartCard title="Nhóm lỗi phát sinh nhiều">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={95} label>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ValueTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function CccDashboardCharts({ charts }: { charts: CccCharts }) {
  return (
    <div className="space-y-5">
      <TicketResultCharts charts={charts} />
      <SourceAnalysisCharts charts={charts} />
      <CategoryAnalysisCharts charts={charts} />
      <UnitAnalysisCharts charts={charts} />
      <TimeAnalysisCharts charts={charts} />
      <SlaCharts charts={charts} />
      <EmployeeCharts charts={charts} />
      <RootCausePie charts={charts} />
    </div>
  );
}
