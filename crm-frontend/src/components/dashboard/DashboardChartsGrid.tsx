"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  GeneralDashboardChartItem,
  GeneralDashboardCharts,
} from "@/types/dashboard.type";

type TabKey = "customers" | "tickets" | "sales" | "transactions";

const COLORS = [
  "#10b981", // Fresh Green
  "#0097cf", // Sky Blue
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#10b981", // Emerald
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#f43f5e", // Crimson
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

// Helper to render customized tooltip
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const item = payload[0];

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 text-xs shadow-lg">
      <p className="font-bold text-slate-800">
        {item.name || item.payload?.name || item.payload?.label}
      </p>
      <p className="mt-1 text-[#059669]">
        Số lượng:{" "}
        <span className="font-extrabold">{formatNumber(Number(item.value || 0))}</span>
      </p>
    </div>
  );
}

function EmptyChart({ text = "Chưa có dữ liệu từ DB." }: { text?: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
      {text}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-xs ${className}`}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PieCard({
  title,
  data,
}: {
  title: string;
  data: GeneralDashboardChartItem[];
}) {
  if (data.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyChart />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <div className="flex h-[280px] items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function VerticalBarCard({
  title,
  data,
  limit = 12,
}: {
  title: string;
  data: GeneralDashboardChartItem[];
  limit?: number;
}) {
  const chartData = useMemo(() => data.slice(0, limit), [data, limit]);

  if (chartData.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyChart />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#64748b" }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0097cf" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function HorizontalBarCard({
  title,
  data,
  limit = 12,
}: {
  title: string;
  data: GeneralDashboardChartItem[];
  limit?: number;
}) {
  const chartData = useMemo(() => data.slice(0, limit), [data, limit]);

  if (chartData.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyChart />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 15, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fontSize: 10, fill: "#64748b" }}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function DashboardChartsGrid({
  charts,
}: {
  charts: GeneralDashboardCharts;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("customers");

  // Tab configurations
  const tabs = [
    { key: "customers", label: "Khách hàng" },
    { key: "tickets", label: "CRM Tickets" },
    { key: "sales", label: "Sale System" },
    { key: "transactions", label: "Giao dịch" },
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`relative cursor-pointer px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              activeTab === tab.key
                ? "text-[#059669]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[#10b981]" />
            )}
          </button>
        ))}
      </div>

      {/* Charts Grid content depending on activeTab */}
      <div className="grid gap-6 md:grid-cols-2">
        {activeTab === "customers" && (
          <>
            <PieCard
              title="Phân bổ VIP Tier"
              data={charts.vip_tier_distribution}
            />
            <HorizontalBarCard
              title="Phân bổ chi nhánh"
              data={charts.branch_distribution}
            />
            <PieCard
              title="Loại khách hàng"
              data={charts.customer_type_distribution}
            />
          </>
        )}

        {activeTab === "tickets" && (
          <>
            <PieCard
              title="Trạng thái ticket"
              data={charts.ticket_status_distribution}
            />
            <HorizontalBarCard
              title="Danh mục nghiệp vụ"
              data={charts.ticket_category_distribution}
              limit={14}
            />
            <VerticalBarCard
              title="Nguồn tiếp nhận"
              data={charts.ticket_source_distribution}
            />
            <PieCard
              title="Mức ưu tiên"
              data={charts.ticket_priority_distribution}
            />
            <HorizontalBarCard
              title="Phân loại ticket"
              data={charts.ticket_classification_distribution}
              limit={20}
            />
          </>
        )}

        {activeTab === "sales" && (
          <>
            <HorizontalBarCard
              title="Nhóm khách hàng ICP"
              data={charts.customer_group_distribution}
            />
            <VerticalBarCard
              title="Kết quả cuộc gọi"
              data={charts.call_result_distribution}
            />
            <PieCard
              title="Mức độ quan tâm"
              data={charts.interest_level_distribution}
            />
            <HorizontalBarCard
              title="PIC Sale Admin"
              data={charts.pic_distribution}
            />
            <PieCard
              title="Tái kích hoạt"
              data={charts.campaign_distribution}
            />
          </>
        )}

        {activeTab === "transactions" && (
          <>
            <PieCard
              title="Loại sản phẩm"
              data={charts.product_type_distribution}
            />
            <VerticalBarCard
              title="Kênh giao dịch"
              data={charts.channel_distribution}
            />
            <HorizontalBarCard
              title="Trạng thái lệnh"
              data={charts.order_status_distribution}
            />
            <PieCard
              title="Mua / Bán"
              data={charts.buy_sell_distribution}
            />
            <HorizontalBarCard
              title="Top mã giao dịch"
              data={charts.top_tickers_distribution}
              limit={10}
            />
          </>
        )}
      </div>
    </div>
  );
}
