"use client";

import { ChartItem } from "@/services/dashboard.service";

type BarChartCardProps = {
  title: string;
  items: ChartItem[];
  footer?: string;
};

export function BarChartCard({ title, items, footer }: BarChartCardProps) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <div className="flex h-9 items-center justify-between border-b px-3">
        <h3 className="truncate text-[13px] font-semibold text-slate-800">
          {title}
        </h3>
        <button className="text-slate-400">☰</button>
      </div>

      <div className="h-[160px] px-4 py-3">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="flex h-full items-end gap-4 overflow-hidden">
            {items.map((item) => {
              const height = Math.max((item.count / max) * 110, 6);

              return (
                <div
                  key={item.label}
                  className="flex min-w-[44px] flex-1 flex-col items-center justify-end"
                >
                  <div className="mb-1 text-[10px] font-semibold text-slate-700">
                    {item.count}
                  </div>

                  <div
                    className="w-7 rounded-t bg-[#0891c9]"
                    style={{ height }}
                  />

                  <div className="mt-2 max-w-[58px] truncate text-center text-[10px] text-slate-600">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {footer && (
        <div className="border-t px-3 py-2 text-center text-xs text-slate-600">
          {footer}
        </div>
      )}
    </div>
  );
}

type PieChartCardProps = {
  title: string;
  items: ChartItem[];
};

export function PieChartCard({ title, items }: PieChartCardProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  const first = items[0]?.count || 0;
  const second = items[1]?.count || 0;

  const firstPercent = total ? Math.round((first / total) * 100) : 0;
  const secondPercent = total ? 100 - firstPercent : 0;

  const gradient = `conic-gradient(#0891c9 0% ${firstPercent}%, #5b7ee5 ${firstPercent}% 100%)`;

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <div className="flex h-9 items-center justify-between border-b px-3">
        <h3 className="truncate text-[13px] font-semibold text-slate-800">
          {title}
        </h3>
        <button className="text-slate-400">☰</button>
      </div>

      <div className="flex h-[200px] items-center justify-center gap-8 p-4">
        {total === 0 ? (
          <div className="text-sm text-slate-400">Chưa có dữ liệu</div>
        ) : (
          <>
            <div
              className="h-28 w-28 rounded-full"
              style={{ background: gradient }}
            />

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#0891c9]" />
                <span>
                  {items[0]?.label}: {firstPercent}% - {first}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#5b7ee5]" />
                <span>
                  {items[1]?.label}: {secondPercent}% - {second}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}