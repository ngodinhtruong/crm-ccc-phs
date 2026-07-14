import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import {
  DEFAULT_OUTCOME_STYLE,
  OUTCOME_STYLES,
} from "@/constants/chatbot-dashboard.constant";
import { ProcessChartItem } from "@/types/chatbot-dashboard.type";

export function MetricBars({
  data,
  onItemClick,
}: {
  data: ProcessChartItem[];
  onItemClick?: (item: ProcessChartItem) => void;
}) {
  if (data.length === 0) {
    return <EmptyState message="Không có dữ liệu phân loại xử lý." />;
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const style = OUTCOME_STYLES[item.code] || DEFAULT_OUTCOME_STYLE;

        return (
          <button
            key={item.code}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="block w-full rounded-xl border border-transparent p-3 text-left transition hover:border-sky-200 hover:bg-sky-50"
          >
            <div className="mb-2 flex items-end justify-between gap-3">
              <div className="text-sm font-semibold text-slate-700">
                {item.name}
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-slate-800">
                  {item.value}
                  <span className="ml-1 text-[11px] font-normal text-slate-500">
                    lượt
                  </span>
                  <span className="mx-1 text-slate-300">/</span>
                  {item.session_count}
                  <span className="ml-1 text-[11px] font-normal text-slate-500">
                    phiên
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">{item.rate}%</div>
              </div>
            </div>

            <div className="h-3 rounded-full bg-slate-100">
              <div
                className={`h-3 rounded-full bg-gradient-to-r ${style.bar}`}
                style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
