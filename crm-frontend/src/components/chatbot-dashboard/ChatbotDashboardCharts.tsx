"use client";

import { useMemo, useState } from "react";
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
import { FunnelChartComponent } from "@/components/chatbot-dashboard/charts/FunnelChartComponent";
import { ExpandableChartCard as ChartCard } from "@/components/common";
import type {
  CategoryCccRateItem,
  CccMultiMonthTopicsData,
  ChannelPerformanceItem,
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  CustomerLinkageData,
  FunnelStepItem,
  HourlyPeakItem,
  TimeSeriesOutcomeItem,
} from "@/types/chatbot-dashboard.type";

export type ChatbotOverviewCharts = ChatbotOverviewResponse["charts"];
export type GranularityMode = "day" | "week" | "month";

const COLORS = [
  "#0097cf", // Primary PHS Sky Blue
  "#00713d", // PHS Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#0f766e", // Teal
  "#64748b", // Slate
];

const integerFormatter = new Intl.NumberFormat("vi-VN");

function formatNumber(val: number) {
  return integerFormatter.format(val || 0);
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
          className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200 ${
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

/* ====================================================================
 * 📊 TOP SECTION: XU HƯỚNG TỰ ĐỘNG HÓA (BOT TỰ XỬ LÝ VS CHUYỂN CCC)
 * ==================================================================== */
function AutomationTrendChartCard({
  data,
  granularity = "month",
  onGranularityChange,
}: {
  data?: TimeSeriesOutcomeItem[] | null;
  granularity?: GranularityMode;
  onGranularityChange?: (mode: GranularityMode) => void;
}) {
  const chartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) return data;
    const now = new Date();
    const fallback: TimeSeriesOutcomeItem[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      fallback.push({
        date: `${d.getFullYear()}-${mStr}`,
        label: `T${mStr}/${d.getFullYear()}`,
        total: 0,
        bot_done: 0,
        ccc: 0,
        pending: 0,
        spam: 0,
        bot_done_rate: 0,
      });
    }
    return fallback;
  }, [data]);

  return (
    <ChartCard
      title="Xu hướng Tự động hóa & Phân loại Xử lý (Bot tự xử lý vs Chuyển CCC)"
      description="Trục hoành: Chuỗi thời gian | Vùng Xanh: Bot tự xử lý (BOT_DONE) | Cột Vàng: Chuyển CCC (CCC)"
      headerRight={
        onGranularityChange && (
          <GranularitySelector value={granularity} onChange={onGranularityChange} />
        )
      }
      className="xl:col-span-12"
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 25, left: 0, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip content={<ValueTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <Area
              type="monotone"
              dataKey="bot_done"
              name="Bot tự xử lý (BOT_DONE)"
              fill="#00713d"
              stroke="#00713d"
              fillOpacity={0.2}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
            <Bar
              dataKey="ccc"
              name="Chuyển CCC (CCC)"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              barSize={24}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="ccc"
                position="top"
                style={{ fontSize: 10, fill: "#b45309", fontWeight: 700 }}
                formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 📈 1. XU HƯỚNG SESSION THEO THỜI GIAN (LINE CHART)
 * ==================================================================== */
function SessionTrendLineChartCard({
  data,
}: {
  data?: TimeSeriesOutcomeItem[] | null;
}) {
  const chartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) return data;
    const now = new Date();
    const fallback: TimeSeriesOutcomeItem[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      fallback.push({
        date: `${d.getFullYear()}-${mStr}`,
        label: `T${mStr}/${d.getFullYear()}`,
        total: 0,
        bot_done: 0,
        ccc: 0,
        pending: 0,
        spam: 0,
        bot_done_rate: 0,
      });
    }
    return fallback;
  }, [data]);

  return (
    <ChartCard
      title="📈 1. Xu hướng Session theo Thời gian"
      description="Chatbot đang được sử dụng nhiều hay ít theo thời gian?"
      className="xl:col-span-8"
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 25, left: 0, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip content={<ValueTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <Line
              type="monotone"
              dataKey="total"
              name="Tổng số Session"
              stroke="#0097cf"
              strokeWidth={3}
              dot={{ r: 4, fill: "#0097cf" }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="total"
                position="top"
                style={{ fontSize: 10, fill: "#0097cf", fontWeight: 700 }}
                formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 🍩 2. KẾT QUẢ XỬ LÝ PHIÊN CHAT (DONUT CHART)
 * ==================================================================== */
function OutcomeDonutChartCard({
  processClassification,
}: {
  processClassification?: any[] | null;
}) {
  const chartData = useMemo(() => {
    if (Array.isArray(processClassification) && processClassification.length > 0) {
      return processClassification.map((item) => {
        let color = "#64748b";
        if (item.code === "BOT_DONE") color = "#00713d";
        if (item.code === "CCC") color = "#f59e0b";
        if (item.code === "PENDING") color = "#0284c7";
        if (item.code === "SPAM") color = "#ef4444";
        return {
          name: item.name || item.label,
          value: item.session_count || item.value || 0,
          color,
        };
      });
    }
    return [
      { name: "Chatbot tự xử lý (BOT_DONE)", value: 0, color: "#00713d" },
      { name: "Chuyển CCC xử lý (CCC)", value: 0, color: "#f59e0b" },
      { name: "Chờ thông tin KH (PENDING)", value: 0, color: "#0284c7" },
      { name: "Câu hỏi rác (SPAM)", value: 0, color: "#ef4444" },
    ];
  }, [processClassification]);

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <ChartCard
      title="🍩 2. Kết quả Xử lý Phiên Chat"
      description="Chatbot đang tự xử lý thành công được bao nhiêu %? (BOT_DONE / CCC / PENDING / SPAM)"
      className="xl:col-span-4"
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              isAnimationActive={false}
              label={({ percent }) =>
                percent && percent >= 0.02
                  ? `${(percent * 100).toFixed(1)}%`
                  : ""
              }
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ValueTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string, entry: any) => {
                const item = entry.payload;
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

function formatLabelByWords(text: string, maxWords: number = 6) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length > maxWords) {
    return `${words.slice(0, maxWords).join(" ")}...`;
  }
  return text;
}

function CustomCategoryAxisTick({ x, y, payload }: any) {
  const text = payload?.value || "";
  const formatted = formatLabelByWords(text, 6);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#334155" fontSize={11} fontWeight={600}>
        {formatted}
      </text>
    </g>
  );
}

/* ====================================================================
 * 📊 3. TOP CATEGORY ĐƯỢC HỎI NHIỀU NHẤT (HORIZONTAL BAR & TIME SERIES)
 * ==================================================================== */
function TopCategoryHorizontalBarCard({
  data,
  multiMonthData,
}: {
  data?: any[] | null;
  multiMonthData?: CccMultiMonthTopicsData | null;
}) {
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("DEFAULT");

  const defaultChartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, 6).map((item) => ({
        name: item.name,
        value: item.value,
      }));
    }
    return [];
  }, [data]);

  const timeSeriesData = useMemo(() => {
    if (multiMonthData && multiMonthData.data_by_category?.length > 0) {
      return multiMonthData;
    }
    return {
      month_labels: [],
      top_categories: [],
      data_by_category: [],
    };
  }, [multiMonthData]);

  const monthLabels = timeSeriesData.month_labels;

  return (
    <ChartCard
      title="📊 3. Top Category Khách hàng Hỏi nhiều nhất"
      description={
        viewMode === "DEFAULT"
          ? "Khách hàng đang quan tâm vấn đề gì nhất? (Tổng quan)"
          : "Trục hoành: Các chủ đề nghiệp vụ | Biến động theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("DEFAULT")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "DEFAULT"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TIME")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "TIME"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📅 Theo thời gian
          </button>
        </div>
      }
      className="xl:col-span-6"
    >
      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "DEFAULT" ? (
            <BarChart
              layout="vertical"
              data={defaultChartData}
              margin={{ top: 10, right: 45, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickFormatter={(val: string) => formatLabelByWords(val, 6)}
                tick={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }}
                width={140}
              />
              <Tooltip content={<ValueTooltip />} />
              <Bar dataKey="value" name="Số lượt hỏi" fill="#0097cf" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 11, fill: "#0284c7", fontWeight: 700 }}
                  formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                />
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={timeSeriesData.data_by_category}
              margin={{ top: 20, right: 25, left: -10, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={<CustomCategoryAxisTick />}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              {monthLabels.map((mLabel, idx) => (
                <Bar
                  key={mLabel}
                  dataKey={mLabel}
                  name={mLabel}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={mLabel}
                    position="top"
                    style={{ fontSize: 9, fill: "#334155", fontWeight: 700 }}
                    formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                  />
                </Bar>
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 📊 4. TỶ LỆ CHUYỂN CCC THEO CATEGORY (HORIZONTAL BAR & TIME SERIES)
 * ==================================================================== */
function CategoryCccRateHorizontalBarCard({
  data,
  multiMonthData,
}: {
  data?: CategoryCccRateItem[] | null;
  multiMonthData?: CccMultiMonthTopicsData | null;
}) {
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("DEFAULT");

  const defaultChartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, 6).map((item) => ({
        name: item.name,
        ccc: item.ccc,
        total: item.total,
        rate: item.rate,
      }));
    }
    return [];
  }, [data]);

  const timeSeriesData = useMemo(() => {
    if (multiMonthData && multiMonthData.data_by_category?.length > 0) {
      return multiMonthData;
    }
    return {
      month_labels: [],
      top_categories: [],
      data_by_category: [],
    };
  }, [multiMonthData]);

  const monthLabels = timeSeriesData.month_labels;

  return (
    <ChartCard
      title="📊 4. Số lượt Chuyển CCC theo Category"
      description={
        viewMode === "DEFAULT"
          ? "Biết số lượt phiên chuyển CCC hỗ trợ cho từng chủ đề nghiệp vụ"
          : "Trục hoành: Các chủ đề nghiệp vụ | Số lượt chuyển CCC theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("DEFAULT")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "DEFAULT"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TIME")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "TIME"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📅 Theo thời gian
          </button>
        </div>
      }
      className="xl:col-span-6"
    >
      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "DEFAULT" ? (
            <BarChart
              layout="vertical"
              data={defaultChartData}
              margin={{ top: 10, right: 45, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickFormatter={(val: string) => formatLabelByWords(val, 6)}
                tick={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }}
                width={140}
              />
              <Tooltip content={<ValueTooltip />} />
              <Bar dataKey="ccc" name="Số lượt chuyển CCC" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                <LabelList
                  dataKey="ccc"
                  position="right"
                  style={{ fontSize: 11, fill: "#b45309", fontWeight: 700 }}
                  formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                />
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={timeSeriesData.data_by_category}
              margin={{ top: 20, right: 25, left: -10, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={<CustomCategoryAxisTick />}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              {monthLabels.map((mLabel, idx) => (
                <Bar
                  key={mLabel}
                  dataKey={mLabel}
                  name={mLabel}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={mLabel}
                    position="top"
                    style={{ fontSize: 9, fill: "#334155", fontWeight: 700 }}
                    formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                  />
                </Bar>
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 🔻 5. FUNNEL CHUYỂN ĐỔI CHATBOT → TICKET → CCC (FUNNEL CHART)
 * ==================================================================== */
function ChatbotFunnelChartCard({ data }: { data?: FunnelStepItem[] | null }) {
  return (
    <ChartCard
      title="🔻 5. Funnel Chuyển đổi Chatbot → Ticket → CCC"
      description="Theo dõi tỷ lệ rơi rớt (drop-off) qua 6 bước nghiệp vụ từ tiếp nhận tới xử lý xong"
      className="xl:col-span-6"
    >
      <div className="min-h-[320px] flex items-center justify-center">
        <FunnelChartComponent data={data} />
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 🕒 6. SESSION THEO KHUNG GIỜ TRONG NGÀY (HOURLY PEAK)
 * ==================================================================== */
function HourlyPeakChartCard({ data }: { data?: HourlyPeakItem[] | null }) {
  const chartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) return data;
    return [];
  }, [data]);

  return (
    <ChartCard
      title="🕒 6. Session theo Khung Giờ trong Ngày (0h - 23h)"
      description="Xác định các khoảng thời gian bùng nổ lượng chat để chủ động bố trí nhân sự CCC"
      className="xl:col-span-6"
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#334155" }} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip content={<ValueTooltip />} />
            <Bar dataKey="count" name="Số lượt chat" fill="#00713d" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function CustomYAxisReasonTick({ x, y, payload }: any) {
  const text = payload?.value || "";
  const formatted = formatLabelByWords(text, 6);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-6} y={4} textAnchor="end" fill="#1e293b" fontSize={11} fontWeight={600}>
        {formatted}
      </text>
    </g>
  );
}

/* ====================================================================
 * 📊 7. TOP LÝ DO CHUYỂN CCC (HORIZONTAL BAR & TIME SERIES)
 * ==================================================================== */
function TopReasonHorizontalBarCard({
  data,
  multiPeriodData,
}: {
  data?: any[] | null;
  multiPeriodData?: CccMultiMonthTopicsData | null;
}) {
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("DEFAULT");

  const defaultChartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, 6).map((item) => ({
        name: item.name,
        value: item.value,
      }));
    }
    return [];
  }, [data]);

  const timeSeriesData = useMemo(() => {
    if (multiPeriodData && multiPeriodData.data_by_category?.length > 0) {
      return multiPeriodData;
    }
    return {
      month_labels: [],
      top_categories: [],
      data_by_category: [],
    };
  }, [multiPeriodData]);

  const monthLabels = timeSeriesData.month_labels;

  return (
    <ChartCard
      title="📊 7. Top Lý do Chuyển CCC"
      description={
        viewMode === "DEFAULT"
          ? "Dựa vào trường reason để tìm điểm nghẽn và cải tiến kịch bản Chatbot"
          : "Trục hoành: Các lý do chuyển CCC | Biến động theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("DEFAULT")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "DEFAULT"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TIME")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "TIME"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📅 Theo thời gian
          </button>
        </div>
      }
      className="xl:col-span-6"
    >
      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "DEFAULT" ? (
            <BarChart
              layout="vertical"
              data={defaultChartData}
              margin={{ top: 10, right: 45, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                interval={0}
                tick={<CustomYAxisReasonTick />}
                width={180}
              />
              <Tooltip content={<ValueTooltip />} />
              <Bar dataKey="value" name="Số phiên" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 11, fill: "#6d28d9", fontWeight: 700 }}
                  formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                />
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={timeSeriesData.data_by_category}
              margin={{ top: 25, right: 25, left: -10, bottom: 45 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={<CustomCategoryAxisTick />}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              {monthLabels.map((mLabel, idx) => (
                <Bar
                  key={mLabel}
                  dataKey={mLabel}
                  name={mLabel}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={mLabel}
                    position="top"
                    style={{ fontSize: 9, fill: "#334155", fontWeight: 700 }}
                    formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                  />
                </Bar>
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 📊 8. HIỆU QUẢ THEO CHANNEL (GROUPED BAR & TIME SERIES)
 * ==================================================================== */
function ChannelPerformanceBarCard({
  data,
  multiPeriodData,
}: {
  data?: ChannelPerformanceItem[] | null;
  multiPeriodData?: CccMultiMonthTopicsData | null;
}) {
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("DEFAULT");

  const defaultChartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) return data;
    return [];
  }, [data]);

  const timeSeriesData = useMemo(() => {
    if (multiPeriodData && multiPeriodData.data_by_category?.length > 0) {
      return multiPeriodData;
    }
    return {
      month_labels: [],
      top_categories: [],
      data_by_category: [],
    };
  }, [multiPeriodData]);

  const monthLabels = timeSeriesData.month_labels;

  return (
    <ChartCard
      title="📊 Hiệu quả theo Channel (Web / App / Zalo / Facebook)"
      description={
        viewMode === "DEFAULT"
          ? "Đánh giá kịch bản Chatbot hoạt động tốt nhất trên kênh giao tiếp nào"
          : "Trục hoành: Các kênh giao tiếp | Số phiên theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("DEFAULT")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "DEFAULT"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TIME")}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === "TIME"
                ? "bg-[#00713d] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📅 Theo thời gian
          </button>
        </div>
      }
      className="xl:col-span-6"
    >
      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "DEFAULT" ? (
            <BarChart data={defaultChartData} margin={{ top: 20, right: 25, left: 0, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Bar dataKey="bot_done" name="Bot xử lý (phiên)" fill="#00713d" radius={[4, 4, 0, 0]} barSize={22} isAnimationActive={false}>
                <LabelList
                  dataKey="bot_done"
                  position="top"
                  style={{ fontSize: 9, fill: "#00713d", fontWeight: 700 }}
                  formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                />
              </Bar>
              <Bar dataKey="ccc" name="Chuyển CCC (phiên)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} isAnimationActive={false}>
                <LabelList
                  dataKey="ccc"
                  position="top"
                  style={{ fontSize: 9, fill: "#b45309", fontWeight: 700 }}
                  formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                />
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={timeSeriesData.data_by_category}
              margin={{ top: 20, right: 25, left: -10, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={<CustomCategoryAxisTick />}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              {monthLabels.map((mLabel, idx) => (
                <Bar
                  key={mLabel}
                  dataKey={mLabel}
                  name={mLabel}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={mLabel}
                    position="top"
                    style={{ fontSize: 9, fill: "#334155", fontWeight: 700 }}
                    formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                  />
                </Bar>
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 📋 8. TOP CÂU HỎI PHỔ BIẾN (TABLE)
 * ==================================================================== */
function TopFaqTableCard({ faqs }: { faqs?: ChatbotFaqItem[] | null }) {
  const list = useMemo(() => {
    if (Array.isArray(faqs) && faqs.length > 0) return faqs;
    return [];
  }, [faqs]);

  return (
    <ChartCard
      title="📋 8. Top Câu hỏi Phổ biến (Knowledge Base)"
      description="Danh sách các câu hỏi thường gặp nhất làm cơ sở xây dựng bộ tri thức Chatbot"
      className="xl:col-span-12"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <th className="py-2.5 px-4 font-bold">#</th>
              <th className="py-2.5 px-4 font-bold">Chủ đề / Câu hỏi</th>
              <th className="py-2.5 px-4 font-bold text-right">Số lần hỏi</th>
              <th className="py-2.5 px-4 font-bold text-right">Số phiên</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length > 0 ? (
              list.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-800">{item.category}</td>
                  <td className="py-2.5 px-4 font-extrabold text-sky-700 text-right">
                    {formatNumber(item.hit_count)}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-600 text-right">
                    {formatNumber(item.session_count)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                  Chưa có dữ liệu câu hỏi phổ biến
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * EXPORT MAIN CHATTING DASHBOARD CHARTS COMPONENT
 * ==================================================================== */
export function ChatbotDashboardCharts({
  charts,
  granularity = "month",
  onGranularityChange,
  faqs,
}: {
  charts: ChatbotOverviewCharts;
  granularity?: GranularityMode;
  onGranularityChange?: (mode: GranularityMode) => void;
  faqs?: ChatbotFaqItem[];
}) {
  return (
    <div className="space-y-6">
      {/* SECTION 1: XU HƯỚNG TỰ ĐỘNG HÓA (BOT TỰ XỬ LÝ VS CHUYỂN CCC) */}
      <AutomationTrendChartCard
        data={charts.time_series_outcomes}
        granularity={granularity}
        onGranularityChange={onGranularityChange}
      />

      {/* SECTION 2: XU HƯỚNG SESSION & KẾT QUẢ XỬ LÝ */}
      <div className="grid gap-4 xl:grid-cols-12">
        <SessionTrendLineChartCard data={charts.time_series_outcomes} />
        <OutcomeDonutChartCard processClassification={charts.process_classification} />
      </div>

      {/* SECTION 3: PHÂN TÍCH CATEGORY & TỶ LỆ CHUYỂN CCC */}
      <div className="grid gap-4 xl:grid-cols-12">
        <TopCategoryHorizontalBarCard
          data={charts.topic_bar}
          multiMonthData={charts.all_topic_multi_month}
        />
        <CategoryCccRateHorizontalBarCard
          data={charts.category_ccc_rate}
          multiMonthData={charts.ccc_multi_month_topics}
        />
      </div>

      {/* SECTION 4: FUNNEL CHUYỂN ĐỔI & HOURLY PEAK */}
      <div className="grid gap-4 xl:grid-cols-12">
        <ChatbotFunnelChartCard data={charts.chat_funnel} />
        <HourlyPeakChartCard data={charts.hourly_peak} />
      </div>

      {/* SECTION 5: PHÂN TÍCH LÝ DO & HIỆU QUẢ CHANNEL */}
      <div className="grid gap-4 xl:grid-cols-12">
        <TopReasonHorizontalBarCard
          data={charts.top_reasons}
          multiPeriodData={charts.top_reasons_multi_period}
        />
        <ChannelPerformanceBarCard
          data={charts.channel_performance}
          multiPeriodData={charts.channel_performance_multi_period}
        />
      </div>

      {/* SECTION 6: TOP CÂU HỎI PHỔ BIẾN (TABLE) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <TopFaqTableCard faqs={faqs} />
      </div>
    </div>
  );
}

export default ChatbotDashboardCharts;
