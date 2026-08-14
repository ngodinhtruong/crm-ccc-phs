"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Clock,
  Phone,
  Star,
  Ticket as TicketIcon,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { customerApi } from "@/apis/customer.api";
import { AccessDenied } from "@/components/common";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { formatMoney, formatNumber } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import type {
  Customer360,
  Customer360TimelineItem,
  Customer360TimelineType,
} from "@/types/customer-360.type";
import { getErrorMessage } from "@/utils/error.util";

/**
 * Bảng màu đã chạy qua bộ kiểm của skill dataviz trên nền trắng.
 *
 * Cặp mua/bán: ΔE 24.7 (protan). Cặp kết nối/gọi nhỡ: ΔE 11.0 (deutan).
 * Cố ý KHÔNG dùng cặp lục-đỏ cho cuộc gọi dù nó hợp nghĩa "được/hỏng": cặp đó
 * chỉ đạt ΔE 5.9, người mù màu đỏ-lục nhìn hai cột như một. Xanh mòng két thay
 * cho xanh lá giữ được nghĩa mà vẫn tách bạc.
 * Đổi màu thì phải chạy lại bộ kiểm, đừng chọn bằng mắt.
 */
const BUY = "#2a78d6";
const SELL = "#eb6834";
const ORDERS = "#4a3aa7";
const CALL_CONNECTED = "#0d9488";
const CALL_MISSED = "#d03b3b";
const RATING = "#4a3aa7";

const SURFACE = "#ffffff";
const GRID = "#e2e8f0";
const INK = "#475569";

const AXIS = {
  tick: { fontSize: 11, fill: INK },
  axisLine: false,
  tickLine: false,
} as const;

/** Quá mốc này thì khách coi như đã nguội, tô đỏ để lọt vào mắt. */
const INACTIVE_WARNING_DAYS = 90;

const TIMELINE_STYLES: Record<
  Customer360TimelineType,
  { label: string; dot: string; chip: string }
> = {
  transaction: {
    label: "Giao dịch",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700",
  },
  call: {
    label: "Cuộc gọi",
    dot: "bg-teal-600",
    chip: "bg-teal-50 text-teal-700",
  },
  ticket: {
    label: "Ticket",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700",
  },
  survey: {
    label: "Khảo sát",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700",
  },
};

/** Rút gọn tiền theo cách người Việt đọc số, không dùng K/M/B. */
function compactVnd(value: number | null | undefined) {
  if (!value) return "0";

  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} triệu`;
  }

  return formatMoney(value);
}

/** Chưa có số liệu thì gạch ngang, không hiện 0 — hai chuyện khác nhau. */
function orDash(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: typeof TicketIcon;
  label: string;
  value: string;
  tone?: "slate" | "sky" | "teal" | "violet" | "amber" | "red";
}) {
  const tones = {
    slate: "text-slate-500",
    sky: "text-sky-600",
    teal: "text-teal-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${tones[tone]}`}>
        <Icon size={14} />
        {label}
      </div>

      <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  className = "",
  children,
}: {
  title: string;
  hint: string;
  className?: string;
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
      </div>

      <div className="p-4">
        <div className="h-[240px]">{children}</div>
      </div>
    </section>
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

const LEGEND_STYLE = {
  fontSize: 11,
  color: INK,
  paddingTop: 8,
} as const;

const TOOLTIP_CURSOR = { fill: "rgba(148,163,184,0.12)" } as const;

function BehaviourPanel({ data }: { data: Customer360 }) {
  const { behaviour, summary } = data;

  const items = [
    {
      label: "Số ngày không giao dịch",
      value: orDash(behaviour.days_inactive, " ngày"),
      warn: behaviour.inactive_warning,
    },
    { label: "Tháng có GD (6 tháng)", value: `${behaviour.active_months_6m}/6` },
    { label: "Tháng có GD (12 tháng)", value: `${behaviour.active_months_12m}/12` },
    {
      label: "Giá trị lệnh trung bình",
      value: compactVnd(behaviour.avg_transaction_value),
    },
    { label: "Số loại sản phẩm", value: `${behaviour.product_diversity} loại` },
    { label: "Kênh hay dùng", value: behaviour.preferred_channel || "—" },
    { label: "Điểm khảo sát TB", value: orDash(summary.avg_rating, "/5") },
    { label: "CSAT", value: orDash(summary.csat_percent, "%") },
  ];

  return (
    <section className="rounded-xl border border-violet-100 bg-gradient-to-r from-indigo-50/70 to-violet-50/70 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp size={15} className="text-violet-700" />
        <h3 className="text-xs font-black tracking-wide text-violet-800">
          ĐẶC ĐIỂM HÀNH VI
        </h3>

        <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
          {behaviour.pattern_label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[11px] font-medium text-violet-900/70">
              {item.label}
            </p>
            <p
              className={`text-sm font-bold tabular-nums ${
                item.warn ? "text-red-600" : "text-slate-800"
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelineList({ items }: { items: Customer360TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-xs text-slate-400">
        Khách hàng chưa có hoạt động nào được ghi nhận.
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const style = TIMELINE_STYLES[item.type];

        return (
          <li key={`${item.type}-${item.date}-${index}`} className="flex gap-3">
            {/* Chấm mốc và đường nối dọc; mục cuối không kẻ tiếp xuống. */}
            <div className="flex flex-col items-center">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
              {index < items.length - 1 && (
                <span className="w-px flex-1 bg-slate-200" />
              )}
            </div>

            <div className="flex-1 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}
                >
                  {style.label}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {item.title}
                </span>
                <span className="text-[11px] text-slate-400">{item.date}</span>
              </div>

              {item.description && (
                <p className="mt-0.5 text-xs text-slate-600">{item.description}</p>
              )}

              <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                {item.value !== null && item.type === "transaction" && (
                  <span className="font-semibold tabular-nums text-slate-700">
                    {formatMoney(item.value)}đ
                  </span>
                )}
                {item.meta && <span>{item.meta}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Customer360Panel({ customerId }: { customerId: number }) {
  const authz = useCurrentUserPermissions();
  const canView = authz.hasPermission("CUSTOMER_360_VIEW");

  const [data, setData] = useState<Customer360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Chờ biết quyền rồi mới gọi: gọi sớm thì chắc chắn ăn 403 và màn hình
    // chớp một thông báo lỗi trước khi hiện đúng khối "không có quyền".
    if (authz.loading || !canView) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await customerApi.getCustomer360(customerId);

        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Không tải được số liệu 360"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [customerId, authz.loading, canView]);

  if (authz.loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (!canView) {
    return (
      <AccessDenied
        title="Không có quyền xem Customer 360"
        description="Bạn cần quyền CUSTOMER_360_VIEW để xem số liệu tổng hợp của khách hàng. Vui lòng liên hệ Quản trị viên nếu cần thiết."
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Đang tải số liệu 360...
      </div>
    );
  }

  const { customer, summary, series } = data;

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold text-slate-800">
            {customer.full_name}
          </h2>

          {customer.customer_code && (
            <span className="font-mono text-xs font-semibold text-sky-600">
              {customer.customer_code}
            </span>
          )}

          {customer.branch_name && (
            <span className="text-xs text-slate-500">{customer.branch_name}</span>
          )}

          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {customer.vip_type}
          </span>
        </div>

        {customer.account_numbers.length > 0 && (
          <p className="mt-1 text-[11px] text-slate-500">
            Số TK lưu ký:{" "}
            <span className="font-mono font-semibold text-slate-700">
              {customer.account_numbers.join(", ")}
            </span>
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={TicketIcon} label="Tickets" tone="sky" value={formatNumber(summary.tickets)} />
        <StatTile icon={Phone} label="Cuộc gọi" tone="teal" value={formatNumber(summary.calls)} />
        <StatTile icon={TrendingUp} label="Giao dịch" tone="violet" value={formatNumber(summary.transactions)} />
        <StatTile icon={DollarSign} label="GTGD YTD" tone="amber" value={compactVnd(summary.total_value_ytd)} />
        <StatTile
          icon={Clock}
          label="Không GD"
          tone={
            data.behaviour.days_inactive !== null &&
            data.behaviour.days_inactive > INACTIVE_WARNING_DAYS
              ? "red"
              : "teal"
          }
          value={orDash(data.behaviour.days_inactive, " ngày")}
        />
        <StatTile icon={Star} label="Điểm TB" tone="amber" value={orDash(summary.avg_rating, "/5")} />
      </div>

      <BehaviourPanel data={data} />

      <div className="grid gap-3 xl:grid-cols-2">
        <ChartCard
          title="GIÁ TRỊ GIAO DỊCH THEO THÁNG"
          hint="12 tháng gần nhất, tách mua/bán"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series.transactions}
              margin={{ top: 8, right: 16, bottom: 4, left: -8 }}
              maxBarSize={24}
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="short_label" {...AXIS} interval={0} />
              <YAxis {...AXIS} tickFormatter={(value) => compactVnd(Number(value))} />

              <Tooltip
                cursor={TOOLTIP_CURSOR}
                content={({ active, label, payload }) => {
                  const item = payload?.[0]?.payload as
                    | (typeof series.transactions)[number]
                    | undefined;

                  return (
                    <SeriesTooltip
                      active={active}
                      label={item?.label ?? (label as string)}
                      rows={[
                        { label: "Mua", value: `${compactVnd(item?.buy_value)}đ`, color: BUY },
                        { label: "Bán", value: `${compactVnd(item?.sell_value)}đ`, color: SELL },
                        { label: "Tổng", value: `${compactVnd(item?.total_value)}đ` },
                        { label: "Số lệnh", value: formatNumber(item?.orders) },
                      ]}
                    />
                  );
                }}
              />

              <Legend iconType="square" iconSize={9} wrapperStyle={LEGEND_STYLE} />

              <Bar
                dataKey="buy_value"
                name="Mua"
                stackId="value"
                fill={BUY}
                stroke={SURFACE}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Bar
                dataKey="sell_value"
                name="Bán"
                stackId="value"
                fill={SELL}
                stroke={SURFACE}
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="SỐ LỆNH KHỚP THEO THÁNG"
          hint="tháng không có lệnh thì không có cột"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series.transactions}
              margin={{ top: 8, right: 16, bottom: 4, left: -12 }}
              maxBarSize={24}
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="short_label" {...AXIS} interval={0} />
              <YAxis {...AXIS} allowDecimals={false} />

              <Tooltip
                cursor={TOOLTIP_CURSOR}
                content={({ active, label, payload }) => {
                  const item = payload?.[0]?.payload as
                    | (typeof series.transactions)[number]
                    | undefined;

                  return (
                    <SeriesTooltip
                      active={active}
                      label={item?.label ?? (label as string)}
                      rows={[
                        { label: "Số lệnh khớp", value: formatNumber(item?.orders), color: ORDERS },
                        { label: "Giá trị", value: `${compactVnd(item?.total_value)}đ` },
                      ]}
                    />
                  );
                }}
              />

              <Bar
                dataKey="orders"
                name="Số lệnh khớp"
                fill={ORDERS}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="LỊCH SỬ CUỘC GỌI THEO THÁNG"
          hint="gọi nhỡ là cuộc có thời lượng 0 giây"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series.calls}
              margin={{ top: 8, right: 16, bottom: 4, left: -12 }}
              maxBarSize={24}
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="short_label" {...AXIS} interval={0} />
              <YAxis {...AXIS} allowDecimals={false} />

              <Tooltip
                cursor={TOOLTIP_CURSOR}
                content={({ active, label, payload }) => {
                  const item = payload?.[0]?.payload as
                    | (typeof series.calls)[number]
                    | undefined;

                  return (
                    <SeriesTooltip
                      active={active}
                      label={item?.label ?? (label as string)}
                      rows={[
                        { label: "Kết nối được", value: formatNumber(item?.connected), color: CALL_CONNECTED },
                        { label: "Gọi nhỡ", value: formatNumber(item?.missed), color: CALL_MISSED },
                        { label: "Tổng cuộc gọi", value: formatNumber(item?.total) },
                        { label: "Tổng thời lượng", value: `${item?.duration_minutes ?? 0} phút` },
                      ]}
                    />
                  );
                }}
              />

              <Legend iconType="square" iconSize={9} wrapperStyle={LEGEND_STYLE} />

              <Bar
                dataKey="connected"
                name="Kết nối được"
                stackId="calls"
                fill={CALL_CONNECTED}
                stroke={SURFACE}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Bar
                dataKey="missed"
                name="Gọi nhỡ"
                stackId="calls"
                fill={CALL_MISSED}
                stroke={SURFACE}
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="ĐIỂM KHẢO SÁT THEO THÁNG"
          hint="thang 0–5; tháng không ai đánh giá thì không có cột"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series.surveys}
              margin={{ top: 8, right: 16, bottom: 4, left: -12 }}
              maxBarSize={24}
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="short_label" {...AXIS} interval={0} />
              <YAxis {...AXIS} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />

              <Tooltip
                cursor={TOOLTIP_CURSOR}
                content={({ active, label, payload }) => {
                  const item = payload?.[0]?.payload as
                    | (typeof series.surveys)[number]
                    | undefined;

                  return (
                    <SeriesTooltip
                      active={active}
                      label={item?.label ?? (label as string)}
                      rows={[
                        { label: "Điểm trung bình", value: orDash(item?.avg_score, "/5"), color: RATING },
                        { label: "Số lượt đánh giá", value: formatNumber(item?.rated) },
                        { label: "CSAT", value: orDash(item?.csat_percent, "%") },
                      ]}
                    />
                  );
                }}
              />

              <Bar
                dataKey="avg_score"
                name="Điểm trung bình"
                fill={RATING}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {/* Từ 4 điểm trở lên là khách hài lòng — cùng ngưỡng với CSAT
                    ở dashboard khảo sát; tô nhạt phần dưới ngưỡng để đọc nhanh. */}
                {series.surveys.map((item) => (
                  <Cell
                    key={item.code}
                    fillOpacity={
                      item.avg_score !== null && item.avg_score >= 4 ? 1 : 0.55
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="h-3.5 w-1 rounded-full bg-[#00713d]" />
          <h3 className="text-xs font-black tracking-wide text-[#00713d]">
            DÒNG THỜI GIAN
          </h3>
          <span className="text-[11px] text-slate-400">
            gộp giao dịch, cuộc gọi, ticket và khảo sát — mới nhất trước
          </span>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-4">
          <TimelineList items={data.timeline} />
        </div>
      </section>
    </div>
  );
}
