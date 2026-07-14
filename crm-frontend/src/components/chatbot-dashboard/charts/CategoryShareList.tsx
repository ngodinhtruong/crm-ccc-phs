import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import { ChartItem } from "@/types/chatbot-dashboard.type";

// Bảng màu cho các lát của biểu đồ tròn, lặp lại nếu có nhiều chủ đề hơn
const SLICE_COLORS = [
  "#f59e0b",
  "#0ea5e9",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

const RADIUS = 60;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Biểu đồ tròn: phân bổ chủ đề của các phiên đã chuyển CCC. */
export function CategoryShareList({
  data,
  onItemClick,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <EmptyState message="Không có phiên nào chuyển CCC." />;
  }

  let offset = 0;

  const slices = data.map((item, index) => {
    const fraction = item.value / total;

    const slice = {
      item,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
      percent: Math.round(fraction * 100),
      dash: fraction * CIRCUMFERENCE,
      offset,
    };

    offset += slice.dash;

    return slice;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
          {slices.map((slice) => (
            <circle
              key={slice.item.name}
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${slice.dash} ${CIRCUMFERENCE - slice.dash}`}
              strokeDashoffset={-slice.offset}
            />
          ))}

          <circle cx="80" cy="80" r={RADIUS - STROKE / 2} fill="white" />
        </svg>
      </div>

      <div className="-mt-[7.5rem] mb-8 text-center">
        <div className="text-2xl font-bold text-slate-800">{total}</div>
        <div className="text-[11px] text-slate-500">phiên CCC</div>
      </div>

      <div className="space-y-2">
        {slices.map((slice) => (
          <button
            key={slice.item.name}
            type="button"
            onClick={() => onItemClick?.(slice.item)}
            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-sky-200 hover:bg-sky-50"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />

            <span className="flex-1 truncate text-xs font-medium text-slate-700">
              {slice.item.name}
            </span>

            <span className="text-xs font-bold text-slate-800">
              {slice.item.value}
            </span>

            <span className="w-10 text-right text-[11px] text-slate-500">
              {slice.percent}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
