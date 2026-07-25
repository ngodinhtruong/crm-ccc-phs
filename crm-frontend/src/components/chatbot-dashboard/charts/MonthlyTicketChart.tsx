"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import type { ChatbotMonthlyTicketItem } from "@/types/chatbot-dashboard.type";

const BAR_COLORS = [
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
  return integerFormatter.format(
    Number.isFinite(value) ? value : 0,
  );
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

      <div className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {caption}
      </div>
    </div>
  );
}

type TicketTooltipPayload = {
  value?: number | string;
  payload?: ChatbotMonthlyTicketItem;
};

function TicketTooltip({
  active,
  payload,
  label,
  total,
}: {
  active?: boolean;
  payload?: TicketTooltipPayload[];
  label?: string;
  total: number;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;

  const rawCount = item?.count ?? payload[0]?.value ?? 0;
  const count = Number(rawCount);
  const safeCount = Number.isFinite(count) ? count : 0;

  const share = total > 0
    ? (safeCount / total) * 100
    : 0;

  return (
    <div className="min-w-[200px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/80">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />

        <div className="text-sm font-semibold text-slate-700">
          {label ?? item?.month_label ?? "-"}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Ticket chatbot
          </div>

          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {formatCount(safeCount)}
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

export function MonthlyTicketChart({
  data,
}: {
  data?: ChatbotMonthlyTicketItem[] | null;
}) {
  const chartData = Array.isArray(data)
    ? data.map((item) => {
      const count = Number(item?.count ?? 0);

      return {
        ...item,
        count: Number.isFinite(count) ? count : 0,
        month_label: item?.month_label || "-",
        month_key: item?.month_key || item?.month_label || "-",
      };
    })
    : [];

  if (chartData.length === 0) {
    return (
      <EmptyState message="Không có dữ liệu ticket chatbot theo tháng." />
    );
  }

  const total = chartData.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const peakMonth = chartData.reduce(
    (best, item) => (
      item.count > best.count ? item : best
    ),
    chartData[0],
  );

  const average = total / chartData.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricChip
          label="Tổng ticket"
          value={formatCount(total)}
          caption="trong kỳ lọc"
        />

        <MetricChip
          label="Tháng cao nhất"
          value={peakMonth.month_label}
          caption={`${formatCount(peakMonth.count)} ticket`}
        />

        <MetricChip
          label="Trung bình / tháng"
          value={decimalFormatter.format(average)}
          caption="ticket chatbot"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Biểu đồ ticket theo tháng
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Mỗi cột là số ticket/request chatbot được sinh trong
              một tháng của kỳ lọc.
            </div>
          </div>

          <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
            {chartData.length} tháng
          </div>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 8,
                left: 0,
                bottom: 0,
              }}
              barCategoryGap="18%"
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="month_label"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                interval={0}
                tick={{
                  fontSize: 11,
                  fontWeight: 600,
                  fill: "#64748b",
                }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                width={38}
                allowDecimals={false}
                tick={{
                  fontSize: 11,
                  fill: "#64748b",
                }}
              />

              <Tooltip
                content={<TicketTooltip total={total} />}
                cursor={{
                  fill: "rgba(14, 165, 233, 0.08)",
                }}
              />

              <Bar
                dataKey="count"
                name="Ticket chatbot"
                fill="#0ea5e9"
                stroke="#ffffff"
                strokeWidth={1}
                barSize={34}
                isAnimationActive={false}
              >
                {chartData.map((item, index) => (
                  <Cell
                    key={`${item.month_key}-${index}`}
                    fill={
                      BAR_COLORS[index % BAR_COLORS.length]
                    }
                  />
                ))}

                <LabelList
                  dataKey="count"
                  position="top"
                  offset={8}
                  formatter={(value: unknown) =>
                    formatCount(Number(value ?? 0))
                  }
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fill: "#475569",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}