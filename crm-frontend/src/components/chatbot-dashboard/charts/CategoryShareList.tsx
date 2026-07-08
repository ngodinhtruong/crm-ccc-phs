import { ChartItem } from "@/types/chatbot-dashboard.type";
import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";

export function CategoryShareList({
  data,
  onItemClick,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      {data.length === 0 && <EmptyState message="Không có dữ liệu CCC." />}

      {data.map((item) => {
        const percent = total ? Math.round((item.value / total) * 100) : 0;

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="w-full rounded-xl border border-transparent bg-slate-50 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  {item.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {percent}% tổng CCC
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">
                  {item.value}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 rounded-full bg-white">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                style={{ width: `${Math.max(percent, 6)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}