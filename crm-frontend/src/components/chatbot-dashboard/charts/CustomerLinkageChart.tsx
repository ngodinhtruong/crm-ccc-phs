"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import type { CustomerLinkageData } from "@/types/chatbot-dashboard.type";

const integerFormatter = new Intl.NumberFormat("vi-VN");
const decimalFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

export function CustomerLinkageChart({
  data,
}: {
  data?: CustomerLinkageData | null;
}) {
  if (!data || data.total === 0) {
    return <EmptyState message="Chưa có dữ liệu định danh khách hàng." />;
  }

  const items = data.items || [];

  return (
    <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/30 via-white to-blue-50/30 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Tỷ lệ Định danh Khách hàng (Identification)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng số: <span className="font-semibold text-slate-800">{integerFormatter.format(data.total)} phiên</span>
          </p>
        </div>
        <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
          Đã định danh {decimalFormatter.format(data.linked_rate)}%
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
        <div className="relative h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={4}
                stroke="white"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {items.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Đã khớp</span>
            <span className="text-lg font-extrabold text-sky-600">
              {decimalFormatter.format(data.linked_rate)}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const share = data.total > 0 ? (item.value / data.total) * 100 : 0;
            return (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-slate-700">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {integerFormatter.format(item.value)} · {decimalFormatter.format(share)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
