"use client";

import React from "react";
import {
  Package,
  Building2,
  BarChart3,
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

export type ProductStatItem = {
  product_name: string;
  product_id: number | null;
  count: number;
  unique_customers: number;
  top_branch: string;
  top_sa: string;
  branch_breakdown?: Array<{ branch_name: string; count: number }>;
  sa_breakdown?: Array<{ sa_name: string; count: number }>;
};

export type BranchProductChartRow = {
  branch_name: string;
  total_count: number;
  products: Array<{ product_name: string; count: number }>;
  [key: string]: any;
};

export type ProductIntroductionStatsData = {
  total_introduced_records: number;
  total_unique_customers: number;
  top_products: ProductStatItem[];
  by_branch_chart?: BranchProductChartRow[];
  all_product_names?: string[];
};

const PRODUCT_BAR_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
  "#64748b", // slate
];

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-bold text-slate-800">
        <span className="flex items-center gap-1">
          <Building2 size={13} className="text-[#059669]" /> Chi nhánh: {label}
        </span>
        <span className="text-[#059669]">{total} lượt</span>
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

export function ProductIntroductionStatsPanel({
  data,
}: {
  data?: ProductIntroductionStatsData | null;
}) {
  const branchChartData = data?.by_branch_chart || [];
  const productNames =
    data?.all_product_names || (data?.top_products ? data.top_products.map((p) => p.product_name) : []);

  if (!data || branchChartData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
            <Package size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Biểu đồ Cột Số lượng Dịch vụ Sản phẩm theo Chi nhánh
            </h3>
            <p className="text-xs text-slate-500">Thống kê phân bổ dịch vụ sản phẩm giới thiệu theo từng Chi nhánh</p>
          </div>
        </div>
        <div className="py-8 text-center text-xs text-slate-500">
          Chưa có dữ liệu giới thiệu sản phẩm trong kỳ này.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#059669]">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Biểu đồ Số lượng Dịch vụ Sản phẩm theo Chi nhánh
            </h3>
            <p className="text-xs text-slate-500">
              Thống kê phân bổ chi tiết các sản phẩm dịch vụ được khách hàng sử dụng theo từng Chi nhánh
            </p>
          </div>
        </div>
      </div>

      {/* Biểu đồ Cột Recharts */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={branchChartData} margin={{ top: 10, right: 15, left: -10, bottom: 45 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="branch_name"
              height={60}
              tick={{ fontSize: 11, fill: "#475569" }}
              tickFormatter={(val) => String(val || "").replace(/^Chi nhánh\s*/i, "CN ")}
              interval={0}
              angle={-20}
              textAnchor="end"
              dy={5}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#475569" }}
            />
            <Tooltip content={<CustomBarTooltip />} isAnimationActive={false} />
            <Legend
              wrapperStyle={{ paddingTop: "15px", fontSize: "11px" }}
              iconSize={10}
            />
            {productNames.map((pName, index) => (
              <Bar
                key={pName}
                dataKey={pName}
                name={pName}
                fill={PRODUCT_BAR_COLORS[index % PRODUCT_BAR_COLORS.length]}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
