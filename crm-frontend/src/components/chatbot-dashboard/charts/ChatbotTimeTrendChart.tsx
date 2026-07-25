"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import type { TimeSeriesOutcomeItem } from "@/types/chatbot-dashboard.type";

export type GranularityMode = "day" | "week" | "month";

const integerFormatter = new Intl.NumberFormat("vi-VN");
const decimalFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

function GranularitySelector({
  value,
  onChange,
}: {
  value: GranularityMode;
  onChange: (mode: GranularityMode) => void;
}) {
  const options: { key: GranularityMode; label: string }[] = [
    { key: "day", label: "Ngày" },
    { key: "week", label: "Tuần" },
    { key: "month", label: "Tháng" },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-xs">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`cursor-pointer px-3 py-1 text-xs font-bold rounded-md transition-all duration-200 ${
            value === opt.key
              ? "bg-[#00713d] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MetricChip({
  label,
  value,
  caption,
  colorClass = "text-slate-900",
}: {
  label: string;
  value: string;
  caption: string;
  colorClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-extrabold tracking-tight ${colorClass}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{caption}</div>
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as TimeSeriesOutcomeItem | undefined;
  if (!data) return null;

  return (
    <div className="min-w-[220px] rounded-xl border border-slate-100 bg-white p-3 text-xs shadow-lg">
      <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-2">
        {label || data.date}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[#00713d] font-medium">
          <span>🤖 Bot tự xử lý:</span>
          <span className="font-bold">{integerFormatter.format(data.bot_done)}</span>
        </div>
        <div className="flex justify-between items-center text-amber-600 font-medium">
          <span>👨‍💻 Chuyển CCC xử lý:</span>
          <span className="font-bold">{integerFormatter.format(data.ccc)}</span>
        </div>
        <div className="flex justify-between items-center text-[#0097cf] font-medium">
          <span>⏳ Chờ thông tin:</span>
          <span className="font-bold">{integerFormatter.format(data.pending)}</span>
        </div>
        <div className="flex justify-between items-center text-rose-600 font-medium">
          <span>🚫 Câu hỏi rác:</span>
          <span className="font-bold">{integerFormatter.format(data.spam)}</span>
        </div>
        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-slate-900 font-bold">
          <span>Tổng số:</span>
          <span>
            {integerFormatter.format(data.total)} phiên ({decimalFormatter.format(data.bot_done_rate)}% Bot)
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChatbotTimeTrendChart({
  data,
  granularity = "day",
  onGranularityChange,
}: {
  data?: TimeSeriesOutcomeItem[] | null;
  granularity?: GranularityMode;
  onGranularityChange?: (mode: GranularityMode) => void;
}) {
  const [localGranularity, setLocalGranularity] = useState<GranularityMode>(granularity);

  const activeGranularity = granularity || localGranularity;

  const handleGranularityChange = (mode: GranularityMode) => {
    setLocalGranularity(mode);
    if (onGranularityChange) {
      onGranularityChange(mode);
    }
  };

  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu chuỗi thời gian tự động hóa." />;
  }

  const totalSessions = chartData.reduce((sum, d) => sum + d.total, 0);
  const totalBotDone = chartData.reduce((sum, d) => sum + d.bot_done, 0);
  const totalCcc = chartData.reduce((sum, d) => sum + d.ccc, 0);

  const avgBotRate = totalSessions > 0 ? (totalBotDone / totalSessions) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricChip
          label="Tổng tiếp nhận"
          value={integerFormatter.format(totalSessions)}
          caption="phiên hội thoại"
          colorClass="text-slate-900"
        />
        <MetricChip
          label="Tỷ lệ Bot tự xử lý"
          value={`${decimalFormatter.format(avgBotRate)}%`}
          caption={`${integerFormatter.format(totalBotDone)} phiên tự động`}
          colorClass="text-[#00713d]"
        />
        <MetricChip
          label="Chuyển CCC"
          value={integerFormatter.format(totalCcc)}
          caption="yêu cầu hỗ trợ"
          colorClass="text-amber-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Xu hướng tự động hóa theo thời gian
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              So sánh lượng Chatbot tự giải quyết (xanh lá) vs Chuyển người thật CCC (vàng)
            </p>
          </div>

          <GranularitySelector
            value={activeGranularity}
            onChange={handleGranularityChange}
          />
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBotDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00713d" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00713d" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={<TrendTooltip />} />
              <Area type="monotone" dataKey="bot_done" name="Bot tự xử lý" stroke="#00713d" strokeWidth={2.5} fill="url(#colorBotDone)" isAnimationActive={false} />
              <Area type="monotone" dataKey="ccc" name="Chuyển CCC" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorCcc)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
