"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { surveyApi } from "@/apis/survey.api";
import { SurveyPeriodCharts } from "@/components/surveys/SurveyPeriodCharts";
import type {
  SurveyComparisonRow,
  SurveyDashboard,
} from "@/types/survey.type";
import { getErrorMessage } from "@/utils/error.util";
import {
  formatIsoDate,
  hasCustomRange,
  type SurveyFilters,
} from "@/utils/survey-period.util";

// Cùng hai màu với biểu đồ so sánh kỳ: cùng một thực thể thì cùng một màu ở
// mọi biểu đồ. Cặp này đạt ΔE 24.7 với người mù màu đỏ-lục; cặp lục/cam cũ
// chỉ đạt 6.5 nên hai lát bánh gần như trùng nhau dưới mắt họ.
const RATED_COLOR = "#2a78d6";
const UNRATED_COLOR = "#eb6834";

const GRANULARITY_LABELS: Record<string, string> = {
  month: "tháng",
  quarter: "quý",
  year: "năm",
  custom: "kỳ",
};

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-baseline gap-2 border-b border-slate-100 px-4 py-3">
        <span className="h-3.5 w-1 rounded-full bg-[#00713d]" />
        <h3 className="text-xs font-black tracking-wide text-[#00713d]">
          {title}
        </h3>
        {subtitle && (
          <span className="text-[11px] text-slate-400">{subtitle}</span>
        )}
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

/** Dải 5 sao, tô theo tỷ lệ điểm — 4.75 tô gần hết ngôi thứ năm. */
function Stars({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(100, (value / 5) * 100));

  const row = (className: string) => (
    <div className={`flex gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <Star key={index} size={20} className="shrink-0" fill="currentColor" />
      ))}
    </div>
  );

  return (
    <div className="relative inline-flex w-max">
      {row("text-slate-200")}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${filled}%` }}
      >
        {row("text-amber-400")}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  dot,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  dot?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-100 py-1.5 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-600">
        {dot && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
          />
        )}
        {label}
      </span>
      <span
        className={`shrink-0 tabular-nums ${
          strong
            ? "text-sm font-black text-slate-900"
            : "text-xs font-bold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatTarget(row: SurveyComparisonRow) {
  if (row.unit === "percent") return `≥ ${row.target}%`;
  if (row.unit === "score") return `≥ ${row.target} ★`;

  return `≥ ${row.target}`;
}

function formatValue(row: SurveyComparisonRow, value: number) {
  if (row.unit === "score") return `${value}★`;
  if (row.unit === "percent") return `${value}%`;

  return String(value);
}

function ChangeCell({ value }: { value: number | null }) {
  // Kỳ trước bằng 0 thì không có phần trăm nào đúng — hiện gạch ngang thay vì
  // một con số bịa.
  if (value === null) return <span className="text-slate-300">—</span>;

  if (value === 0) return <span className="font-bold text-slate-500">0</span>;

  const up = value > 0;

  return (
    <span className={`font-bold ${up ? "text-emerald-600" : "text-rose-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

/**
 * Dashboard CSAT, nằm dưới danh sách khảo sát trong cùng một trang.
 *
 * Nhận bộ lọc thời gian chung của trang: hai khối trên cùng một màn hình mà
 * cắt theo hai mốc khác nhau thì người xem không đối chiếu được dòng nào ra
 * con số nào.
 */
export function SurveyDashboardSection({
  filters,
  onlyTrendChart = false,
}: {
  filters: SurveyFilters;
  onlyTrendChart?: boolean;
}) {
  const [data, setData] = useState<SurveyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Khoảng tự chọn thì gửi thẳng hai đầu ngày; kỳ preset thì gửi mốc + mã kỳ
  // để backend lấy đúng "tháng liền trước" theo lịch.
  const paramsKey = JSON.stringify(
    hasCustomRange(filters)
      ? {
          granularity: filters.granularity,
          period: "",
          start_date: filters.startDate,
          end_date: filters.endDate,
        }
      : { granularity: filters.granularity, period: filters.period }
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await surveyApi.dashboard(JSON.parse(paramsKey));

        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Không tải được số liệu khảo sát"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        Đang tải biểu đồ xu hướng khảo sát...
      </div>
    );
  }

  if (onlyTrendChart) {
    return (
      <SurveyPeriodCharts
        series={data.series}
        granularityLabel={GRANULARITY_LABELS[data.granularity] || "kỳ"}
        onlyTrendChart={true}
      />
    );
  }

  const metrics = data.metrics;

  const donut = [
    { name: "Khách đã đánh giá", value: metrics.rated, color: RATED_COLOR },
    {
      name: "Khách không đánh giá",
      value: metrics.unrated,
      color: UNRATED_COLOR,
    },
  ];

  const hasDonut = donut.some((slice) => slice.value > 0);

  return (
    <div className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-black text-[#00713d]">
          DASHBOARD KẾT QUẢ KHẢO SÁT CSAT
        </h2>
        <p className="text-xs text-slate-500">
          {data.granularity === "custom"
            ? data.period.label
            : `${data.period.label} · ${formatIsoDate(data.period.start)} – ${formatIsoDate(data.period.end)}`}
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <Panel
          title="TỔNG SỐ LƯỢNG KH RATING"
          className="xl:col-span-7"
          subtitle={`${metrics.total} lượt gửi`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-[168px] w-[168px] shrink-0 self-center">
              {hasDonut ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donut}
                        dataKey="value"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={1}
                        startAngle={90}
                        endAngle={-270}
                        isAnimationActive={false}
                      >
                        {donut.map((slice) => (
                          <Cell key={slice.name} fill={slice.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Tổng nằm giữa vòng để khỏi phải cộng nhẩm hai lát. */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800">
                      {metrics.success}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      gửi thành công
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center rounded-full border-[26px] border-slate-100 text-[11px] text-slate-400">
                  chưa có
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <StatRow label="Tổng lượt gửi khảo sát" value={metrics.total} />
              <StatRow label="Gửi không thành công" value={metrics.failed} />
              <StatRow label="Gửi thành công" value={metrics.success} />
              <StatRow
                label="Khách đã đánh giá"
                value={metrics.rated}
                dot={RATED_COLOR}
              />
              <StatRow
                label="Khách không đánh giá"
                value={metrics.unrated}
                dot={UNRATED_COLOR}
              />
              <StatRow
                label="Tỷ lệ phản hồi"
                value={`${metrics.response_rate}%`}
                strong
              />
            </div>
          </div>
        </Panel>

        <Panel title="CSAT SCORE" className="xl:col-span-5">
          <div className="flex h-full flex-col justify-center gap-3">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black leading-none text-[#00713d]">
                {metrics.csat_percent}
                <span className="text-2xl">%</span>
              </span>
              <span className="pb-1 text-xs text-slate-500">
                khách hàng hài lòng
                <br />
                (chấm từ 4★ trở lên)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[11px] text-slate-500">Điểm trung bình</p>
                <p className="text-2xl font-black text-slate-800">
                  {metrics.average_score}
                  <span className="text-sm text-slate-400">/5</span>
                </p>
              </div>

              <Stars value={metrics.average_score} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="KẾT QUẢ KHẢO SÁT THEO DANH MỤC">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="bg-[#1f5fa8] text-white">
                <th className="rounded-l px-3 py-2 text-left font-bold">
                  DANH MỤC HỖ TRỢ
                </th>
                <th className="px-3 py-2 text-right font-bold">SL GỬI ĐI</th>
                <th className="px-3 py-2 text-right font-bold">SL ĐÁNH GIÁ</th>
                <th className="px-3 py-2 text-right font-bold">
                  TỶ LỆ PHẢN HỒI
                </th>
                <th className="px-3 py-2 text-right font-bold">ĐIỂM TB (★)</th>
                <th className="rounded-r px-3 py-2 text-right font-bold">
                  CSAT (%)
                </th>
              </tr>
            </thead>

            <tbody>
              {data.categories.length === 0 && (
                <tr>
                  <td colSpan={6} className="h-16 text-center text-slate-400">
                    Chưa có khảo sát nào trong kỳ này.
                  </td>
                </tr>
              )}

              {data.categories.map((row) => (
                <tr
                  key={row.category}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {row.category}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {row.sent}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {row.rated}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {row.response_rate}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {row.average_score}
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-800">
                    {row.csat_percent}%
                  </td>
                </tr>
              ))}

              {data.categories.length > 0 && (
                <tr className="bg-[#e8f1fb] font-black text-slate-800">
                  <td className="px-3 py-2.5">Tổng cộng</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {metrics.success}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {metrics.rated}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {metrics.response_rate}%
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {metrics.average_score}★
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {metrics.csat_percent}%
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="KEY COMPARISON"
        subtitle={`so với ${data.previous_period.label}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="border-b-2 border-slate-200 text-orange-600">
                <th className="px-3 py-2 text-left font-bold">CHỈ TIÊU</th>
                <th className="px-3 py-2 text-right font-bold">
                  {data.period.label.toUpperCase()}
                </th>
                <th className="px-3 py-2 text-right font-bold">
                  {data.previous_period.label.toUpperCase()}
                </th>
                <th className="px-3 py-2 text-right font-bold">+/- (%)</th>
                <th className="px-3 py-2 text-right font-bold">MỤC TIÊU</th>
              </tr>
            </thead>

            <tbody>
              {data.comparison.map((row) => {
                const met = row.current >= row.target;

                return (
                  <tr
                    key={row.key}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2.5 font-bold text-slate-700">
                      {row.label}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right text-sm font-black tabular-nums ${
                        met ? "text-emerald-600" : "text-rose-500"
                      }`}
                      title={met ? "Đạt mục tiêu" : "Chưa đạt mục tiêu"}
                    >
                      {formatValue(row, row.current)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-500">
                      {formatValue(row, row.previous)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <ChangeCell value={row.change_percent} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-orange-600">
                      {formatTarget(row)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          Cột kỳ này xanh khi đạt mục tiêu, đỏ khi chưa đạt.
        </p>
      </Panel>

      {/* Biểu đồ so sánh kỳ đặt cuối: hai bảng phía trên trả lời "kỳ này ra
          sao", còn phần này mới là "so với các kỳ khác thì thế nào". */}
      <SurveyPeriodCharts
        series={data.series}
        granularityLabel={GRANULARITY_LABELS[data.granularity] || "kỳ"}
        onlyTrendChart={onlyTrendChart}
      />
    </div>
  );
}
