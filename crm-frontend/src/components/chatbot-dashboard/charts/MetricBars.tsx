import { ChartItem } from "@/types/chatbot-dashboard.type";
import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";

export function MetricBars({
  data,
  onItemClick,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {data.length === 0 && (
        <EmptyState message="Không có dữ liệu phân loại xử lý." />
      )}

      {data.map((item) => (
        <button
          key={item.name}
          type="button"
          onClick={() => onItemClick?.(item)}
          className="block w-full rounded-xl border border-transparent p-3 text-left transition hover:border-sky-200 hover:bg-sky-50"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">
              {item.name}
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">
                {item.value}
              </div>
              <div className="text-[11px] text-slate-500">
                {typeof item.rate === "number" ? `${item.rate}%` : ""}
              </div>
            </div>
          </div>

          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
              style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}