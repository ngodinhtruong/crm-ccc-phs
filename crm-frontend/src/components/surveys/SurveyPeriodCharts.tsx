"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  PeriodDrilldownBackButton,
  PeriodDrilldownDonut,
  usePeriodDrilldown,
  type DrilldownSlice,
} from "@/components/common";
import type { SurveySeriesItem } from "@/types/survey.type";

const RATED = "#2a78d6";
const UNRATED = "#eb6834";
const RESPONSE_RATE = "#008300";
const CSAT = "#4a3aa7";

const SENT_OK = "#64748b";
const SENT_FAILED = "#d03b3b";
const TOTAL_SURVEY = "#10b981";

const SURFACE = "#ffffff";
const GRID = "#e2e8f0";
const INK = "#475569";

const CONTEXT_OPACITY = 0.85;

const AXIS = {
  tick: { fontSize: 11, fill: INK },
  axisLine: false,
  tickLine: false,
} as const;

function ChartCard({
  title,
  hint,
  className = "",
  action,
  children,
}: {
  title: string;
  hint: string;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="h-3.5 w-1 rounded-full bg-[#00713d]" />
        <h3 className="text-xs font-black tracking-wide text-[#00713d]">
          {title}
        </h3>
        <span className="text-[11px] text-slate-400">{hint}</span>
        {action && <div className="ml-auto">{action}</div>}
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

function PeriodTick({
  x,
  y,
  payload,
  currentLabel,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  currentLabel: string;
}) {
  const value = payload?.value ?? "";
  const isCurrent = value === currentLabel;

  return (
    <text
      x={x}
      y={(y ?? 0) + 12}
      textAnchor="middle"
      fontSize={11}
      fontWeight={isCurrent ? 800 : 400}
      fill={isCurrent ? "#0f172a" : INK}
    >
      {value}
    </text>
  );
}

type TooltipRow = { label: string; value: string; color?: string };

function SeriesTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: TooltipRow[];
}) {
  if (!active) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold text-slate-800">{label}</p>

      {rows.map((row) => (
        <p
          key={row.label}
          className="flex items-center justify-between gap-4 text-slate-600"
        >
          <span className="flex items-center gap-1.5">
            {row.color && (
              <span
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: row.color }}
              />
            )}
            {row.label}
          </span>
          <span className="font-bold tabular-nums text-slate-800">
            {row.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function findItem(series: SurveySeriesItem[], shortLabel?: string) {
  return series.find((item) => item.short_label === shortLabel);
}

function percent(value?: number | null) {
  return value === null || value === undefined ? "—" : `${value}%`;
}

function score(value?: number | null) {
  return value === null || value === undefined ? "—" : `${value}/5`;
}

function nonEmpty(slices: DrilldownSlice[]): DrilldownSlice[] {
  return slices.filter((slice) => slice.value > 0);
}

function deliverySlices(item: SurveySeriesItem): DrilldownSlice[] {
  return nonEmpty([
    { name: "Gửi thành công", value: item.success },
    { name: "Gửi thất bại", value: item.failed },
  ]);
}

function ratingSlices(item: SurveySeriesItem): DrilldownSlice[] {
  return nonEmpty([
    { name: "Khách đã đánh giá", value: item.rated },
    { name: "Khách không đánh giá", value: item.unrated },
  ]);
}

export function SurveyPeriodCharts({
  series,
  granularityLabel,
  onlyTrendChart = false,
}: {
  series: SurveySeriesItem[];
  granularityLabel: string;
  onlyTrendChart?: boolean;
}) {
  const delivery = usePeriodDrilldown();
  const rating = usePeriodDrilldown();

  const displaySeries = series;

  if (displaySeries.length === 0) return null;

  const currentLabel =
    displaySeries.find((item) => item.is_current)?.short_label ?? "";
  const tick = (props: object) => (
    <PeriodTick {...props} currentLabel={currentLabel} />
  );

  const deliveryItem = findItem(displaySeries, delivery.selectedPeriod ?? undefined);
  const ratingItem = findItem(displaySeries, rating.selectedPeriod ?? undefined);

  return (
    <div className={`grid gap-4 ${onlyTrendChart ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
      <ChartCard
        title={
          deliveryItem
            ? `GỬI THÀNH CÔNG / THẤT BẠI — ${deliveryItem.label.toUpperCase()}`
            : `GỬI THÀNH CÔNG / THẤT BẠI THEO ${granularityLabel.toUpperCase()}`
        }
        hint={
          deliveryItem
            ? "nháy đúp hoặc bấm Quay lại để xem tất cả các kỳ"
            : "bấm vào cột để xem chi tiết kỳ đó"
        }
        action={
          deliveryItem && (
            <PeriodDrilldownBackButton onClick={delivery.closePeriod} />
          )
        }
      >
        <div className="h-[260px]">
        {deliveryItem ? (
          <PeriodDrilldownDonut
            data={deliverySlices(deliveryItem)}
            colorOf={(name) =>
              name === "Gửi thành công" ? SENT_OK : SENT_FAILED
            }
            onExit={delivery.closePeriod}
            emptyMessage={`${deliveryItem.label} chưa gửi khảo sát nào.`}
          />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displaySeries}
            onClick={delivery.openPeriod}
            margin={{ top: 8, right: 32, bottom: 4, left: -12 }}
            barGap={0}
            barCategoryGap="15%"
            className="cursor-pointer"
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="short_label" {...AXIS} tick={tick} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...AXIS} allowDecimals={false} />

            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              content={({ active, label }) => {
                const item = findItem(displaySeries, label as string);
                const total = item?.total ?? 0;

                return (
                  <SeriesTooltip
                    active={active}
                    label={item?.label ?? (label as string)}
                    rows={[
                      {
                        label: "Gửi thành công",
                        value: String(item?.success ?? 0),
                        color: SENT_OK,
                      },
                      {
                        label: "Gửi thất bại",
                        value: String(item?.failed ?? 0),
                        color: SENT_FAILED,
                      },
                      {
                        label: "Tổng survey",
                        value: String(total),
                        color: TOTAL_SURVEY,
                      },
                      {
                        label: "Tỷ lệ gửi hỏng",
                        value: total
                          ? `${Math.round(((item?.failed ?? 0) / total) * 100)}%`
                          : "—",
                      },
                    ]}
                  />
                );
              }}
            />

            <Legend
              iconType="square"
              iconSize={9}
              wrapperStyle={{ fontSize: 11, color: INK, paddingTop: 8 }}
            />

            <Bar
              dataKey="success"
              name="Gửi thành công"
              fill={SENT_OK}
              stroke={SURFACE}
              strokeWidth={1}
              barSize={14}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            >
              {displaySeries.map((item) => (
                <Cell key={item.code} fillOpacity={item.is_current ? 1 : CONTEXT_OPACITY} />
              ))}
            </Bar>
            <Bar
              dataKey="failed"
              name="Gửi thất bại"
              fill={SENT_FAILED}
              stroke={SURFACE}
              strokeWidth={1}
              barSize={14}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            >
              {displaySeries.map((item) => (
                <Cell key={item.code} fillOpacity={item.is_current ? 1 : CONTEXT_OPACITY} />
              ))}
            </Bar>

            <Line
              type="monotone"
              dataKey="total"
              name="Tổng survey"
              stroke={TOTAL_SURVEY}
              strokeWidth={2}
              dot={{ r: 3, fill: TOTAL_SURVEY }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        )}
        </div>
      </ChartCard>

      {!onlyTrendChart && (
        <ChartCard
          title={
            ratingItem
              ? `LƯỢT GỬI THÀNH CÔNG — ${ratingItem.label.toUpperCase()}`
              : `LƯỢT GỬI THÀNH CÔNG THEO ${granularityLabel.toUpperCase()}`
          }
          hint={
            ratingItem
              ? "nháy đúp hoặc bấm Quay lại để xem tất cả các kỳ"
              : "bấm vào cột để xem chi tiết kỳ đó"
          }
          action={
            ratingItem && (
              <PeriodDrilldownBackButton onClick={rating.closePeriod} />
            )
          }
        >
          <div className="h-[260px]">
          {ratingItem ? (
            <PeriodDrilldownDonut
              data={ratingSlices(ratingItem)}
              colorOf={(name) =>
                name === "Khách đã đánh giá" ? RATED : UNRATED
              }
              onExit={rating.closePeriod}
              emptyMessage={`${ratingItem.label} chưa có lượt gửi thành công nào.`}
            />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displaySeries}
              onClick={rating.openPeriod}
              margin={{ top: 8, right: 32, bottom: 4, left: -12 }}
              barGap={0}
              barCategoryGap="15%"
              className="cursor-pointer"
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="short_label" {...AXIS} tick={tick} interval="preserveStartEnd" minTickGap={12} />
              <YAxis {...AXIS} allowDecimals={false} />

              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                content={({ active, label }) => {
                  const item = findItem(displaySeries, label as string);

                  return (
                    <SeriesTooltip
                      active={active}
                      label={item?.label ?? (label as string)}
                      rows={[
                        {
                          label: "Khách đã đánh giá",
                          value: String(item?.rated ?? 0),
                          color: RATED,
                        },
                        {
                          label: "Khách không đánh giá",
                          value: String(item?.unrated ?? 0),
                          color: UNRATED,
                        },
                        {
                          label: "Tổng gửi thành công",
                          value: String(item?.success ?? 0),
                        },
                        {
                          label: "Gửi thất bại",
                          value: String(
                            (item?.total ?? 0) - (item?.success ?? 0)
                          ),
                        },
                      ]}
                    />
                  );
                }}
              />

              <Legend
                iconType="square"
                iconSize={9}
                wrapperStyle={{ fontSize: 11, color: INK, paddingTop: 8 }}
              />

              <Bar
                dataKey="unrated"
                name="Khách không đánh giá"
                fill={UNRATED}
                stroke={SURFACE}
                strokeWidth={1}
                barSize={14}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {displaySeries.map((item) => (
                  <Cell key={item.code} fillOpacity={item.is_current ? 1 : CONTEXT_OPACITY} />
                ))}
              </Bar>
              <Bar
                dataKey="rated"
                name="Khách đã đánh giá"
                fill={RATED}
                stroke={SURFACE}
                strokeWidth={1}
                barSize={14}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {displaySeries.map((item) => (
                  <Cell key={item.code} fillOpacity={item.is_current ? 1 : CONTEXT_OPACITY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          )}
          </div>
        </ChartCard>
      )}

      {!onlyTrendChart && (
        <ChartCard
          title={`CHẤT LƯỢNG THEO ${granularityLabel.toUpperCase()}`}
          hint="cùng thang 0–100%; kỳ không có khảo sát thì không có cột"
          className="xl:col-span-2"
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 8, right: 32, bottom: 4, left: -12 }}
                barGap={0}
                barCategoryGap="15%"
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="short_label" {...AXIS} tick={tick} interval="preserveStartEnd" minTickGap={12} />
                <YAxis {...AXIS} domain={[0, 100]} unit="%" />

                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.12)" }}
                  content={({ active, label }) => {
                    const item = findItem(series, label as string);

                    return (
                      <SeriesTooltip
                        active={active}
                        label={item?.label ?? (label as string)}
                        rows={[
                          {
                            label: "Tỷ lệ phản hồi",
                            value: percent(item?.response_rate),
                            color: RESPONSE_RATE,
                          },
                          {
                            label: "CSAT",
                            value: percent(item?.csat_percent),
                            color: CSAT,
                          },
                          {
                            label: "Điểm trung bình",
                            value: score(item?.average_score),
                          },
                          {
                            label: "Gửi thành công",
                            value: String(item?.success ?? 0),
                          },
                        ]}
                      />
                    );
                  }}
                />

                <Legend
                  iconType="square"
                  iconSize={9}
                  wrapperStyle={{ fontSize: 11, color: INK, paddingTop: 8 }}
                />

                <Bar
                  dataKey="response_rate"
                  name="Tỷ lệ phản hồi"
                  fill={RESPONSE_RATE}
                  stroke={SURFACE}
                  strokeWidth={1}
                  barSize={14}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                >
                  {series.map((item) => (
                    <Cell
                      key={item.code}
                      fillOpacity={item.is_current ? 1 : CONTEXT_OPACITY}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="csat_percent"
                  name="CSAT"
                  fill={CSAT}
                  stroke={SURFACE}
                  strokeWidth={1}
                  barSize={14}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                >
                  {series.map((item) => (
                    <Cell
                      key={item.code}
                      fillOpacity={item.is_current ? 1 : CONTEXT_OPACITY}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
