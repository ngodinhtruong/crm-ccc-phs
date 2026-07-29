"use client";

import { useCallback, useState } from "react";
import {
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/**
 * Xem chi tiết một cột ngay trên biểu đồ: bấm vào cột để mở, bấm nút hoặc
 * nháy đúp để quay lại.
 *
 * Tách ra dùng chung vì cùng một khối state + handler đang được chép lại ở
 * nhiều thẻ biểu đồ (5 lần chỉ riêng trong dashboard CCC). Recharts đưa nhãn
 * của cột vừa bấm qua ``state.activeLabel``, nên hook chỉ cần giữ đúng nhãn
 * đó — phần vẽ do từng thẻ tự quyết định.
 */
export function usePeriodDrilldown() {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const openPeriod = useCallback(
    (state: { activeLabel?: string | number } | null) => {
      if (state?.activeLabel) {
        setSelectedPeriod(String(state.activeLabel));
      }
    },
    []
  );

  const closePeriod = useCallback(() => setSelectedPeriod(null), []);

  return { selectedPeriod, openPeriod, closePeriod };
}

/** Nút quay lại của chế độ xem chi tiết một cột. */
export function PeriodDrilldownBackButton({
  onClick,
  label = "← Quay lại",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200 shadow-2xs transition-all hover:bg-sky-100"
    >
      {label}
    </button>
  );
}

export type DrilldownSlice = { name: string; value: number };

const drilldownNumber = new Intl.NumberFormat("vi-VN");

function slicePercent(value: number, total: number) {
  return total > 0 ? ((value / total) * 100).toFixed(1) : "0";
}

/** "12 (34.5%)" — nhãn ngắn cho vành donut. */
function sliceValueCaption(value: number, total: number) {
  return `${drilldownNumber.format(value)} (${slicePercent(value, total)}%)`;
}

/** "Tên: 12 (34.5%)" — nhãn đầy đủ cho chú thích. */
function sliceCaption(name: string, value: number, total: number) {
  return `${name}: ${sliceValueCaption(value, total)}`;
}

function DrilldownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
}) {
  if (!active || !payload?.length) return null;

  const slice = payload[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      <span className="font-semibold text-slate-800">{slice.name}</span>
      <span className="ml-2 font-bold text-slate-900">
        {drilldownNumber.format(Number(slice.value) || 0)}
      </span>
    </div>
  );
}

/**
 * Biểu đồ donut chi tiết của một cột, kèm số và tỷ lệ.
 *
 * Số hiện ngay trên biểu đồ chứ không chỉ trong tooltip: người xem cần đọc
 * được ngay mà không phải rê chuột từng phần.
 *
 * Nhãn trên vành ghi đủ tên nhóm, số và tỷ lệ. Nhãn dài nhất khoảng 190px nên
 * mọi thẻ dùng donut này phải rộng ít nhất nửa màn hình (``xl:col-span-6``);
 * hẹp hơn thì hai nhãn hai bên bị cắt cụt.
 *
 * Phần quá nhỏ (dưới 3%) bỏ nhãn vành vì các nhãn sẽ chồng lên nhau; giá trị
 * của chúng vẫn đọc được ở chú thích và tooltip.
 */
export function PeriodDrilldownDonut({
  data,
  colorOf,
  onExit,
  emptyMessage = "Kỳ này chưa có số liệu.",
}: {
  data: DrilldownSlice[];
  colorOf: (name: string, index: number) => string;
  onExit: () => void;
  emptyMessage?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart
        onDoubleClick={onExit}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          isAnimationActive={false}
          label={({
            name,
            value,
            percent,
          }: {
            name?: string;
            value?: number;
            percent?: number;
          }) =>
            percent && percent >= 0.03
              ? sliceCaption(String(name), Number(value) || 0, total)
              : ""
          }
        >
          {data.map((item, index) => (
            <Cell key={item.name} fill={colorOf(item.name, index)} />
          ))}

          {/* Lỗ giữa donut đang trống — đặt tổng vào đó thay vì bắt người xem
              tự cộng các phần. */}
          <Label
            position="center"
            content={({ viewBox }: { viewBox?: unknown }) => {
              // viewBox của recharts là union cartesian/polar; ở donut luôn là
              // polar nên chỉ cần tâm.
              const { cx = 0, cy = 0 } = (viewBox ?? {}) as {
                cx?: number;
                cy?: number;
              };

              return (
                <>
                  <text
                    x={cx}
                    y={cy - 4}
                    textAnchor="middle"
                    style={{ fontSize: 18, fontWeight: 800, fill: "#0f172a" }}
                  >
                    {drilldownNumber.format(total)}
                  </text>
                  <text
                    x={cx}
                    y={cy + 13}
                    textAnchor="middle"
                    style={{ fontSize: 10, fill: "#64748b" }}
                  >
                    Tổng
                  </text>
                </>
              );
            }}
          />
        </Pie>

        <Tooltip content={<DrilldownTooltip />} />

        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string, entry: { payload?: { value?: number } }) =>
            sliceCaption(value, Number(entry?.payload?.value) || 0, total)
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
