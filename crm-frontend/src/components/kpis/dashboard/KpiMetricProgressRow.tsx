import { Eye } from "lucide-react";

import { KpiProgressMetric } from "@/types/kpi-dashboard.type";
import {
  formatDateTime,
  getFrequencyLabel,
  getProgressBadgeClass,
  getProgressColorClass,
  getProgressLabel,
  getUnitLabel,
} from "./KpiDashboardUtils";

export function KpiMetricProgressRow({
  item,
  onViewDetail,
}: {
  item: KpiProgressMetric;
  onViewDetail: (item: KpiProgressMetric) => void;
}) {
  const width = item.progressPercent === null ? 0 : Math.min(item.progressPercent, 100);

  return (
    <tr
      className="h-14 cursor-pointer border-b border-slate-100 bg-white hover:bg-emerald-50"
      onClick={() => onViewDetail(item)}
      onDoubleClick={() => onViewDetail(item)}
    >
      <td className="sticky left-0 z-10 bg-white px-3">
        <div className="flex items-center gap-3 text-slate-400">
          <button
            type="button"
            title="Xem chi tiết"
            onClick={(event) => {
              event.stopPropagation();
              onViewDetail(item);
            }}
            className="hover:text-[#059669]"
          >
            <Eye size={15} />
          </button>
        </div>
      </td>

      <td className="px-3">
        <div className="font-semibold text-[#059669]">{item.metric.metric_code}</div>
      </td>

      <td className="px-3">
        <div className="font-semibold text-slate-800">{item.metric.metric_name}</div>
        {/* <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
          {item.metric.work_description || item.metric.measurement_formula || "-"}
        </div> */}
      </td>

      {/* <td className="px-3">
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
          {item.sourceType === "AUTO" ? "CRM tự động" : "Admin nhập"}
        </span>
      </td> */}

      <td className="whitespace-nowrap px-3">{getFrequencyLabel(item.metric.frequency)}</td>

      <td className="whitespace-nowrap px-3">{getUnitLabel(item.metric.target_unit)}</td>

      <td className="whitespace-nowrap px-3 font-semibold text-slate-700">
        {item.displayActual}
      </td>

      <td className="whitespace-nowrap px-3 text-slate-700">{item.displayTarget}</td>

      <td className="px-3">
        <div className="flex min-w-[180px] items-center gap-2">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${getProgressColorClass(item.progressStatus)}`}
              style={{ width: `${width}%` }}
            />
          </div>
          <span className="w-12 text-right font-semibold text-slate-700">
            {item.progressPercent === null ? "-" : `${Math.round(item.progressPercent)}%`}
          </span>
        </div>
      </td>

      <td className="px-3">
        <span
          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${getProgressBadgeClass(
            item.progressStatus
          )}`}
        >
          {getProgressLabel(item.progressStatus)}
        </span>
      </td>

      <td className="whitespace-nowrap px-3 text-slate-500">
        {formatDateTime(item.result?.calculated_at || item.result?.scored_at || item.result?.updated_at)}
      </td>
    </tr>
  );
}
