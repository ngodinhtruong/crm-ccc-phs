import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import {
  formatMetricValue,
  formatNumber,
  formatPercent,
  getGrowthClass,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminOverviewMetric } from "@/types/sale-admin-dashboard.type";

function GrowthIcon({ value }: { value?: number | null }) {
  if (value === null || value === undefined || value === 0) return <Minus size={14} />;
  if (value > 0) return <ArrowUpRight size={14} />;
  return <ArrowDownRight size={14} />;
}

export function AdminOverviewCards({ items }: { items: SaAdminOverviewMetric[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.key} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <p className="mt-2 text-xl font-bold text-slate-800">
                {formatMetricValue(item)}
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold ${getGrowthClass(
                item.growth_percent
              )}`}
            >
              <GrowthIcon value={item.growth_percent} />
              {formatPercent(item.growth_percent)}
            </span>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Tháng trước: <span className="font-semibold text-slate-700">
              {item.unit === "VND" ? formatMetricValue({ ...item, value: item.previous_value }) : formatNumber(item.previous_value)}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}
