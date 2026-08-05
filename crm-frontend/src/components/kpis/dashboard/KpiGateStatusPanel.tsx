import { ShieldCheck } from "lucide-react";

import { KpiGateStatusItem } from "@/types/kpi-dashboard.type";
import {
  formatDateTime,
  formatNumber,
  getGateBadgeClass,
  getGateStatusLabel,
} from "./KpiDashboardUtils";

export function KpiGateStatusPanel({
  items,
  hideCardWrapper = false,
}: {
  items: KpiGateStatusItem[];
  hideCardWrapper?: boolean;
}) {
  const tableContent = (
    <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="h-9 border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="w-[140px] px-4">Mã cổng</th>
              <th className="w-[280px] px-4">Tên cổng</th>
              <th className="w-[130px] px-4 text-right">Thực tế</th>
              <th className="w-[140px] px-4 text-right">Ngưỡng yêu cầu</th>
              <th className="w-[120px] px-4 text-right">Tiến độ (%)</th>
              <th className="w-[150px] px-4">Trạng thái</th>
              <th className="w-[160px] px-4">Cập nhật</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/40";

              return (
                <tr
                  key={item.gate.id}
                  className={`h-12 border-b border-slate-100 ${rowBg} hover:bg-emerald-50/50 transition-colors`}
                >
                  <td className="px-4 py-2.5">
                    <span className="inline-flex font-mono text-xs font-bold text-[#059669] bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded">
                      {item.gate.gate_code || `GATE-${item.gate.gate_config}`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800 text-sm">
                    {item.gate.gate_name || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-800 text-sm">
                    {formatNumber(item.gate.actual_value)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-500 text-sm">
                    <span className="font-mono text-xs text-slate-400 mr-1">{item.gate.operator || ""}</span>
                    {formatNumber(item.gate.threshold_value)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-xs text-slate-700 font-mono">
                    {item.progressPercent === null
                      ? "-"
                      : `${Math.round(item.progressPercent)}%`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getGateBadgeClass(
                        item.status
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {getGateStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-medium">
                    {formatDateTime(item.gate.calculated_at)}
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="h-24 text-center text-xs text-slate-400 italic">
                  Chưa có dữ liệu điều kiện cổng cho kỳ KPI này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
  );

  if (hideCardWrapper) {
    return tableContent;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex h-13 items-center justify-between border-b border-slate-200 bg-slate-50/50 px-5 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Điều kiện cổng KPI
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-bold text-[#059669]">
              {items.length} cổng
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Theo dõi điều kiện cổng đã đạt, chưa đạt hoặc đang có nguy cơ.
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#059669] border border-emerald-100">
          <ShieldCheck size={20} />
        </div>
      </div>

      {tableContent}
    </div>
  );
}

