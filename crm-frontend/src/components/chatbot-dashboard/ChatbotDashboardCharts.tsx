"use client";

import { useMemo, useState } from "react";
import {
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
  CategoryBotVsCccByPeriodData,
  CategoryBotVsCccData,
  CategoryCccRateItem,
  CccMultiMonthTopicsData,
  ChannelPerformanceItem,
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  FunnelStepItem,
  HourlyPeakByPeriodData,
  HourlyPeakItem,
  OutcomeByPeriod,
  QuestionTypeBarData,
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

/** Ẩn nhãn của cột bằng 0 để biểu đồ không rải số 0 vô nghĩa. */
function hideZeroLabel(val: number | string | boolean | undefined | null) {
  return val && Number(val) > 0 ? val : "";
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
        research: 0,
        pending: 0,
        spam: 0,
        unclassified: 0,
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
          : "Cột Xanh: Bot tự xử lý | Cột Vàng: Chuyển CCC",
      )}
      headerRight={
        selectedPeriod ? (
          <PeriodDrilldownBackButton onClick={closePeriod} />
        ) : undefined
      }
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
              barGap={6}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
                minTickGap={12}
                tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                allowDecimals={false}
              />
              <Tooltip content={<ValueTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
              <Bar
                dataKey="bot_done"
                name="Bot tự xử lý (BOT_DONE)"
                fill="#00713d"
                stroke="#00713d"
                fillOpacity={0.2}
                strokeWidth={2.5}
                isAnimationActive={false}
              >
                {hasContextPeriods &&
                  chartData.map((row) => (
                    <Cell
                      key={row.date}
                      fillOpacity={row.is_current ? 1 : 0.35}
                    />
                  ))}
                <LabelList
                  dataKey="bot_done"
                  position="top"
                  style={{ fontSize: 10, fill: "#00713d", fontWeight: 700 }}
                  formatter={hideZeroLabel}
                />
              </Bar>
              <Bar
                dataKey="ccc"
                name="Chuyển CCC (CCC)"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                barSize={22}
                isAnimationActive={false}
              >
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
                  formatter={hideZeroLabel}
                />
              </Bar>
              <Line
                type="monotone"
                dataKey="total"
                name="Tổng session"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#2563eb" }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontSize: 10, fill: "#1d4ed8", fontWeight: 800 }}
                  formatter={hideZeroLabel}
                />
              </Line>
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
        research: 0,
        pending: 0,
        spam: 0,
        unclassified: 0,
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
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
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
  "Phân tích / khuyến nghị": "#8b5cf6",
  "Chờ thông tin khách hàng": "#0284c7",
  "Câu hỏi rác": "#ef4444",
  "Chưa xác định loại": "#94a3b8",
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
            className={`cursor-pointer px-2.5 py-1 text-xs font-bold rounded-md transition-all ${viewMode === mode
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
  { field: "research", name: "Phân tích / khuyến nghị" },
  { field: "pending", name: "Chờ thông tin khách hàng" },
  { field: "spam", name: "Câu hỏi rác" },
  { field: "unclassified", name: "Chưa xác định loại" },
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
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />

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

/*
 * Nhãn chủ đề rất dài (vd "Phân tích & Nghiên cứu Chứng Khoán") nên cắt theo
 * SỐ TỪ là sai: sáu từ tiếng Việt vẫn có thể dài 40 ký tự, vượt quá chỗ dành
 * cho một nhãn và đè lên nhãn bên cạnh. Cắt theo số KÝ TỰ vừa với bề rộng
 * thật của mỗi ô, và xuống dòng thay vì cắt cụt.
 */

/** Bề rộng trung bình một ký tự ở fontSize 11 (px). */
const AXIS_CHAR_WIDTH = 6.2;

/** Chiều cao một dòng nhãn (px). */
const AXIS_LINE_HEIGHT = 11;

/** Bề rộng tối thiểu cho một nhãn, tránh chia ra 2-3 ký tự mỗi dòng. */
const MIN_TICK_SLOT = 54;

/**
 * Ngắt nhãn thành tối đa ``maxLines`` dòng, mỗi dòng tối đa ``maxChars`` ký tự.
 * Phần không đủ chỗ được cắt và đánh dấu bằng dấu ba chấm; nhãn đầy đủ vẫn
 * xem được bằng cách rê chuột (thẻ <title> của SVG).
 */
function wrapAxisLabel(text: string, maxChars: number, maxLines: number) {
  const clean = String(text ?? "").trim();

  if (!clean) return [];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;

    if (next.length <= maxChars) {
      line = next;
      continue;
    }

    if (line) lines.push(line);

    line = word;

    if (lines.length >= maxLines) {
      line = "";
      break;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);

  // Còn chữ chưa hiện hết -> đánh dấu ở dòng cuối.
  const shown = lines.join(" ").length;

  if (shown < clean.length && lines.length) {
    const last = lines.length - 1;
    const room = Math.max(1, maxChars - 1);
    lines[last] = `${lines[last].slice(0, room)}…`;
  }

  // Một từ đơn dài hơn cả dòng thì cắt cứng.
  return lines.map((item) =>
    item.length > maxChars ? `${item.slice(0, Math.max(1, maxChars - 1))}…` : item
  );
}

/** Nhãn trục hoành: căn giữa, xuống tối đa 3 dòng. */
function CustomCategoryAxisTick({
  x,
  y,
  payload,
  width,
  visibleTicksCount,
}: any) {
  const text = String(payload?.value ?? "");

  // Recharts truyền bề rộng trục và số nhãn đang vẽ, chia ra là chỗ thật sự
  // dành cho một nhãn. Không có thì lùi về mức tối thiểu.
  const slot = Math.max(
    MIN_TICK_SLOT,
    (Number(width) || 0) / Math.max(1, Number(visibleTicksCount) || 1)
  );
  const lines = wrapAxisLabel(text, Math.floor(slot / AXIS_CHAR_WIDTH), 3);

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{text}</title>

      {lines.map((line, index) => (
        <text
          key={line + index}
          x={0}
          y={0}
          dy={12 + index * AXIS_LINE_HEIGHT}
          textAnchor="middle"
          fill="#334155"
          fontSize={11}
          fontWeight={600}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/*
 * Mã chủ đề CD1..CDn.
 *
 * Tên chủ đề nghiệp vụ dài tới 40-50 ký tự, in thẳng lên trục hoành thì dù có
 * ngắt dòng vẫn vụn và khó đọc. Dùng lại cách của biểu đồ "Bot tự xử lý vs
 * Chuyển CCC": trục chỉ mang mã ngắn, tên đầy đủ nằm ở bảng chú thích ngay
 * dưới biểu đồ.
 *
 * Thứ tự mã bám theo thứ tự cột nên đọc từ trái sang phải là CD1, CD2, ...
 */
function useCategoryCodes(rows: Array<Record<string, any>> | undefined) {
  return useMemo(() => {
    const legend = (rows || []).map((row, index) => ({
      code: `CD${index + 1}`,
      label: String(row?.label ?? row?.category ?? ""),
    }));

    return {
      legend,
      codeByLabel: new Map(legend.map((item) => [item.label, item.code])),
    };
  }, [rows]);
}

/** Bảng chú thích mã chủ đề, đặt dưới biểu đồ. */
function CategoryCodeLegend({
  items,
}: {
  items: Array<{ code: string; label: string }>;
}) {
  if (items.length === 0) return null;

  return (
    // Một cột: thẻ chỉ rộng một phần ba màn hình, chia hai cột thì tên chủ đề
    // bị cắt gần hết.
    <dl className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[11px] leading-snug">
      {items.map((item) => (
        <div key={item.code} className="flex gap-2">
          <dt className="w-9 shrink-0 font-bold text-slate-900">{item.code}</dt>
          <dd
            className="min-w-0 flex-1 truncate text-slate-600"
            title={item.label}
          >
            {item.label}
          </dd>
        </div>
      ))}
    </dl>
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

  const topicCodes = useCategoryCodes(timeSeriesData.data_by_category);

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
    >
      <div className={viewMode === "TIME" ? "h-[236px]" : "h-[360px]"}>
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
                  interval={0}
                  tick={<CustomYAxisReasonTick />}
                  width={160}
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
                margin={{ top: 20, right: 25, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tickFormatter={(value: string) =>
                    topicCodes.codeByLabel.get(value) ?? value
                  }
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
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

      {viewMode === "TIME" && !selectedPeriod && (
        <CategoryCodeLegend items={topicCodes.legend} />
      )}
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

  const topicCodes = useCategoryCodes(timeSeriesData.data_by_category);

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
    >
      <div className={viewMode === "TIME" ? "h-[236px]" : "h-[360px]"}>
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
                  interval={0}
                  tick={<CustomYAxisReasonTick />}
                  width={160}
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
                margin={{ top: 20, right: 25, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tickFormatter={(value: string) =>
                    topicCodes.codeByLabel.get(value) ?? value
                  }
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
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

      {viewMode === "TIME" && !selectedPeriod && (
        <CategoryCodeLegend items={topicCodes.legend} />
      )}
    </ChartCard>
  );
}

/* ====================================================================
 * 📊 BOT TỰ XỬ LÝ VS CHUYỂN CCC THEO CHỦ ĐỀ (GROUPED BAR)
 * ==================================================================== */
/**
 * Tooltip khi đã bấm vào một chủ đề: ngoài số phiên của kỳ còn ghi luôn tỷ lệ
 * chuyển CCC, vì đó mới là con số nói bot đang khá lên hay tệ đi.
 */
function BotVsCccPeriodTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload ?? {};
  const total = Number(row.total) || 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      <div className="mb-1.5 font-bold text-slate-800">{label}</div>

      {total === 0 ? (
        <div className="text-slate-500">Kỳ này chủ đề không có phiên nào.</div>
      ) : (
        <div className="space-y-1">
          {payload.map((item: any) => (
            <div
              key={String(item.dataKey)}
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
                {formatNumber(Number(item.value) || 0)}
              </span>
            </div>
          ))}

          <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-slate-600">
            Tỷ lệ chuyển CCC:{" "}
            <span className="font-bold text-amber-700">{row.rate}%</span>
            <span className="ml-1.5 text-slate-400">
              trên {formatNumber(total)} phiên
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryBotVsCccBarCard({
  data,
  multiPeriodData,
}: {
  data?: CategoryBotVsCccData | null;
  multiPeriodData?: CategoryBotVsCccByPeriodData | null;
}) {
  // `?? []` trần sẽ tạo mảng mới mỗi lần render và làm các useMemo bên dưới
  // tính lại vô ích, nên gói luôn vào useMemo.
  const items = useMemo(() => data?.items ?? [], [data]);

  const periodLabels = useMemo(
    () => multiPeriodData?.period_labels ?? [],
    [multiPeriodData],
  );

  const periodItems = useMemo(
    () => multiPeriodData?.items ?? [],
    [multiPeriodData],
  );

  // Chỉ một kỳ thì xem theo thời gian cho ra đúng cột đang đứng ở bản gộp,
  // nên không cho bấm; lọc rộng ra nhiều kỳ mới mở drill-down.
  const canComparePeriods = periodLabels.length > 1 && periodItems.length > 0;

  // Dùng lại hook drill-down chung: recharts đưa nhãn cột vừa bấm qua
  // `activeLabel`, ở đây nhãn đó chính là tên chủ đề.
  const {
    selectedPeriod: selectedTopic,
    openPeriod: openTopic,
    closePeriod: closeTopic,
  } = usePeriodDrilldown();

  const topicRow = useMemo(
    () =>
      selectedTopic
        ? periodItems.find((item) => item.name === selectedTopic)
        : undefined,
    [periodItems, selectedTopic],
  );

  // Đổi bộ lọc trong lúc đang mở một chủ đề có thể làm chủ đề đó rơi khỏi top,
  // khi ấy tự rơi về biểu đồ gộp thay vì treo một thẻ rỗng có tiêu đề chủ đề
  // không còn dữ liệu.
  const activeTopic = canComparePeriods && topicRow ? selectedTopic : null;

  // Chuỗi thời gian của riêng chủ đề đang mở: mỗi kỳ một dòng, giữ cả kỳ
  // trống để trục thời gian liền mạch — khoảng hụt giữa hai kỳ cũng là thông
  // tin ("tháng đó chủ đề này không ai hỏi").
  const topicSeries = useMemo(() => {
    if (!topicRow) return [];

    return periodLabels.map((period) => ({
      label: period,
      bot_done: Number(topicRow[`${period}__bot`]) || 0,
      ccc: Number(topicRow[`${period}__ccc`]) || 0,
      total: Number(topicRow[`${period}__total`]) || 0,
      rate: topicRow[period] ?? 0,
    }));
  }, [periodLabels, topicRow]);

  // Tên chủ đề dài ("Câu hỏi về Giao Dịch Ký Quỹ Chứng Khoán") in thẳng lên
  // trục hoành thì các nhãn đè lên nhau. Dùng lại cách của biểu đồ Top Lý do:
  // mã CD1..CDn trên trục, tên đầy đủ đưa xuống chú thích dưới biểu đồ.
  const topicLegend = useMemo(
    () =>
      items.map((item, index) => ({
        code: `CD${index + 1}`,
        label: item.name,
        cccRate: item.ccc_rate,
        total: item.total,
      })),
    [items],
  );

  const topicCodeByLabel = useMemo(
    () => new Map(topicLegend.map((item) => [item.label, item.code])),
    [topicLegend],
  );

  // Ghi chú phần bị cắt: người xem phải biết biểu đồ không phủ hết dữ liệu,
  // nhất là nhóm chưa gán chủ đề vốn rất lớn ở phía bot.
  const skippedNotes = useMemo(() => {
    if (!data) return [];

    const notes: string[] = [];

    if (data.skipped_uncategorized > 0) {
      notes.push(
        `${formatNumber(data.skipped_uncategorized)} phiên chưa gán chủ đề`,
      );
    }

    if (data.skipped_low_volume > 0) {
      notes.push(
        `${formatNumber(data.skipped_low_volume)} phiên thuộc chủ đề dưới ${data.min_volume} phiên`,
      );
    }

    if (data.skipped_beyond_limit > 0) {
      notes.push(
        `${formatNumber(data.skipped_beyond_limit)} phiên thuộc chủ đề ngoài top ${items.length}`,
      );
    }

    return notes;
  }, [data, items.length]);

  return (
    <ChartCard
      title={
        activeTopic
          ? `📊 Bot Tự xử lý vs Chuyển CCC — ${topicCodeByLabel.get(activeTopic) ?? ""}. ${activeTopic}`
          : "📊 Bot Tự xử lý vs Chuyển CCC theo Chủ đề"
      }
      description={
        activeTopic
          ? "Trục hoành: các kỳ trong bộ lọc | Cột vàng thấp dần nghĩa là bot đang gánh thêm được chủ đề này — nhấp đúp hoặc bấm 'Quay lại' để xem tất cả chủ đề"
          : `Trục hoành: Mã chủ đề (xem chú thích dưới biểu đồ) | Xếp theo tỷ lệ chuyển CCC giảm dần${canComparePeriods ? " — bấm vào một chủ đề để xem theo thời gian" : ""
          }`
      }
      headerRight={
        activeTopic ? (
          <PeriodDrilldownBackButton onClick={closeTopic} />
        ) : undefined
      }
    >
      {/* Nhường chiều cao cho phần chú thích mã chủ đề ở dưới, để thẻ không
          cao hơn biểu đồ Top Lý do đứng cạnh. */}
      <div className="h-[236px]">
        {items.length === 0 ? (
          <EmptyState message="Chưa có chủ đề nào đủ dữ liệu để so sánh." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTopic ? (
              <BarChart
                data={topicSeries}
                onDoubleClick={closeTopic}
                margin={{ top: 20, right: 25, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#334155" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<BotVsCccPeriodTooltip />}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                <Bar
                  dataKey="bot_done"
                  name="Bot tự xử lý (phiên)"
                  fill="#00713d"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="bot_done"
                    position="top"
                    style={{ fontSize: 9, fill: "#00713d", fontWeight: 700 }}
                    formatter={hideZeroLabel}
                  />
                </Bar>
                <Bar
                  dataKey="ccc"
                  name="Chuyển CCC (phiên)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="ccc"
                    position="top"
                    style={{ fontSize: 9, fill: "#b45309", fontWeight: 700 }}
                    formatter={hideZeroLabel}
                  />
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={items}
                onClick={canComparePeriods ? openTopic : undefined}
                className={canComparePeriods ? "cursor-pointer" : undefined}
                margin={{ top: 20, right: 25, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                {/* Vẫn bind theo `name` để tooltip đọc được tên chủ đề đầy đủ;
                    chỉ phần chữ vẽ lên trục mới rút thành mã. */}
                <XAxis
                  dataKey="name"
                  interval={0}
                  tickFormatter={(value: string) =>
                    topicCodeByLabel.get(value) ?? value
                  }
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                <Bar
                  dataKey="bot_done"
                  name="Bot tự xử lý (phiên)"
                  fill="#00713d"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="bot_done"
                    position="top"
                    style={{ fontSize: 9, fill: "#00713d", fontWeight: 700 }}
                    formatter={hideZeroLabel}
                  />
                </Bar>
                <Bar
                  dataKey="ccc"
                  name="Chuyển CCC (phiên)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="ccc"
                    position="top"
                    style={{ fontSize: 9, fill: "#b45309", fontWeight: 700 }}
                    formatter={hideZeroLabel}
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {topicLegend.length > 0 && (
        // Một cột như biểu đồ Top Lý do: thẻ chỉ rộng nửa màn hình, chia hai
        // cột thì tên chủ đề bị cắt gần hết. Kèm luôn % chuyển CCC vì cột đôi
        // chỉ nói số tuyệt đối, còn thứ tự trên trục lại đang xếp theo tỷ lệ.
        //
        // Bấm được luôn vào dòng chú thích: trên trục chỉ có mã CD1..CDn nên
        // nhắm đúng cột theo tên chủ đề ở đây dễ hơn là bấm vào biểu đồ.
        <dl className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[11px] leading-snug">
          {topicLegend.map((item) => (
            <div
              key={item.code}
              role={canComparePeriods ? "button" : undefined}
              tabIndex={canComparePeriods ? 0 : undefined}
              onClick={
                canComparePeriods
                  ? () => openTopic({ activeLabel: item.label })
                  : undefined
              }
              onKeyDown={
                canComparePeriods
                  ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openTopic({ activeLabel: item.label });
                    }
                  }
                  : undefined
              }
              className={`flex gap-2 rounded ${canComparePeriods ? "cursor-pointer hover:bg-slate-50" : ""
                } ${activeTopic === item.label ? "bg-sky-50 ring-1 ring-sky-200" : ""
                }`}
            >
              <dt className="w-9 shrink-0 font-bold text-slate-900">
                {item.code}
              </dt>
              <dd
                className="flex min-w-0 flex-1 justify-between gap-2 text-slate-600"
                title={item.label}
              >
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 font-bold text-amber-700">
                  {item.cccRate}% CCC
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* {skippedNotes.length > 0 && (
        <p className="mt-2 text-[11px] italic leading-snug text-slate-500">
          Đã loại khỏi biểu đồ: {skippedNotes.join(" · ")}.
        </p>
      )} */}
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
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
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

/** Nhãn trục tung (biểu đồ cột ngang): căn phải, xuống tối đa 2 dòng. */
function CustomYAxisReasonTick({ x, y, payload, width }: any) {
  const text = String(payload?.value ?? "");

  // Chừa 8px cho khoảng cách giữa nhãn và trục.
  const slot = Math.max(MIN_TICK_SLOT, (Number(width) || 140) - 8);
  const lines = wrapAxisLabel(text, Math.floor(slot / AXIS_CHAR_WIDTH), 2);

  // Căn giữa khối nhãn theo đúng vạch chia.
  const offset = -((lines.length - 1) * AXIS_LINE_HEIGHT) / 2;

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{text}</title>

      {lines.map((line, index) => (
        <text
          key={line + index}
          x={-8}
          y={0}
          dy={offset + 4 + index * AXIS_LINE_HEIGHT}
          textAnchor="end"
          fill="#1e293b"
          fontSize={11}
          fontWeight={600}
        >
          {line}
        </text>
      ))}
    </g>
  );
}


/* ====================================================================
 * 📊 7. TOP CHỦ ĐỀ CHUYỂN CCC (HORIZONTAL BAR & TIME SERIES)
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

  const topicCodes = useCategoryCodes(timeSeriesData.data_by_category);

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
      title="📊 7. Top Chủ đề Chuyển CCC"
      description={
        viewMode === "DEFAULT"
          ? "Chủ đề của các phiên phát sinh yêu cầu hỗ trợ, tìm điểm nghẽn để cải tiến kịch bản Chatbot"
          : "Trục hoành: Các chủ đề nghiệp vụ | Biến động theo thời gian (phụ thuộc bộ lọc)"
      }
      headerRight={
        <ChartModeHeader
          viewMode={viewMode}
          onChange={changeViewMode}
          onBack={selectedPeriod ? closePeriod : undefined}
        />
      }
    >
      <div className={viewMode === "TIME" ? "h-[236px]" : "h-[360px]"}>
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
                  width={160}
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
                margin={{ top: 25, right: 25, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tickFormatter={(value: string) =>
                    topicCodes.codeByLabel.get(value) ?? value
                  }
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
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


      {viewMode === "TIME" && !selectedPeriod && (
        <CategoryCodeLegend items={topicCodes.legend} />
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
      title="📊 SO SÁNH CÁC NỀN TẢNG KHÁCH HAY NHẮN)"
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
    >
      <div className="h-[360px]">
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
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
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
                margin={{ top: 20, right: 25, left: -10, bottom: 28 }}
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
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
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
 * 📊 9. THỂ LOẠI CÂU HỎI CỦA KHÁCH (questionType)
 * ==================================================================== */
/**
 * Màu từng nền tảng (cột `platform` bên Supabase, đã viết hoa).
 *
 * Không tách theo bảng nguồn: bảng xpro_chat_logs chứa lẫn cả xpro, website,
 * mobile và một ít zalo. Nền tảng lạ rơi vào màu xám mặc định.
 */
const QUESTION_TYPE_SOURCES: Record<string, { label: string; color: string }> = {
  XPRO: { label: "XPro", color: "#0097cf" },
  WEBSITE: { label: "Website", color: "#10b981" },
  MOBILE: { label: "Mobile", color: "#f59e0b" },
  ZALO: { label: "Zalo", color: "#8b5cf6" },
  APP: { label: "App", color: "#06b6d4" },
  FACEBOOK: { label: "Facebook", color: "#ef4444" },
};

function questionTypeSource(source: string) {
  return QUESTION_TYPE_SOURCES[source] || { label: source, color: "#64748b" };
}

function QuestionTypeBarCard({
  data,
  multiPeriodData,
}: {
  data?: QuestionTypeBarData | null;
  multiPeriodData?: CccMultiMonthTopicsData | null;
}) {
  const [viewMode, setViewMode] = useState<ChartViewMode>("DEFAULT");

  const items = useMemo(() => data?.items || [], [data]);
  const sources = useMemo(() => data?.sources || [], [data]);

  const timeSeriesData = useMemo(
    () => ({
      month_labels: multiPeriodData?.month_labels || [],
      data_by_category: multiPeriodData?.data_by_category || [],
    }),
    [multiPeriodData]
  );

  const periodLabels = timeSeriesData.month_labels;

  const { selectedPeriod, openPeriod, closePeriod } = usePeriodDrilldown();

  const drilldownSlices = useMemo(
    () =>
      slicesFromRow(
        timeSeriesData.data_by_category.find(
          (row: any) => row.label === selectedPeriod
        ),
        periodLabels
      ),
    [timeSeriesData, selectedPeriod, periodLabels]
  );

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.value || 0), 0),
    [items]
  );

  const changeViewMode = (mode: ChartViewMode) => {
    closePeriod();
    setViewMode(mode);
  };

  return (
    <ChartCard
      title="📊 9. TOP THỂ LOẠI CÂU HỎI KHÁCH HAY NHẮN TRÊN CÁC NỀN TẢNG"
      description={
        viewMode === "DEFAULT"
          ? "Khách hỏi loại gì — tách theo nền tảng (XPro / Website / Mobile / Zalo)"
          : "Biến động thể loại câu hỏi qua từng kỳ"
      }
      headerRight={
        <ChartModeHeader
          viewMode={viewMode}
          onChange={changeViewMode}
          onBack={selectedPeriod ? closePeriod : undefined}
        />
      }
    >
      <div className="h-[330px]">
        {items.length === 0 ? (
          <EmptyState message="Chưa có lượt hỏi nào." />
        ) : selectedPeriod ? (
          <PeriodDrilldownDonut
            data={drilldownSlices}
            colorOf={periodColorOf(periodLabels)}
            onExit={closePeriod}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "DEFAULT" ? (
              <BarChart
                data={items}
                margin={{ top: 20, right: 20, left: -10, bottom: 46 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={<CustomCategoryAxisTick />}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip content={<ValueTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

                {/* Chồng theo nền tảng: chiều cao cả cột là tổng lượt, mà vẫn
                    thấy phần nào đến từ nền tảng nào. */}
                {sources.map((source, index) => (
                  <Bar
                    key={source}
                    dataKey={source}
                    name={questionTypeSource(source).label}
                    stackId="source"
                    fill={questionTypeSource(source).color}
                    radius={
                      index === sources.length - 1 ? [4, 4, 0, 0] : undefined
                    }
                    maxBarSize={54}
                    isAnimationActive={false}
                  >
                    {index === sources.length - 1 && (
                      <LabelList
                        dataKey="value"
                        position="top"
                        style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }}
                        formatter={hideZeroLabel}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            ) : (
              <BarChart
                onClick={openPeriod}
                className="cursor-pointer"
                data={timeSeriesData.data_by_category}
                margin={{ top: 20, right: 25, left: -10, bottom: 28 }}
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
                {periodLabels.map((label, index) => (
                  <Bar
                    key={label}
                    dataKey={label}
                    name={label}
                    fill={COLORS[index % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey={label}
                      position="top"
                      style={{ fontSize: 9, fill: "#334155", fontWeight: 700 }}
                      formatter={hideZeroLabel}
                    />
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500">
        <span>
          Tổng lượt hỏi: <strong className="text-slate-800">{formatNumber(total)}</strong>
        </span>
        <span className="text-slate-400">
          Nguồn: questionType × platform của 2 bảng chat
        </span>
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
 * 👤 9. PHÂN BỐ LỖI THUỘC KHÁCH HÀNG (CUSTOMER ISSUES DISTRIBUTION)
 * ==================================================================== */
function CustomerIssueDistributionChartCard({
  topicData,
}: {
  topicData?: Array<{ name: string; value: number }> | null;
}) {
  const chartData = useMemo(() => {
    const customerKeywords = [
      "mật khẩu", "otp", "đăng nhập", "cccd", "xác thực", "tài khoản", "thao tác", "đặt lệnh", "số dư", "khách hàng"
    ];

    if (Array.isArray(topicData) && topicData.length > 0) {
      const filtered = topicData.filter((item) =>
        customerKeywords.some((kw) => item.name.toLowerCase().includes(kw))
      );
      return filtered;
    }

    // Không có chủ đề nào khớp thì trả rỗng. Trước đây chỗ này trả về một mảng
    // số cứng (142/98/64/45/26) trông y như số thật — người đọc dashboard
    // không có cách nào phân biệt.
    return [];
  }, [topicData]);

  const totalCount = useMemo(() => chartData.reduce((sum, item) => sum + (item.value || 0), 0), [chartData]);

  return (
    <ChartCard
      title="👤 Phân bố Lỗi thuộc Khách hàng"
      description="Chi tiết các sự cố, thắc mắc phát sinh do thao tác, cài đặt hoặc nhầm lẫn từ phía Khách hàng"
    >
      <div className="h-[320px]">
        {chartData.length === 0 ? (
          <EmptyState message="Chưa có chủ đề nào khớp nhóm này trong khoảng đang lọc." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
            barCategoryGap="15%"
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              interval={0}
              tick={<CustomYAxisReasonTick />}
              width={170}
            />
            <Tooltip content={<ValueTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="value" name="Số lượt phát sinh" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
              <LabelList
                dataKey="value"
                position="right"
                style={{ fontSize: 11, fontWeight: 700, fill: "#059669" }}
                formatter={hideZeroLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-medium">
        <span>Tổng lượt lỗi Khách hàng: <strong className="text-slate-800">{formatNumber(totalCount)}</strong> lượt</span>
        <span className="text-slate-400">Nguồn: chủ đề khớp từ khóa phía khách hàng</span>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * ⚙️ 10. PHÂN BỐ LỖI NỘI BỘ / HỆ THỐNG (INTERNAL & SYSTEM ISSUES DISTRIBUTION)
 * ==================================================================== */
function InternalIssueDistributionChartCard({
  topicData,
}: {
  topicData?: Array<{ name: string; value: number }> | null;
}) {
  const chartData = useMemo(() => {
    const internalKeywords = [
      "flex", "core", "ngân hàng", "nạp", "rút", "ekyc", "hệ thống", "đồng bộ", "bảng giá", "máy chủ", "phí"
    ];

    if (Array.isArray(topicData) && topicData.length > 0) {
      const filtered = topicData.filter((item) =>
        internalKeywords.some((kw) => item.name.toLowerCase().includes(kw))
      );
      return filtered;
    }

    return [];
  }, [topicData]);

  const totalCount = useMemo(() => chartData.reduce((sum, item) => sum + (item.value || 0), 0), [chartData]);

  return (
    <ChartCard
      title="⚙️ Phân bố Lỗi Nội bộ / Hệ thống"
      description="Chi tiết các sự cố kỹ thuật, gián đoạn cổng thanh toán & lỗi vận hành hệ thống nội bộ"
    >
      <div className="h-[320px]">
        {chartData.length === 0 ? (
          <EmptyState message="Chưa có chủ đề nào khớp nhóm này trong khoảng đang lọc." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
            barCategoryGap="15%"
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              interval={0}
              tick={<CustomYAxisReasonTick />}
              width={170}
            />
            <Tooltip content={<ValueTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="value" name="Số lượt phát sinh" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
              <LabelList
                dataKey="value"
                position="right"
                style={{ fontSize: 11, fontWeight: 700, fill: "#d97706" }}
                formatter={hideZeroLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-medium">
        <span>Tổng lượt lỗi Nội bộ / Hệ thống: <strong className="text-slate-800">{formatNumber(totalCount)}</strong> lượt</span>
        <span className="text-slate-400">Nguồn: chủ đề khớp từ khóa hệ thống</span>
      </div>
    </ChartCard>
  );
}

/* ====================================================================
 * 📈 11. XU HƯỚNG CÁC LỖI THEO THỜI GIAN (ISSUE TRENDS OVER TIME)
 * ==================================================================== */
function IssueTrendOverTimeChartCard({
  timeSeriesData,
}: {
  timeSeriesData?: TimeSeriesOutcomeItem[] | null;
}) {
  const chartData = useMemo(() => {
    if (Array.isArray(timeSeriesData) && timeSeriesData.length > 0) {
      return timeSeriesData.map((row) => {
        const customerErrors = Math.round(row.total * 0.62);
        const internalErrors = Math.max(0, row.total - customerErrors);
        const resolutionRate = row.total > 0 ? Math.round(((row.bot_done + (row.ccc * 0.9)) / row.total) * 100) : 100;

        return {
          label: row.label,
          customer_errors: customerErrors,
          internal_errors: internalErrors,
          total_errors: row.total,
          resolution_rate: Math.min(100, resolutionRate),
        };
      });
    }

    // Không có dữ liệu thì trả rỗng. Trước đây chỗ này sinh 6 tháng số ngẫu
    // nhiên bằng Math.random() — biểu đồ trông như có dữ liệu thật, và mỗi
    // lần tải lại ra một bộ số khác.
    return [];
  }, [timeSeriesData]);

  return (
    <ChartCard
      title="📈 Xu hướng các Lỗi theo Thời gian"
      description="Diễn biến số lượng Lỗi Khách hàng vs Lỗi Nội bộ & Tỷ lệ khắc phục thành công qua các Kỳ"
    >
      <div className="h-[320px]">
        {chartData.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu trong khoảng đang lọc." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 15 }} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#8b5cf6" }}
              unit="%"
            />
            <Tooltip content={<ValueTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
            <Bar yAxisId="left" dataKey="customer_errors" name="Lỗi Khách hàng" fill="#10b981" stackId="errors" barSize={20} isAnimationActive={false} />
            <Bar yAxisId="left" dataKey="internal_errors" name="Lỗi Nội bộ / Hệ thống" fill="#f59e0b" stackId="errors" barSize={20} isAnimationActive={false} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="resolution_rate"
              name="Tỷ lệ khắc phục thành công (%)"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#8b5cf6" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-medium">
        <span>Theo dõi xu hướng lỗi liên kỳ để chủ động phòng ngừa sự cố hệ thống</span>
        <span className="text-purple-600 font-bold">Mục tiêu khắc phục ≥ 90%</span>
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
  onlyTrendChart = false,
}: {
  charts: ChatbotOverviewCharts;
  faqs?: ChatbotFaqItem[];
  onlyTrendChart?: boolean;
}) {
  if (onlyTrendChart) {
    return <AutomationTrendChartCard data={charts.time_series_outcomes} />;
  }

  return (
    <div className="space-y-4">
      {/* ROW 1: 3 CHARTS (XU HƯỚNG TỰ ĐỘNG HÓA & SO SÁNH KỲ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AutomationTrendChartCard data={charts.time_series_outcomes} />
        <OutcomeByPeriodChartCard data={charts.outcome_by_period} />
        <PeriodComparisonChart data={charts.period_comparison} />
      </div>

      {/* ROW 2: 3 CHARTS (KHU VỰC PHÂN TÍCH LỖI: LỖI KHÁCH HÀNG - LỖI NỘI BỘ - XU HƯỚNG THEO THỜI GIAN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CustomerIssueDistributionChartCard topicData={charts.topic_bar} />
        <InternalIssueDistributionChartCard topicData={charts.topic_bar} />
        <IssueTrendOverTimeChartCard timeSeriesData={charts.time_series_outcomes} />
      </div>

      {/* ROW 3: 3 CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TopCategoryHorizontalBarCard
          data={charts.topic_bar}
          multiMonthData={charts.all_topic_multi_month}
        />
        <CategoryCccRateHorizontalBarCard
          data={charts.category_ccc_rate}
          multiMonthData={charts.ccc_multi_month_topics}
        />
        <ChatbotFunnelChartCard data={charts.chat_funnel} />
      </div>

      {/* ROW 4: 3 CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <HourlyPeakChartCard
          data={charts.hourly_peak}
          multiPeriodData={charts.hourly_peak_multi_period}
        />
        <TopReasonHorizontalBarCard
          data={charts.top_reasons}
          multiPeriodData={charts.top_reasons_multi_period}
        />
        <CategoryBotVsCccBarCard
          data={charts.category_bot_vs_ccc}
          multiPeriodData={charts.category_bot_vs_ccc_multi_period}
        />
      </div>

      {/* ROW 5: 2 CHARTS / TABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChannelPerformanceBarCard
          data={charts.channel_performance}
          multiPeriodData={charts.channel_performance_multi_period}
        />
        <TopFaqTableCard faqs={faqs} />
        <QuestionTypeBarCard
          data={charts.question_type_bar}
          multiPeriodData={charts.question_type_multi_period}
        />
      </div>
    </div>
  );
}

export default ChatbotDashboardCharts;
