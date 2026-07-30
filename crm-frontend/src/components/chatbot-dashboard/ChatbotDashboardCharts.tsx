"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import { FunnelChartComponent } from "@/components/chatbot-dashboard/charts/FunnelChartComponent";
import { PeriodComparisonChart } from "@/components/chatbot-dashboard/charts/PeriodComparisonChart";
import {
  ExpandableChartCard as ChartCard,
  PeriodDrilldownBackButton,
  PeriodDrilldownDonut,
  usePeriodDrilldown,
  type DrilldownSlice,
} from "@/components/common";
import type {
  CategoryCccRateItem,
  CccMultiMonthTopicsData,
  ChannelPerformanceItem,
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  FunnelStepItem,
  HourlyPeakByPeriodData,
  HourlyPeakItem,
  OutcomeByPeriod,
  TimeSeriesOutcomeItem,
} from "@/types/chatbot-dashboard.type";

export type ChatbotOverviewCharts = ChatbotOverviewResponse["charts"];

const COLORS = [
  "#0097cf", // Primary PHS Sky Blue
  "#10b981", // Bright Cool Emerald Green
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
          <div
            key={`${item.dataKey || item.name}-${index}`}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color || item.fill }}
              />
              <span className="text-slate-600">{item.name}</span>
            </div>
            <span className="font-bold text-slate-900">
              {typeof item.value === "number"
                ? formatNumber(item.value)
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================
 * 📊 TOP SECTION: XU HƯỚNG TỰ ĐỘNG HÓA (BOT TỰ XỬ LÝ VS CHUYỂN CCC)
 * ==================================================================== */
function AutomationTrendChartCard({
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
        is_current: false,
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

  // Có kỳ nằm ngoài bộ lọc nghĩa là dữ liệu đã được nới ra kỳ cha.
  const hasContextPeriods = chartData.some((row) => !row.is_current);
  const focusedLabels = chartData
    .filter((row) => row.is_current)
    .map((row) => row.label);

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const drilldownSlices = useMemo(
    () =>
      outcomeSlicesFromRow(
        chartData.find((row) => row.label === selectedPeriod),
      ),
    [chartData, selectedPeriod],
  );

  return (
    <ChartCard
      title={
        selectedPeriod
          ? `Xu hướng Tự động hóa & Phân loại Xử lý — ${selectedPeriod}`
          : "Xu hướng Tự động hóa & Phân loại Xử lý (Bot tự xử lý vs Chuyển CCC)"
      }
      description={drilldownHint(
        selectedPeriod,
        hasContextPeriods
          ? `Đang xem ${focusedLabels.join(", ")} — các kỳ làm mờ xung quanh là nền so sánh`
          : "Vùng Xanh: Bot tự xử lý | Cột Vàng: Chuyển CCC",
      )}
      headerRight={
        selectedPeriod ? (
          <PeriodDrilldownBackButton onClick={closePeriod} />
        ) : undefined
      }
      className="xl:col-span-12"
    >
      <div className="h-[320px]">
        {selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={outcomeColorOf}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 25, left: 0, bottom: 15 }}
              onClick={openPeriod}
              className="cursor-pointer"
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
              <Tooltip content={<ValueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Area
                type="monotone"
                dataKey="bot_done"
                name="Bot tự xử lý (BOT_DONE)"
                fill="#10b981"
                stroke="#10b981"
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
                {/* Khi backend nới dữ liệu ra kỳ cha (vd lọc "hôm nay" -> vẽ cả
                  tuần), các kỳ nền được làm mờ để kỳ đang xem nổi lên. */}
                {hasContextPeriods &&
                  chartData.map((row) => (
                    <Cell
                      key={row.date}
                      fillOpacity={row.is_current ? 1 : 0.35}
                    />
                  ))}
                <LabelList
                  dataKey="ccc"
                  position="top"
                  style={{ fontSize: 10, fill: "#b45309", fontWeight: 700 }}
                  formatter={(val: any) => (val && Number(val) > 0 ? val : "")}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
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
        is_current: false,
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

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const drilldownSlices = useMemo(
    () =>
      outcomeSlicesFromRow(
        chartData.find((row) => row.label === selectedPeriod),
      ),
    [chartData, selectedPeriod],
  );

  return (
    <ChartCard
      title={
        selectedPeriod
          ? `📈 1. Xu hướng Session — ${selectedPeriod}`
          : "📈 1. Xu hướng Session theo Thời gian"
      }
      description={drilldownHint(
        selectedPeriod,
        "Chatbot đang được sử dụng nhiều hay ít theo thời gian?",
      )}
      headerRight={
        selectedPeriod ? (
          <PeriodDrilldownBackButton onClick={closePeriod} />
        ) : undefined
      }
      className="xl:col-span-6"
    >
      <div className="h-[320px]">
        {selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={outcomeColorOf}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 25, left: 0, bottom: 15 }}
              onClick={openPeriod}
              className="cursor-pointer"
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
        )}
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 🍩 2. KẾT QUẢ XỬ LÝ PHIÊN CHAT (DONUT CHART)
 * ==================================================================== */
/**
 * Kết quả xử lý phiên theo kỳ.
 *
 * Thay cho biểu đồ tròn: tròn chỉ nói được tỷ trọng của cả kỳ gộp, không cho
 * thấy nhóm nào đang tăng hay giảm qua từng tháng/quý/năm.
 */
const OUTCOME_SERIES_COLORS: Record<string, string> = {
  "Chatbot tự xử lý": "#10b981",
  "Chuyển CCC xử lý": "#f59e0b",
  "Chờ thông tin khách hàng": "#0284c7",
  "Câu hỏi rác": "#ef4444",
};

type ChartViewMode = "DEFAULT" | "TIME";

/**
 * Đầu thẻ biểu đồ: nút quay lại (khi đang xem chi tiết một cột) và nút chuyển
 * giữa xem gộp / xem theo kỳ.
 *
 * Trước đây khối nút này được chép nguyên văn ở 5 thẻ.
 */
function ChartModeHeader({
  viewMode,
  onChange,
  onBack,
}: {
  viewMode: ChartViewMode;
  onChange: (mode: ChartViewMode) => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack && <PeriodDrilldownBackButton onClick={onBack} />}

      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
        {(["DEFAULT", "TIME"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              viewMode === mode
                ? "bg-[#10b981] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {mode === "DEFAULT" ? "Tổng quan" : "📅 Theo thời gian"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mô tả nhắc người dùng bấm vào cột, đổi theo việc đang xem chi tiết hay chưa. */
function drilldownHint(selected: string | null, overview: string) {
  return selected
    ? "Nhấp đúp vào biểu đồ hoặc bấm 'Quay lại' để xem tất cả các cột"
    : `${overview} — bấm vào cột bất kỳ để xem chi tiết kèm số liệu`;
}

/** Một dòng dữ liệu -> các phần của donut, bỏ phần bằng 0 cho đỡ rối vành. */
function slicesFromRow(row: any, keys: string[]): DrilldownSlice[] {
  if (!row) return [];

  return keys
    .map((name) => ({ name, value: Number(row[name]) || 0 }))
    .filter((item) => item.value > 0);
}

// Bốn nhóm xử lý trong `time_series_outcomes`: tên cột khác tên hiển thị.
const OUTCOME_FIELDS = [
  { field: "bot_done", name: "Chatbot tự xử lý" },
  { field: "ccc", name: "Chuyển CCC xử lý" },
  { field: "pending", name: "Chờ thông tin khách hàng" },
  { field: "spam", name: "Câu hỏi rác" },
] as const;

function outcomeSlicesFromRow(row: any): DrilldownSlice[] {
  if (!row) return [];

  return OUTCOME_FIELDS.map(({ field, name }) => ({
    name,
    value: Number(row[field]) || 0,
  })).filter((item) => item.value > 0);
}

const outcomeColorOf = (name: string) =>
  OUTCOME_SERIES_COLORS[name] || "#64748b";

/**
 * Màu của một kỳ trong donut phải trùng màu cột của chính kỳ đó.
 *
 * Tra theo vị trí trong danh sách kỳ gốc chứ không theo thứ tự phần trong
 * donut: phần bằng 0 đã bị loại nên hai thứ tự đó lệch nhau.
 */
function periodColorOf(periodLabels: string[]) {
  return (name: string) =>
    COLORS[Math.max(0, periodLabels.indexOf(name)) % COLORS.length];
}

function OutcomeByPeriodChartCard({ data }: { data?: OutcomeByPeriod | null }) {
  const rows = useMemo(() => data?.data || [], [data]);
  const series = useMemo(() => data?.series || [], [data]);

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const drilldownSlices = useMemo(
    () =>
      slicesFromRow(
        rows.find((row) => row.label === selectedPeriod),
        series,
      ),
    [rows, selectedPeriod, series],
  );

  return (
    <ChartCard
      title={
        selectedPeriod
          ? `📊 2. Kết quả Xử lý Phiên Chat — ${selectedPeriod}`
          : "📊 2. Kết quả Xử lý Phiên Chat theo kỳ"
      }
      description={drilldownHint(
        selectedPeriod,
        "Mỗi kỳ một cột, chia đoạn theo nhóm xử lý",
      )}
      headerRight={
        selectedPeriod ? (
          <PeriodDrilldownBackButton onClick={closePeriod} />
        ) : undefined
      }
      className="xl:col-span-6"
    >
      {rows.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu kết quả xử lý." />
      ) : (
        <div className="h-[320px]">
          {selectedPeriod ? (
            <PeriodDrilldownDonut
              data={drilldownSlices}
              colorOf={outcomeColorOf}
              onExit={closePeriod}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 15, right: 20, left: 0, bottom: 10 }}
                onClick={openPeriod}
                className="cursor-pointer"
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
                  content={<ValueTooltip />}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

                {series.map((name, index) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    name={name}
                    stackId="outcome"
                    fill={OUTCOME_SERIES_COLORS[name] || "#64748b"}
                    radius={
                      index === series.length - 1 ? [4, 4, 0, 0] : undefined
                    }
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
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
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill="#334155"
        fontSize={11}
        fontWeight={600}
      >
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
  // Mặc định xem theo kỳ để khớp mốc đang chọn trên thanh công cụ; muốn xem
  // xếp hạng gộp cả kỳ thì bấm nút chuyển.
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("TIME");

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

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const changeViewMode = (mode: ChartViewMode) => {
    closePeriod();
    setViewMode(mode);
  };

  const drilldownSlices = useMemo(
    () =>
      slicesFromRow(
        timeSeriesData.data_by_category.find(
          (row: any) => row.label === selectedPeriod,
        ),
        monthLabels,
      ),
    [monthLabels, selectedPeriod, timeSeriesData],
  );

  return (
    <ChartCard
      title="📊 3. Top Category Khách hàng Hỏi nhiều nhất"
      description={
        viewMode === "DEFAULT"
          ? "Khách hàng đang quan tâm vấn đề gì nhất? (Tổng quan)"
          : "Trục hoành: Các chủ đề nghiệp vụ | Biến động theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <ChartModeHeader
          viewMode={viewMode}
          onChange={changeViewMode}
          onBack={selectedPeriod ? closePeriod : undefined}
        />
      }
      className="xl:col-span-6"
    >
      <div className="h-[330px]">
        {selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={periodColorOf(monthLabels)}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "DEFAULT" ? (
              <BarChart
                layout="vertical"
                onClick={openPeriod}
                className="cursor-pointer"
                data={defaultChartData}
                margin={{ top: 10, right: 45, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickFormatter={(val: string) => formatLabelByWords(val, 6)}
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }}
                  width={140}
                />
                <Tooltip content={<ValueTooltip />} />
                <Bar
                  dataKey="value"
                  name="Số lượt hỏi"
                  fill="#0097cf"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 11, fill: "#0284c7", fontWeight: 700 }}
                    formatter={(val: any) =>
                      val && Number(val) > 0 ? val : ""
                    }
                  />
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={timeSeriesData.data_by_category}
                margin={{ top: 20, right: 25, left: -10, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={<CustomCategoryAxisTick />}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
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
                      formatter={(val: any) =>
                        val && Number(val) > 0 ? val : ""
                      }
                    />
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
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
  // Mặc định xem theo kỳ để khớp mốc đang chọn trên thanh công cụ; muốn xem
  // xếp hạng gộp cả kỳ thì bấm nút chuyển.
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("TIME");

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

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const changeViewMode = (mode: ChartViewMode) => {
    closePeriod();
    setViewMode(mode);
  };

  const drilldownSlices = useMemo(
    () =>
      slicesFromRow(
        timeSeriesData.data_by_category.find(
          (row: any) => row.label === selectedPeriod,
        ),
        monthLabels,
      ),
    [monthLabels, selectedPeriod, timeSeriesData],
  );

  return (
    <ChartCard
      title="📊 4. Số lượt Chuyển CCC theo Category"
      description={
        viewMode === "DEFAULT"
          ? "Biết số lượt phiên chuyển CCC hỗ trợ cho từng chủ đề nghiệp vụ"
          : "Trục hoành: Các chủ đề nghiệp vụ | Số lượt chuyển CCC theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <ChartModeHeader
          viewMode={viewMode}
          onChange={changeViewMode}
          onBack={selectedPeriod ? closePeriod : undefined}
        />
      }
      className="xl:col-span-6"
    >
      <div className="h-[330px]">
        {selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={periodColorOf(monthLabels)}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "DEFAULT" ? (
              <BarChart
                layout="vertical"
                onClick={openPeriod}
                className="cursor-pointer"
                data={defaultChartData}
                margin={{ top: 10, right: 45, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickFormatter={(val: string) => formatLabelByWords(val, 6)}
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }}
                  width={140}
                />
                <Tooltip content={<ValueTooltip />} />
                <Bar
                  dataKey="ccc"
                  name="Số lượt chuyển CCC"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="ccc"
                    position="right"
                    style={{ fontSize: 11, fill: "#b45309", fontWeight: 700 }}
                    formatter={(val: any) =>
                      val && Number(val) > 0 ? val : ""
                    }
                  />
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={timeSeriesData.data_by_category}
                margin={{ top: 20, right: 25, left: -10, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={<CustomCategoryAxisTick />}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
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
                      formatter={(val: any) =>
                        val && Number(val) > 0 ? val : ""
                      }
                    />
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
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
function HourlyPeakChartCard({
  data,
  multiPeriodData,
}: {
  data?: HourlyPeakItem[] | null;
  multiPeriodData?: HourlyPeakByPeriodData | null;
}) {
  // Mặc định xem theo kỳ để khớp mốc đang chọn trên thanh công cụ; muốn xem
  // khung giờ gộp cả kỳ thì bấm nút chuyển.
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("TIME");

  const chartData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) return data;
    return [];
  }, [data]);

  const timeSeriesData = useMemo(() => {
    if (multiPeriodData && multiPeriodData.data?.length > 0) {
      return multiPeriodData;
    }
    return { period_labels: [], data: [] };
  }, [multiPeriodData]);

  const periodLabels = timeSeriesData.period_labels;

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const changeViewMode = (mode: ChartViewMode) => {
    closePeriod();
    setViewMode(mode);
  };

  const drilldownSlices = useMemo(
    () =>
      slicesFromRow(
        timeSeriesData.data.find((row: any) => row.label === selectedPeriod),
        periodLabels,
      ),
    [periodLabels, selectedPeriod, timeSeriesData],
  );

  return (
    <ChartCard
      title="🕒 6. Session theo Khung Giờ trong Ngày (0h - 23h)"
      description={
        viewMode === "DEFAULT"
          ? "Xác định các khoảng thời gian bùng nổ lượng chat để chủ động bố trí nhân sự CCC"
          : "Mỗi kỳ một đường: xem giờ cao điểm dịch chuyển thế nào giữa các kỳ (phụ thuộc bộ lọc)"
      }
      headerRight={
        <ChartModeHeader
          viewMode={viewMode}
          onChange={changeViewMode}
          onBack={selectedPeriod ? closePeriod : undefined}
        />
      }
      className="xl:col-span-6"
    >
      <div className="h-[320px]">
        {selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={periodColorOf(periodLabels)}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "DEFAULT" ? (
              <BarChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={chartData}
                margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#334155" }}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} />
                <Bar
                  dataKey="count"
                  name="Số lượt chat"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <LineChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={timeSeriesData.data}
                margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#334155" }}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {periodLabels.map((pLabel, idx) => (
                  <Line
                    key={pLabel}
                    type="monotone"
                    dataKey={pLabel}
                    name={pLabel}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    // 24 điểm nhân số kỳ: vẽ chấm ở mọi điểm sẽ rối, chỉ hiện
                    // chấm khi rê chuột vào.
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

function CustomYAxisReasonTick({ x, y, payload }: any) {
  const text = payload?.value || "";
  const formatted = formatLabelByWords(text, 6);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-6}
        y={4}
        textAnchor="end"
        fill="#1e293b"
        fontSize={11}
        fontWeight={600}
      >
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
  // Mặc định xem theo kỳ để khớp mốc đang chọn trên thanh công cụ; muốn xem
  // xếp hạng gộp cả kỳ thì bấm nút chuyển.
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("TIME");

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

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const changeViewMode = (mode: ChartViewMode) => {
    closePeriod();
    setViewMode(mode);
  };

  const drilldownSlices = useMemo(
    () =>
      slicesFromRow(
        timeSeriesData.data_by_category.find(
          (row: any) => row.label === selectedPeriod,
        ),
        monthLabels,
      ),
    [monthLabels, selectedPeriod, timeSeriesData],
  );

  // Lý do chuyển CCC là câu dài, in thẳng lên trục hoành thì các nhãn đè lên
  // nhau và bị cắt. Đánh mã LD1..LDn cho trục, câu đầy đủ đưa xuống chú thích
  // ngay dưới biểu đồ (và vẫn hiện nguyên văn trong tooltip).
  const reasonLegend = useMemo(
    () =>
      timeSeriesData.data_by_category.map((row: any, index: number) => ({
        code: `LD${index + 1}`,
        label: String(row.label ?? ""),
      })),
    [timeSeriesData],
  );

  const reasonCodeByLabel = useMemo(
    () => new Map(reasonLegend.map((item) => [item.label, item.code])),
    [reasonLegend],
  );

  return (
    <ChartCard
      title="📊 7. Top Lý do Chuyển CCC"
      description={
        viewMode === "DEFAULT"
          ? "Dựa vào trường reason để tìm điểm nghẽn và cải tiến kịch bản Chatbot"
          : "Trục hoành: Mã lý do (xem chú thích dưới biểu đồ) | Biến động theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <ChartModeHeader
          viewMode={viewMode}
          onChange={changeViewMode}
          onBack={selectedPeriod ? closePeriod : undefined}
        />
      }
      className="xl:col-span-6"
    >
      {/* Chế độ theo thời gian nhường bớt chiều cao cho phần chú thích mã lý
          do ở dưới, để thẻ không cao hơn các biểu đồ đứng cạnh. */}
      <div className={viewMode === "DEFAULT" ? "h-[330px]" : "h-[236px]"}>
        {selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={periodColorOf(monthLabels)}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "DEFAULT" ? (
              <BarChart
                layout="vertical"
                onClick={openPeriod}
                className="cursor-pointer"
                data={defaultChartData}
                margin={{ top: 10, right: 45, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  interval={0}
                  tick={<CustomYAxisReasonTick />}
                  width={180}
                />
                <Tooltip content={<ValueTooltip />} />
                <Bar
                  dataKey="value"
                  name="Số phiên"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 11, fill: "#6d28d9", fontWeight: 700 }}
                    formatter={(val: any) =>
                      val && Number(val) > 0 ? val : ""
                    }
                  />
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={timeSeriesData.data_by_category}
                margin={{ top: 25, right: 25, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                {/* Vẫn bind theo `label` để tooltip đọc được nguyên văn lý do;
                  chỉ phần chữ vẽ lên trục mới rút thành mã. */}
                <XAxis
                  dataKey="label"
                  interval={0}
                  tickFormatter={(value: string) =>
                    reasonCodeByLabel.get(value) ?? value
                  }
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
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
                      formatter={(val: any) =>
                        val && Number(val) > 0 ? val : ""
                      }
                    />
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {viewMode === "TIME" && reasonLegend.length > 0 && (
        // Một cột: lý do dài 20-60 ký tự, chia hai cột thì lại bị cắt đúng
        // như khi in thẳng lên trục.
        <dl className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[11px] leading-snug">
          {reasonLegend.map((item) => (
            <div key={item.code} className="flex gap-2">
              <dt className="w-9 shrink-0 font-bold text-slate-900">
                {item.code}
              </dt>
              <dd className="truncate text-slate-600" title={item.label}>
                {item.label}
              </dd>
            </div>
          ))}
        </dl>
      )}
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
  // Mặc định xem theo kỳ để khớp mốc đang chọn trên thanh công cụ; muốn xem
  // xếp hạng gộp cả kỳ thì bấm nút chuyển.
  const [viewMode, setViewMode] = useState<"DEFAULT" | "TIME">("TIME");

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

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const changeViewMode = (mode: ChartViewMode) => {
    closePeriod();
    setViewMode(mode);
  };

  const drilldownSlices = useMemo(
    () =>
      slicesFromRow(
        timeSeriesData.data_by_category.find(
          (row: any) => row.label === selectedPeriod,
        ),
        monthLabels,
      ),
    [monthLabels, selectedPeriod, timeSeriesData],
  );

  return (
    <ChartCard
      title="📊 Hiệu quả theo Channel (Web / App / Zalo / Facebook)"
      description={
        viewMode === "DEFAULT"
          ? "Đánh giá kịch bản Chatbot hoạt động tốt nhất trên kênh giao tiếp nào"
          : "Trục hoành: Các kênh giao tiếp | Số phiên theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <ChartModeHeader
          viewMode={viewMode}
          onChange={changeViewMode}
          onBack={selectedPeriod ? closePeriod : undefined}
        />
      }
      className="xl:col-span-6"
    >
      <div className="h-[330px]">
        {selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={periodColorOf(monthLabels)}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "DEFAULT" ? (
              <BarChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={defaultChartData}
                margin={{ top: 20, right: 25, left: 0, bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar
                  dataKey="bot_done"
                  name="Bot xử lý (phiên)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="bot_done"
                    position="top"
                    style={{ fontSize: 9, fill: "#10b981", fontWeight: 700 }}
                    formatter={(val: any) =>
                      val && Number(val) > 0 ? val : ""
                    }
                  />
                </Bar>
                <Bar
                  dataKey="ccc"
                  name="Chuyển CCC (phiên)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="ccc"
                    position="top"
                    style={{ fontSize: 9, fill: "#b45309", fontWeight: 700 }}
                    formatter={(val: any) =>
                      val && Number(val) > 0 ? val : ""
                    }
                  />
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={timeSeriesData.data_by_category}
                margin={{ top: 20, right: 25, left: -10, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={<CustomCategoryAxisTick />}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
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
                      formatter={(val: any) =>
                        val && Number(val) > 0 ? val : ""
                      }
                    />
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
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
                <tr
                  key={idx}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-800">
                    {item.category}
                  </td>
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
                <td
                  colSpan={4}
                  className="py-6 text-center text-slate-400 font-medium"
                >
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
  faqs,
}: {
  charts: ChatbotOverviewCharts;
  faqs?: ChatbotFaqItem[];
}) {
  return (
    <div className="space-y-6">
      {/* SECTION 1: XU HƯỚNG TỰ ĐỘNG HÓA (BOT TỰ XỬ LÝ VS CHUYỂN CCC) */}
      <AutomationTrendChartCard data={charts.time_series_outcomes} />

      {/* SECTION 1B: SO SÁNH KỲ (kỳ này với kỳ liền trước) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <PeriodComparisonChart data={charts.period_comparison} />
      </div>

      {/* SECTION 2: XU HƯỚNG SESSION & KẾT QUẢ XỬ LÝ */}
      <div className="grid gap-4 xl:grid-cols-12">
        <SessionTrendLineChartCard data={charts.time_series_outcomes} />
        <OutcomeByPeriodChartCard data={charts.outcome_by_period} />
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
        <HourlyPeakChartCard
          data={charts.hourly_peak}
          multiPeriodData={charts.hourly_peak_multi_period}
        />
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
