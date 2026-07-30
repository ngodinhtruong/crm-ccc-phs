import { ShieldCheck } from "lucide-react";

import { KpiGateStatusItem } from "@/types/kpi-dashboard.type";
import {
  formatDateTime,
  formatNumber,
  getGateBadgeClass,
  getGateStatusLabel,
} from "./KpiDashboardUtils";

export function KpiGateStatusPanel({ items }: { items: KpiGateStatusItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Điều kiện cổng KPI
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Theo dõi cổng đã đạt, chưa đạt hoặc đang có nguy cơ.
          </p>
        </div>

        <ShieldCheck size={18} className="text-emerald-600" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-[130px] px-4 font-semibold">Mã cổng</th>
              <th className="w-[260px] px-4 font-semibold">Tên cổng</th>
              <th className="w-[130px] px-4 font-semibold">Thực tế</th>
              <th className="w-[130px] px-4 font-semibold">Ngưỡng</th>
              <th className="w-[120px] px-4 font-semibold">Tiến độ</th>
              <th className="w-[160px] px-4 font-semibold">Trạng thái</th>
              <th className="w-[170px] px-4 font-semibold">Cập nhật</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";

              return (
                <tr
                  key={item.gate.id}
                  className={`h-[46px] border-b border-slate-200 ${rowBg} hover:bg-emerald-50`}
                >
                  <td className="px-4 font-semibold text-[#059669]">
                    {item.gate.gate_code || `GATE-${item.gate.gate_config}`}
                  </td>
                  <td className="px-4 font-semibold text-slate-700">
                    {item.gate.gate_name || "-"}
                  </td>
                  <td className="px-4 text-slate-700">{formatNumber(item.gate.actual_value)}</td>
                  <td className="px-4 text-slate-700">
                    {item.gate.operator || ""} {formatNumber(item.gate.threshold_value)}
                  </td>
                  <td className="px-4 text-slate-700">
                    {item.progressPercent === null
                      ? "-"
                      : `${Math.round(item.progressPercent)}%`}
                  </td>
                  <td className="px-4 text-slate-700">
                    <span
                      className={`inline-flex rounded-md px-3 py-1 text-xs font-semibold ${getGateBadgeClass(
                        item.status
                      )}`}
                    >
                      {getGateStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 text-slate-500">
                    {formatDateTime(item.gate.calculated_at)}
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="h-24 text-center text-slate-500">
                  Chưa có dữ liệu điều kiện cổng cho kỳ KPI này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
