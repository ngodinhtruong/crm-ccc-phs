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
import { ExpandableChartCard as ChartCard } from "@/components/common";
import type {
  PeriodComparison,
  PeriodComparisonItem,
} from "@/types/chatbot-dashboard.type";

const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatPercent(value: number | null) {
  if (value === null) return "—";

  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function ComparisonTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PeriodComparisonItem }[];
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-xl">
      <div className="mb-1.5 font-bold text-slate-800">{row.label}</div>

      <div className="space-y-0.5 text-slate-600">
        <div>
          Tổng phiên:{" "}
          <span className="font-bold text-slate-900">
            {numberFormatter.format(row.total)}
          </span>
        </div>
        <div>
          Chuyển CCC:{" "}
          <span className="font-semibold text-amber-600">
            {numberFormatter.format(row.ccc)} ({row.ccc_rate}%)
          </span>
        </div>

        {row.prev_label ? (
          <div className="mt-1.5 border-t border-slate-100 pt-1.5">
            {row.prev_label}:{" "}
            <span className="font-semibold text-slate-700">
              {numberFormatter.format(row.prev_total ?? 0)}
            </span>
            <span
              className={
                (row.growth_percent ?? 0) >= 0
                  ? "ml-2 font-bold text-emerald-600"
                  : "ml-2 font-bold text-rose-600"
              }
            >
              {formatPercent(row.growth_percent)}
            </span>
          </div>
        ) : (
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-slate-400">
            Kỳ đầu tiên, chưa có kỳ trước để so sánh.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Biểu đồ so sánh kỳ: mỗi cột là một kỳ, đặt cạnh kỳ liền trước.
 *
 * Mốc so sánh đúng bằng mốc đang chọn — bấm Tháng thì so tháng với tháng,
 * bấm Quý thì so quý với quý, bấm Năm thì so năm với năm.
 *
 * Chi tiết từng kỳ (tổng, kỳ trước, % tăng giảm) nằm trong tooltip; không
 * lặp lại thành cụm thẻ bên dưới vì cột biểu đồ đã mang đúng thông tin đó.
 */
export function PeriodComparisonChart({
  data,
}: {
  data?: PeriodComparison;
}) {
  const items = data?.items || [];
  const unit = data?.granularity_label || "kỳ";

  return (
    <ChartCard
      title={`So sánh theo ${unit.toLowerCase()}`}
      description={`Mỗi ${unit.toLowerCase()} đặt cạnh ${unit.toLowerCase()} liền trước để thấy mức tăng/giảm.`}
      className="xl:col-span-12"
    >
      {items.length === 0 ? (
        <EmptyState message="Chưa đủ dữ liệu để so sánh kỳ." />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items}
              margin={{ top: 24, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                allowDecimals={false}
              />
              <Tooltip
                content={<ComparisonTooltip />}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar
                dataKey="total"
                name="Tổng phiên"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              >
                {items.map((item) => (
                  <Cell
                    key={item.key}
                    fill={
                      item.growth_percent === null
                        ? "#94a3b8"
                        : item.growth_percent >= 0
                          ? "#0097cf"
                          : "#f43f5e"
                    }
                    // Kỳ đang lọc được viền đậm để phân biệt với các kỳ
                    // xung quanh chỉ đưa vào làm nền so sánh.
                    stroke={item.is_current ? "#0f172a" : "none"}
                    strokeWidth={item.is_current ? 2 : 0}
                    fillOpacity={item.is_current ? 1 : 0.45}
                  />
                ))}
                <LabelList
                  dataKey="growth_percent"
                  position="top"
                  style={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
                  formatter={(value: unknown) =>
                    value === null || value === undefined
                      ? ""
                      : formatPercent(Number(value))
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
