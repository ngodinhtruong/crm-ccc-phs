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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import { ExpandableChartCard as ChartCard } from "@/components/common";
import type {
  AvgHandlingTimes,
  ChatbotOverviewResponse,
  CustomerLinkageData,
  HourlyPeakItem,
  SlaComplianceTrend,
  TimeSeriesOutcomeItem,
  TopicTransferRateItem,
} from "@/types/chatbot-dashboard.type";

export type ChatbotOverviewCharts = ChatbotOverviewResponse["charts"];
export type GranularityMode = "day" | "week" | "month";

const COLORS = [
  "#0097cf", // Primary PHS Sky Blue
  "#00713d", // PHS Green
  "#f59e0b", // Amber
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

/* ====================================================================
 * SECTION 1: KẾT QUẢ XỬ LÝ & XU HƯỚNG TỰ ĐỘNG HÓA THEO THỜI GIAN
 * ==================================================================== */
function AutomationTrendChartCard({
  data,
  granularity = "day",
  onGranularityChange,
}: {
  data?: TimeSeriesOutcomeItem[] | null;
  granularity?: GranularityMode;
  onGranularityChange?: (mode: GranularityMode) => void;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const rawData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const totalSessions = useMemo(() => rawData.reduce((sum, d) => sum + d.total, 0), [rawData]);
  const totalBotDone = useMemo(() => rawData.reduce((sum, d) => sum + d.bot_done, 0), [rawData]);
  const totalCcc = useMemo(() => rawData.reduce((sum, d) => sum + d.ccc, 0), [rawData]);
  const totalSpamPending = useMemo(
    () => rawData.reduce((sum, d) => sum + (d.spam || 0) + (d.pending || 0), 0),
    [rawData]
  );
  const avgBotRate = totalSessions > 0 ? ((totalBotDone / totalSessions) * 100).toFixed(1) : "0";

  const periodDonutData = useMemo(() => {
    if (!selectedPeriod) return [];
    const item = rawData.find((d) => d.label === selectedPeriod || d.date === selectedPeriod);
    if (!item) return [];
    return [
      { name: "Bot tự xử lý", value: item.bot_done, color: "#00713d" },
      { name: "Chuyển CCC xử lý", value: item.ccc, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [rawData, selectedPeriod]);

  if (rawData.length === 0) {
    return <EmptyState message="Không có dữ liệu xu hướng tự động hóa theo thời gian." />;
  }

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setSelectedPeriod(state.activeLabel);
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 Summary Cards Top */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Tổng Tiếp Nhận</p>
          <p className="mt-1 text-xl font-black text-sky-700">{formatNumber(totalSessions)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Phiên tương tác chatbot</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Bot Tự Xử Lý</p>
          <p className="mt-1 text-xl font-black text-[#00713d]">{formatNumber(totalBotDone)}</p>
          <p className="mt-0.5 text-[11px] text-[#00713d] font-semibold">Tỷ lệ tự động: {avgBotRate}%</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Chuyển CCC Xử Lý</p>
          <p className="mt-1 text-xl font-black text-amber-700">{formatNumber(totalCcc)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Cần tư vấn viên hỗ trợ</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Chờ Khách & Spam</p>
          <p className="mt-1 text-xl font-black text-rose-600">{formatNumber(totalSpamPending)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Chờ bổ sung / Tin rác</p>
        </div>
      </div>

      <ChartCard
        title={
          selectedPeriod
            ? `Cơ cấu kết quả xử lý - ${selectedPeriod}`
            : "Xu hướng Tự động hóa & Phân loại xử lý (Time-Series Deflection)"
        }
        description={
          selectedPeriod
            ? "Nhấp đúp hoặc bấm nút 'Quay lại' để xem xu hướng tất cả các mốc thời gian"
            : "So sánh số phiên Chatbot tự giải quyết (xanh) vs Chuyển CCC (vàng). Double-click vào điểm mốc để xem chi tiết."
        }
        headerRight={
          <div className="flex items-center gap-2">
            {selectedPeriod ? (
              <button
                type="button"
                onClick={() => setSelectedPeriod(null)}
                className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 ring-1 ring-sky-200 transition-all shadow-2xs"
              >
                ← Quay lại các mốc
              </button>
            ) : (
              onGranularityChange && (
                <GranularitySelector value={granularity} onChange={onGranularityChange} />
              )
            )}
          </div>
        }
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {selectedPeriod ? (
              <PieChart onDoubleClick={() => setSelectedPeriod(null)}>
                <Pie
                  data={periodDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  isAnimationActive={false}
                  label={({ name, value, percent }) =>
                    percent && percent >= 0.02
                      ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                      : ""
                  }
                >
                  {periodDonutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ValueTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string, entry: any) => {
                    const item = entry.payload;
                    const total = periodDonutData.reduce((acc, curr) => acc + curr.value, 0);
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
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBotDoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00713d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00713d" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Area
                  type="monotone"
                  dataKey="bot_done"
                  name="Bot tự xử lý"
                  fill="url(#colorBotDoneGrad)"
                  stroke="#00713d"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="ccc"
                  name="Chuyển CCC"
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
            )}
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

/* ====================================================================
 * SECTION 2: KÊNH TIẾP NHẬN & ĐỊNH DANH KHÁCH HÀNG
 * ==================================================================== */
function ChannelDonutChartCard({ data }: { data?: { name: string; value: number }[] | null }) {
  const chartData = useMemo(() => (Array.isArray(data) ? data.filter((d) => d.value > 0) : []), [data]);

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu phân bổ kênh tiếp nhận." />;
  }

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <ChartCard
      title="Tỷ trọng Phiên Chatbot theo Kênh (Channel Mix)"
      description="Cơ cấu lượt hội thoại từ Web Portal, Mobile App, Zalo OA"
      className="xl:col-span-5"
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
              label={({ name, value, percent }) =>
                percent && percent >= 0.02
                  ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                  : ""
              }
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
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

function CustomerLinkageChartCard({ data }: { data?: CustomerLinkageData | null }) {
  const chartData = useMemo(() => (data && Array.isArray(data.items) ? data.items : []), [data]);

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu định danh khách hàng." />;
  }

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <ChartCard
      title="Tỷ lệ Định danh Tài khoản Khách hàng (Linked vs Unlinked)"
      description="Tỷ lệ phiên gắn liền với số tài khoản chứng khoán đã xác thực"
      className="xl:col-span-7"
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
              label={({ name, value, percent }) =>
                percent && percent >= 0.02
                  ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                  : ""
              }
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
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

/* ====================================================================
 * SECTION 3: PHÂN TÍCH CHỦ ĐỀ & TỶ LỆ CHUYỂN CCC
 * ==================================================================== */
function TopicTransferRateChartCard({ data }: { data?: TopicTransferRateItem[] | null }) {
  const chartData = useMemo(() => (Array.isArray(data) ? data.slice(0, 10) : []), [data]);

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu tỷ lệ chuyển CCC theo chủ đề." />;
  }

  return (
    <ChartCard
      title="Tỷ lệ Chuyển CCC theo Chủ đề Nghiệp vụ"
      description="So sánh lượt Chatbot tự xử lý vs Chuyển tư vấn viên CCC cho top các nhóm chủ đề"
      className="xl:col-span-6"
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
            <YAxis
              dataKey="category"
              type="category"
              width={140}
              tick={{ fontSize: 10, fill: "#334155", fontWeight: 600 }}
              interval={0}
            />
            <Tooltip content={<ValueTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="bot_done" name="Bot tự xử lý" stackId="topic" fill="#00713d" isAnimationActive={false} />
            <Bar dataKey="ccc" name="Chuyển CCC" stackId="topic" fill="#f59e0b" radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function CccTopicDonutChartCard({ data }: { data?: { name: string; value: number }[] | null }) {
  const chartData = useMemo(() => (Array.isArray(data) ? data.filter((d) => d.value > 0) : []), [data]);

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu chủ đề ticket chuyển CCC." />;
  }

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <ChartCard
      title="Cơ cấu Chủ đề Ticket Yêu cầu CCC Hỗ trợ"
      description="Phân bổ nghiệp vụ chuyên sâu đối với các yêu cầu không giải quyết được bằng Chatbot"
      className="xl:col-span-6"
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
              label={({ name, value, percent }) =>
                percent && percent >= 0.02
                  ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                  : ""
              }
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
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

/* ====================================================================
 * SECTION 4: TUÂN THỦ SLA & KHUNG GIỜ CAO ĐIỂM
 * ==================================================================== */
function SlaTrendChartCard({ data }: { data?: SlaComplianceTrend | null }) {
  const chartData = useMemo(() => (data && Array.isArray(data.items) ? data.items : []), [data]);

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu tuân thủ SLA." />;
  }

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <ChartCard
      title="Tỷ lệ Tuân thủ SLA Ticket Chatbot (SLA Compliance)"
      description={`Tổng số Ticket CCC: ${formatNumber(data?.total_tickets || 0)} - Tỷ lệ đạt đúng hạn: ${
        data?.on_time_rate || 0
      }%`}
      className="xl:col-span-6"
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
              label={({ name, value, percent }) =>
                percent && percent >= 0.02
                  ? `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                  : ""
              }
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
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

function HourlyPeakChartCard({ data }: { data?: HourlyPeakItem[] | null }) {
  const chartData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu khung giờ cao điểm." />;
  }

  const peakHour = chartData.reduce(
    (best, item) => (item.total > best.total ? item : best),
    chartData[0]
  );

  return (
    <ChartCard
      title="Khung giờ Cao điểm trong ngày (24-Hour Peak Hours)"
      description={`Phân bổ 24h hội thoại. Khung giờ cao nhất: ${peakHour?.label || "-"} (${formatNumber(
        peakHour?.total || 0
      )} phiên)`}
      className="xl:col-span-6"
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip content={<ValueTooltip />} />
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
    </ChartCard>
  );
}

function AvgHandlingTimeChartCard({ data }: { data?: AvgHandlingTimes | null }) {
  if (!data) {
    return <EmptyState message="Không có dữ liệu thời gian xử lý trung bình." />;
  }

  const chartData = [
    { name: "Chatbot xử lý (Phút)", value: data.avg_bot_duration_min, fill: "#00713d" },
    { name: "CCC Phản hồi đầu tiên (Phút)", value: data.avg_response_time_min, fill: "#0097cf" },
    { name: "CCC Hoàn tất giải quyết (Phút)", value: data.avg_resolution_time_min, fill: "#f59e0b" },
  ];

  return (
    <ChartCard
      title="Thời gian Phản hồi & Giải quyết Trung bình (Handling Times)"
      description="So sánh thời gian hội thoại Chatbot vs Thời gian phản hồi & giải quyết ticket của CCC"
      className="xl:col-span-12"
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip content={<ValueTooltip />} />
            <Bar dataKey="value" name="Thời gian trung bình (Phút)" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
              <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#334155", fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * EXPORT MAIN CHATTING DASHBOARD CHARTS COMPONENT
 * ==================================================================== */
export function ChatbotDashboardCharts({
  charts,
  granularity = "day",
  onGranularityChange,
}: {
  charts: ChatbotOverviewCharts;
  granularity?: GranularityMode;
  onGranularityChange?: (mode: GranularityMode) => void;
}) {
  return (
    <div className="space-y-6">
      {/* SECTION 1: XU HƯỚNG TỰ ĐỘNG HÓA */}
      <AutomationTrendChartCard
        data={charts.time_series_outcomes}
        granularity={granularity}
        onGranularityChange={onGranularityChange}
      />

      {/* SECTION 2: PHÂN TÍCH CHỦ ĐỀ NGHIỆP VỤ & TỶ LỆ CHUYỂN CCC */}
      <div className="grid gap-4 xl:grid-cols-12">
        <TopicTransferRateChartCard data={charts.topic_transfer_rates} />
        <CccTopicDonutChartCard data={charts.ccc_issue_pie} />
      </div>

      {/* SECTION 3: KHUNG GIỜ CAO ĐIỂM & TUÂN THỦ SLA */}
      <div className="grid gap-4 xl:grid-cols-12">
        <SlaTrendChartCard data={charts.sla_compliance_trend} />
        <HourlyPeakChartCard data={charts.hourly_peak_chart} />
      </div>

      {/* SECTION 4: KÊNH TIẾP NHẬN, ĐỊNH DANH KHÁCH HÀNG & THỜI GIAN XỬ LÝ */}
      <div className="grid gap-4 xl:grid-cols-12">
        <ChannelDonutChartCard data={charts.channel_distribution} />
        <CustomerLinkageChartCard data={charts.customer_linkage} />
        <AvgHandlingTimeChartCard data={charts.avg_handling_times} />
      </div>
    </div>
  );
}

export default ChatbotDashboardCharts;
