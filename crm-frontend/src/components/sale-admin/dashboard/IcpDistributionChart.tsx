"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  CHART_COLORS,
  getPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminIcpDistributionRow } from "@/types/sale-admin-dashboard.type";

function EmptyState() {
  return (
    <div className="flex h-[230px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      Chưa có dữ liệu ICP.
    </div>
  );
}

export function IcpDistributionChart({
  rows,
  month,
  year,
  periodLabel,
}: {
  rows: SaAdminIcpDistributionRow[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
}) {
  const data = rows.filter((row) => row.count > 0).map((row) => ({
    ...row,
    name: row.icp_code ? `${row.icp_code} - ${row.label}` : row.label,
  }));
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-800">Tỷ lệ Tiềm năng / Không TN</h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {periodLabel || getPeriodLabel(month, year)} · Phân bổ khách hàng theo ICP
        </p>
      </div>

      <div className="p-4">
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
            <div className="relative h-[230px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="white"
                    strokeWidth={2}
                  >
                    {data.map((row, index) => (
                      <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, _name, props: any) => [
                      `${value} KH · ${Number(props.payload.percent || 0).toFixed(1)}%`,
                      props.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400">Tổng</span>
                <span className="text-xl font-bold text-slate-800">{total}</span>
              </div>
            </div>

            <div className="space-y-2 self-center">
              {data.map((row, index) => (
                <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="truncate text-xs font-semibold text-slate-700">{row.name}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-slate-800">
                    {row.count} · {row.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
