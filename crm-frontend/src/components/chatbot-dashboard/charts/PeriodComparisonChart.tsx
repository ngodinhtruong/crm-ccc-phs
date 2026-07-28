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
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import { ExpandableChartCard as ChartCard } from "@/components/common";
import type { PeriodComparison } from "@/types/chatbot-dashboard.type";

const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatPercent(value: number | null) {
  if (value === null) return "—";

  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

/** Xanh khi tăng, đỏ khi giảm, xám khi không so được. */
function growthTone(value: number | null) {
  if (value === null) return "bg-slate-100 text-slate-500 ring-slate-200";
  if (value > 0) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (value < 0) return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function GrowthIcon({ value }: { value: number | null }) {
  if (value === null || value === 0) return <Minus size={12} />;
  if (value > 0) return <ArrowUpRight size={12} />;
  return <ArrowDownRight size={12} />;
}

function ComparisonTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload as PeriodComparison["items"][number];

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
 * Mốc so sánh do backend chọn, luôn thô hơn mốc chính một bậc — xem theo
 * tháng thì so sánh theo quý, xem theo quý thì so sánh theo năm.
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
        <div className="space-y-4">
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
                <Bar dataKey="total" name="Tổng phiên" radius={[6, 6, 0, 0]}>
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

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.key}
                className={`rounded-lg border px-3 py-2.5 ${
                  item.is_current
                    ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900/10"
                    : "border-slate-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    {item.label}
                    {item.is_current && (
                      <span className="ml-1.5 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        đang xem
                      </span>
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${growthTone(
                      item.growth_percent
                    )}`}
                  >
                    <GrowthIcon value={item.growth_percent} />
                    {formatPercent(item.growth_percent)}
                  </span>
                </div>

                <div className="mt-1.5 text-lg font-black text-slate-900">
                  {numberFormatter.format(item.total)}
                </div>

                <div className="mt-0.5 text-[11px] text-slate-500">
                  {item.prev_label
                    ? `${item.prev_label}: ${numberFormatter.format(
                        item.prev_total ?? 0
                      )}`
                    : "Không có kỳ trước"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
