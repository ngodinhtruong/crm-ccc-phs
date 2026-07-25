"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import type { HourlyPeakItem } from "@/types/chatbot-dashboard.type";

const integerFormatter = new Intl.NumberFormat("vi-VN");

function HourlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as HourlyPeakItem | undefined;
  if (!data) return null;

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-100 bg-white p-3 text-xs shadow-lg">
      <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1.5">
        Khung giờ: {label}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center text-slate-600">
          <span>Tổng lượng hội thoại:</span>
          <span className="font-bold text-slate-900">{integerFormatter.format(data.total)}</span>
        </div>
        <div className="flex justify-between items-center text-[#00713d]">
          <span>Bot tự giải quyết:</span>
          <span className="font-bold">{integerFormatter.format(data.bot_done)}</span>
        </div>
        <div className="flex justify-between items-center text-amber-600">
          <span>Yêu cầu gặp CCC:</span>
          <span className="font-bold">{integerFormatter.format(data.ccc)}</span>
        </div>
      </div>
    </div>
  );
}

export function HourlyPeakChart({
  data,
}: {
  data?: HourlyPeakItem[] | null;
}) {
  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu khung giờ cao điểm." />;
  }

  const peakHour = chartData.reduce(
    (best, item) => (item.total > best.total ? item : best),
    chartData[0]
  );

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Khung giờ cao điểm trong ngày (24-Hour Peak Hours)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Số phiên hội thoại theo từng khung giờ. Giờ cao nhất:{" "}
            <span className="font-bold text-[#00713d]">
              {peakHour?.label || "-"} ({integerFormatter.format(peakHour?.total || 0)} phiên)
            </span>
          </p>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip content={<HourlyTooltip />} />
            <Bar dataKey="total" name="Tổng hội thoại" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill={entry.total === peakHour.total && entry.total > 0 ? "#00713d" : "#0097cf"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
