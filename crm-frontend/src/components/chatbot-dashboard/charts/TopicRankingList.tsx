import { ChartItem } from "@/types/chatbot-dashboard.type";
import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";

export function TopicRankingList({
  data,
  onItemClick,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {data.length === 0 && <EmptyState message="Không có dữ liệu chủ đề." />}

      {data.slice(0, 8).map((item, index) => (
        <button
          key={item.name}
          type="button"
          onClick={() => onItemClick?.(item)}
          className="w-full rounded-xl border border-transparent p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
        >
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {index + 1}
            </div>

            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700">
                {item.name}
              </div>
            </div>

            <div className="text-lg font-bold text-slate-800">{item.value}</div>
          </div>

          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
              style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}