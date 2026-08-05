import { Eye } from "lucide-react";

import { KpiProgressMetric } from "@/types/kpi-dashboard.type";
import {
  getProgressBadgeClass,
  getProgressColorClass,
  getProgressLabel,
} from "./KpiDashboardUtils";

export function KpiMetricProgressRow({
  item,
  onViewDetail,
}: {
  item: KpiProgressMetric;
  onViewDetail: (item: KpiProgressMetric) => void;
}) {
  const width = item.progressPercent === null ? 0 : Math.min(Math.max(item.progressPercent, 0), 100);

  return (
    <tr
      className="group h-12 cursor-pointer border-b border-slate-100 bg-white transition-colors hover:bg-emerald-50/40"
      onClick={() => onViewDetail(item)}
    >
      <td className="sticky left-0 z-10 w-14 bg-white px-3 py-2.5 text-center transition-colors group-hover:bg-emerald-50/40">
        <button
          type="button"
          title="Xem chi tiết KPI"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetail(item);
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#059669] shadow-2xs"
        >
          <Eye size={13} />
        </button>
      </td>

      <td className="w-28 whitespace-nowrap px-3 py-2.5">
        <span className="inline-flex font-mono text-[11px] font-bold text-[#059669] bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-md">
          {item.metric.metric_code}
        </span>
      </td>

      <td className="w-[260px] px-3 py-2.5">
        <div className="font-semibold text-slate-800 text-xs group-hover:text-[#059669] transition-colors line-clamp-2">
          {item.metric.metric_name}
        </div>
      </td>

      <td className="w-32 whitespace-nowrap px-3 py-2.5 text-right font-bold text-slate-800 text-xs font-mono">
        {item.displayActual}
      </td>

      <td className="w-32 whitespace-nowrap px-3 py-2.5 text-right font-medium text-slate-500 text-xs font-mono">
        {item.displayTarget}
      </td>

      <td className="w-[360px] px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getProgressColorClass(item.progressStatus)}`}
              style={{ width: `${width}%` }}
            />
          </div>

        </div>
      </td>
    </tr>
  );
}


