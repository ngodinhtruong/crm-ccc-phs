"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import { CccDashboardCharts as CccCharts } from "@/types/ccc-dashboard.type";
import {
  branchLabel,
  categoryLabel,
  formatDate,
  formatNumber,
  formatPercent,
  rootCauseLabel,
  sourceLabel,
  statusLabel,
  SimpleChartItem,
} from "./CccDashboardUtils";

function ChartCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

function ColumnBarChart({
  items,
  emptyText,
  limit = 8,
  minItemWidth = 64,
}: {
  items: SimpleChartItem[];
  emptyText: string;
  limit?: number;
  minItemWidth?: number;
}) {
  const data = items.slice(0, limit);
  const max = Math.max(...data.map((item) => item.count), 1);

  if (data.length === 0) {
    return <EmptyState message={emptyText} />;
  }

  return (
    <div>
      <div className="flex h-[220px] items-end gap-3 overflow-x-auto border-b border-slate-100 pb-3">
        {data.map((item, index) => {
          const height = Math.max((item.count / max) * 160, 10);

          return (
            <div
              key={item.key}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ minWidth: minItemWidth }}
              title={`${item.label}: ${formatNumber(item.count)}${
                item.percentage !== undefined && item.percentage !== null
                  ? ` · ${formatPercent(item.percentage)}`
                  : ""
              }`}
            >
              <div className="mb-1 text-[11px] font-bold text-slate-800">
                {formatNumber(item.count)}
              </div>

              <div
                className={`w-9 rounded-t-md bg-gradient-to-t ${
                  index % 4 === 0
                    ? "from-[#0097cf] to-sky-300"
                    : index % 4 === 1
                      ? "from-emerald-500 to-emerald-300"
                      : index % 4 === 2
                        ? "from-amber-500 to-amber-300"
                        : "from-violet-500 to-violet-300"
                }`}
                style={{ height }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(${minItemWidth}px, 1fr))` }}>
        {data.map((item) => (
          <div key={`${item.key}-label`} className="text-center">
            <p className="mx-auto max-w-[92px] truncate text-[11px] font-medium text-slate-600" title={item.label}>
              {item.label}
            </p>
            {item.percentage !== undefined && item.percentage !== null && (
              <p className="text-[10px] text-slate-400">{formatPercent(item.percentage)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedDonut({ charts }: { charts: CccCharts }) {
  const total = charts.linked_vs_unlinked.reduce((sum, item) => sum + item.count, 0);
  const linked = charts.linked_vs_unlinked.find((item) => item.key === "LINKED");
  const linkedPercent = total ? Math.round(((linked?.count || 0) / total) * 100) : 0;

  const gradient = `conic-gradient(#10b981 0% ${linkedPercent}%, #f59e0b ${linkedPercent}% 100%)`;

  if (total === 0) {
    return <EmptyState message="Không có dữ liệu Linked/Unlinked." />;
  }

  return (
    <div className="flex flex-col items-center gap-5 md:flex-row md:justify-center">
      <div className="relative h-40 w-40 rounded-full" style={{ background: gradient }}>
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-bold text-slate-800">{linkedPercent}%</span>
          <span className="text-[11px] text-slate-500">Linked</span>
        </div>
      </div>

      <div className="w-full space-y-3 md:w-56">
        {charts.linked_vs_unlinked.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-sm ${
                  item.key === "LINKED" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="text-xs font-semibold text-slate-700">{item.label}</span>
            </div>
            <div className="text-right text-xs font-bold text-slate-800">
              {formatNumber(item.count)}
              <div className="text-[11px] font-normal text-slate-500">
                {formatPercent(item.percentage)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendByDay({ charts }: { charts: CccCharts }) {
  const items = charts.trend_by_day || [];
  const max = Math.max(...items.map((item) => item.count), 1);

  if (items.length === 0) {
    return <EmptyState message="Không có dữ liệu xu hướng theo ngày." />;
  }

  return (
    <div className="flex h-48 items-end gap-2 overflow-x-auto pb-2">
      {items.map((item) => {
        const height = Math.max((item.count / max) * 150, 8);

        return (
          <div key={String(item.day)} className="flex min-w-[38px] flex-col items-center justify-end">
            <div className="mb-1 text-[10px] font-semibold text-slate-700">
              {item.count}
            </div>
            <div
              className="w-6 rounded-t bg-gradient-to-t from-[#0097cf] to-sky-300"
              style={{ height }}
            />
            <div className="mt-2 w-12 -rotate-45 truncate text-[10px] text-slate-500">
              {formatDate(String(item.day))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CccDashboardCharts({ charts }: { charts: CccCharts }) {
  const categoryItems = charts.tickets_by_category.map((item) => ({
    key: String(item.support_category_id || categoryLabel(item)),
    label: categoryLabel(item),
    count: item.count,
    percentage: item.percentage,
  }));

  const sourceItems = charts.tickets_by_source.map((item) => ({
    key: String(item.source_id || sourceLabel(item)),
    label: sourceLabel(item),
    count: item.count,
    percentage: item.percentage,
  }));

  const statusItems = charts.tickets_by_status.map((item) => ({
    key: String(item.current_status_id || statusLabel(item)),
    label: statusLabel(item),
    count: item.count,
    percentage: item.percentage,
  }));

  const branchItems = charts.tickets_by_branch.map((item) => ({
    key: String(item.handling_branch_id || branchLabel(item)),
    label: branchLabel(item),
    count: item.count,
    percentage: item.percentage,
  }));

  const rootCauseItems = charts.root_cause_breakdown.map((item) => ({
    key: `${item.root_cause_type || "ROOT"}-${item.id || item.error_type || item.error_group || rootCauseLabel(item)}`,
    label: rootCauseLabel(item),
    count: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title="Linked vs Unlinked"
        description="Tỷ lệ ticket đã liên kết với tài khoản lưu ký so với chưa xác định được KH."
      >
        <LinkedDonut charts={charts} />
      </ChartCard>

      <ChartCard
        title="Xu hướng ticket theo ngày"
        description="Số lượng ticket phát sinh trong khoảng lọc."
      >
        <TrendByDay charts={charts} />
      </ChartCard>

      <ChartCard title="Tickets by Category" description="Biểu đồ cột phân bổ theo danh mục nghiệp vụ.">
        <ColumnBarChart items={categoryItems} emptyText="Không có dữ liệu danh mục." />
      </ChartCard>

      <ChartCard title="Tickets by Source" description="Biểu đồ cột phân bổ theo kênh tiếp nhận.">
        <ColumnBarChart items={sourceItems} emptyText="Không có dữ liệu nguồn tiếp nhận." />
      </ChartCard>

      <ChartCard title="Tickets by Status" description="Biểu đồ cột phân bổ theo trạng thái xử lý.">
        <ColumnBarChart items={statusItems} emptyText="Không có dữ liệu trạng thái." />
      </ChartCard>

      <ChartCard title="Root Cause Breakdown" description="Biểu đồ cột nguyên nhân gốc rễ theo tag, nhóm lỗi hoặc loại lỗi.">
        <ColumnBarChart items={rootCauseItems} emptyText="Chưa có dữ liệu nguyên nhân gốc rễ." />
      </ChartCard>

      <div className="xl:col-span-2">
        <ChartCard title="Tickets by Branch" description="Biểu đồ cột so sánh ticket theo chi nhánh xử lý.">
          <ColumnBarChart
            items={branchItems}
            emptyText="Không có dữ liệu chi nhánh."
            limit={12}
            minItemWidth={72}
          />
        </ChartCard>
      </div>
    </div>
  );
}
