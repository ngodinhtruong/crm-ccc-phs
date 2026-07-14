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

        <ShieldCheck size={18} className="text-sky-600" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-white text-slate-700">
              <th className="w-[130px] px-3 font-semibold">Mã cổng</th>
              <th className="w-[260px] px-3 font-semibold">Tên cổng</th>
              <th className="w-[130px] px-3 font-semibold">Thực tế</th>
              <th className="w-[130px] px-3 font-semibold">Ngưỡng</th>
              <th className="w-[120px] px-3 font-semibold">Tiến độ</th>
              <th className="w-[160px] px-3 font-semibold">Trạng thái</th>
              <th className="w-[170px] px-3 font-semibold">Cập nhật</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

              return (
                <tr
                  key={item.gate.id}
                  className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                >
                  <td className="px-3 font-semibold text-sky-600">
                    {item.gate.gate_code || `GATE-${item.gate.gate_config}`}
                  </td>
                  <td className="px-3 font-semibold text-slate-700">
                    {item.gate.gate_name || "-"}
                  </td>
                  <td className="px-3">{formatNumber(item.gate.actual_value)}</td>
                  <td className="px-3">
                    {item.gate.operator || ""} {formatNumber(item.gate.threshold_value)}
                  </td>
                  <td className="px-3">
                    {item.progressPercent === null
                      ? "-"
                      : `${Math.round(item.progressPercent)}%`}
                  </td>
                  <td className="px-3">
                    <span
                      className={`inline-flex rounded-md px-3 py-1 text-xs font-semibold ${getGateBadgeClass(
                        item.status
                      )}`}
                    >
                      {getGateStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-3 text-slate-500">
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
