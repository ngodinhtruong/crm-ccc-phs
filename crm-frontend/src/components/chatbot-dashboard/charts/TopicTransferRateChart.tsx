"use client";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import type { TopicTransferRateItem } from "@/types/chatbot-dashboard.type";

const integerFormatter = new Intl.NumberFormat("vi-VN");
const decimalFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

export function TopicTransferRateChart({
  data,
}: {
  data?: TopicTransferRateItem[] | null;
}) {
  const items = Array.isArray(data) ? data : [];

  if (items.length === 0) {
    return <EmptyState message="Không có dữ liệu chủ đề & tỷ lệ chuyển CCC." />;
  }

  const maxTotal = Math.max(...items.map((i) => i.total), 1);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Top chủ đề khách hàng hỏi & Tỷ lệ chuyển CCC
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Xếp hạng theo số lượt hội thoại và tỷ lệ % phải chuyển cho nhân viên CSKH.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const widthPercent = Math.round((item.total / maxTotal) * 100);
          return (
            <div key={item.category || idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 truncate max-w-[70%]">
                  {idx + 1}. {item.category}
                </span>
                <span className="font-bold text-slate-900">
                  {integerFormatter.format(item.total)} lượt ·{" "}
                  <span className={item.transfer_rate > 50 ? "text-rose-600" : "text-amber-600"}>
                    {decimalFormatter.format(item.transfer_rate)}% CCC
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.transfer_rate > 50 ? "bg-rose-500" : "bg-sky-500"
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
