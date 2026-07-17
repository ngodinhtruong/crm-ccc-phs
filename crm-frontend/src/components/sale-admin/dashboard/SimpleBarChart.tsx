"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCompactNumber,
  toNumber,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";

type ChartRow = {
  key: string | number;
  label: string;
  value: string | number;
  secondValue?: string | number;
  valueLabel: string;
  secondValueLabel?: string;
  currentLabel?: string;
  secondLabel?: string;
};

type ChartDatum = ChartRow & {
  current: number;
  previous: number;
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      {message}
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDatum }> }) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-800">{row.label}</p>
      <p className="text-[#0097cf]">
        {row.currentLabel || "Hiện tại"}: <span className="font-semibold">{row.valueLabel}</span>
      </p>
      {row.secondValue !== undefined && (
        <p className="mt-0.5 text-slate-500">
          {row.secondLabel || "Tháng trước"}: <span className="font-semibold">{row.secondValueLabel}</span>
        </p>
      )}
    </div>
  );
}

export function SimpleBarChart({
  title,
  description,
  rows,
  emptyText = "Chưa có dữ liệu biểu đồ.",
  layout = "horizontal",
  height = 290,
}: {
  title: string;
  description?: string;
  rows: ChartRow[];
  emptyText?: string;
  layout?: "horizontal" | "vertical";
  height?: number;
}) {
  const data: ChartDatum[] = rows.slice(0, 12).map((row) => ({
    ...row,
    current: toNumber(row.value),
    previous: toNumber(row.secondValue),
  }));
  const hasComparison = data.some((row) => row.secondValue !== undefined);
  const hasData = data.some((row) => row.current > 0 || row.previous > 0);
  const currentLabel = data.find((row) => row.currentLabel)?.currentLabel || "Tháng hiện tại";
  const previousLabel = data.find((row) => row.secondLabel)?.secondLabel || "Tháng trước";
  const isVertical = layout === "vertical";

  return (
    <section className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">{title}</h2>
            {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
            Top {data.length}
          </span>
        </div>
      </div>

      <div className="p-4">
        {data.length === 0 || !hasData ? (
          <EmptyChart message={emptyText} />
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer>
              <BarChart
                data={data}
                layout={isVertical ? "vertical" : "horizontal"}
                margin={isVertical ? { top: 8, right: 18, left: 10, bottom: 8 } : { top: 12, right: 14, left: 0, bottom: 6 }}
                barCategoryGap={isVertical ? 10 : 18}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={!isVertical} vertical={isVertical} />
                {isVertical ? (
                  <>
                    <XAxis
                      type="number"
                      tickFormatter={formatCompactNumber}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={118}
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="label"
                      interval={0}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCompactNumber}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                  </>
                )}
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {hasComparison && (
                  <Bar
                    dataKey="previous"
                    name={previousLabel}
                    fill="#00CC99"
                    radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    maxBarSize={isVertical ? 16 : 32}
                  />
                )}
                <Bar
                  dataKey="current"
                  name={currentLabel}
                  fill="#0097cf"
                  radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                  maxBarSize={isVertical ? 16 : 32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
