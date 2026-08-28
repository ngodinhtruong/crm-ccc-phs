"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  Users,
  Building2,
  Sparkles,
  BarChart3,
  Layers,
  Columns,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { SupportInfoStatsData } from "@/types/sale-admin-dashboard.type";

const SUPPORT_BAR_COLORS = [
  "#0284c7", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#10b981", // emerald
  "#f97316", // orange
  "#64748b", // slate
];

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-bold text-slate-800">
        <span className="flex items-center gap-1">
          <Building2 size={13} className="text-[#0284c7]" /> Chi nhánh: {label}
        </span>
        <span className="text-[#0284c7]">{total} lượt hỗ trợ</span>
      </div>
      <div className="space-y-1">
        {payload
          .filter((p: any) => Number(p.value) > 0)
          .map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 truncate text-slate-600">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="font-bold text-slate-800 shrink-0">{entry.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function SupportInfoStatsPanel({
  data,
}: {
  data?: SupportInfoStatsData | null;
}) {
  const [isStacked, setIsStacked] = useState<boolean>(true);

  const branchChartData = data?.by_branch_chart || [];
  const categoryNames =
    data?.all_category_names || (data?.top_categories ? data.top_categories.map((c) => c.category_name) : []);

  if (!data || branchChartData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-[#0284c7]">
            <HelpCircle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Biểu đồ Cột Số lượng Hỗ trợ Thông tin KH theo Chi nhánh
            </h3>
            <p className="text-xs text-slate-500">Thống kê phân bổ danh mục hỗ trợ tài khoản/khách hàng theo từng Chi nhánh</p>
          </div>
        </div>
        <div className="py-8 text-center text-xs text-slate-500">
          Chưa có dữ liệu hỗ trợ thông tin khách hàng trong kỳ này.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-[#0284c7]">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              Biểu đồ Số lượng Hỗ trợ Thông tin KH theo Chi nhánh
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-[#0284c7]">
                <Sparkles size={12} /> Real-time
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Thống kê phân bổ chi tiết danh mục hỗ trợ thông tin được xử lý theo từng Chi nhánh
            </p>
          </div>
        </div>

        {/* Quick Summary Pills & Chart Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
            <HelpCircle size={15} className="text-[#0284c7]" />
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Tổng lượt hỗ trợ</p>
              <p className="text-xs font-bold text-slate-800">{data.total_support_records}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5 border border-sky-100">
            <Users size={15} className="text-[#0284c7]" />
            <div>
              <p className="text-[10px] text-sky-700 font-medium">KH được hỗ trợ</p>
              <p className="text-xs font-bold text-[#0284c7]">{data.total_unique_customers}</p>
            </div>
          </div>

          {/* Toggle Switch: Stacked vs Grouped Bar */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsStacked(true)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                isStacked ? "bg-[#0284c7] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers size={13} /> Cột xếp chồng
            </button>
            <button
              type="button"
              onClick={() => setIsStacked(false)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                !isStacked ? "bg-[#0284c7] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns size={13} /> Cột đơn
            </button>
          </div>
        </div>
      </div>

      {/* Biểu đồ Cột Recharts */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={branchChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="branch_name"
              tick={{ fontSize: 11, fill: "#475569" }}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#475569" }}
            />
            <Tooltip content={<CustomBarTooltip />} isAnimationActive={false} />
            <Legend
              wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }}
              iconSize={10}
            />
            {categoryNames.map((cName, index) => (
              <Bar
                key={cName}
                dataKey={cName}
                name={cName}
                stackId={isStacked ? "a" : undefined}
                fill={SUPPORT_BAR_COLORS[index % SUPPORT_BAR_COLORS.length]}
                radius={isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
