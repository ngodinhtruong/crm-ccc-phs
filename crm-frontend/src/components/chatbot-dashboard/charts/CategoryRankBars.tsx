"use client";

import { EmptyState } from "@/components/chatbot-dashboard/EmptyState";
import { ChartItem } from "@/types/chatbot-dashboard.type";

/**
 * Bảng xếp hạng chủ đề dạng thanh ngang.
 *
 * Thay cho biểu đồ tròn vì dữ liệu chủ đề có phân bố long-tail: một nhóm
 * chiếm áp đảo, phần còn lại rất nhỏ. Trên donut, một lát 0.9% chỉ là
 * 3.2 độ — gần như vô hình và không bấm được.
 *
 * Cách xử lý:
 * - Chiều dài thanh theo thang logarit nên nhóm nhỏ vẫn nhìn thấy được,
 *   trong khi vẫn giữ đúng thứ tự lớn/nhỏ.
 * - Số phiên và % luôn hiển thị bằng chữ, không phụ thuộc vào mắt nhìn.
 * - Nhóm dưới 1% được đánh dấu để chú ý — đây thường là chủ đề mới nổi
 *   hoặc lỗi hiếm gặp, dễ bị bỏ sót nhất.
 */
export function CategoryRankBars({
  data,
  onItemClick,
  limit = 10,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
  limit?: number;
}) {
  if (data.length === 0) {
    return <EmptyState message="Không có dữ liệu chủ đề." />;
  }

  // Chặn giá trị âm/không hợp lệ: log10 của số âm là NaN, sẽ làm vỡ
  // thuộc tính width của thanh.
  const safeValue = (value: number) =>
    Number.isFinite(value) && value > 0 ? value : 0;

  const total = data.reduce((sum, item) => sum + safeValue(item.value), 0) || 1;
  const rows = [...data]
    .sort((a, b) => safeValue(b.value) - safeValue(a.value))
    .slice(0, limit);
  const hidden = data.length - rows.length;

  // Thang log: giữ đúng thứ hạng nhưng kéo nhóm nhỏ lên mức nhìn thấy được.
  const maxValue = Math.max(...rows.map((row) => safeValue(row.value)), 1);
  const maxLog = Math.log10(maxValue + 1) || 1;

  return (
    <div className="space-y-1">
      {rows.map((item, index) => {
        const value = safeValue(item.value);
        const percent = (value / total) * 100;
        const width = Math.max((Math.log10(value + 1) / maxLog) * 100, 6);
        // Chỉ đánh dấu "hiếm" khi thực sự có phiên, tránh gắn nhãn cho
        // nhóm rỗng (value = 0).
        const isSmall = value > 0 && percent < 1;

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="block w-full rounded-lg px-2 py-2 text-left transition hover:bg-sky-50"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-5 shrink-0 text-[11px] font-bold text-slate-400">
                  {index + 1}
                </span>

                <span
                  className="truncate text-xs font-semibold text-slate-700"
                  title={item.name}
                >
                  {item.name}
                </span>

                {isSmall && (
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    hiếm
                  </span>
                )}
              </div>

              <div className="shrink-0 whitespace-nowrap text-xs">
                <span className="font-bold text-slate-800">{value}</span>
                <span className="ml-1 text-[11px] text-slate-500">phiên</span>
                <span className="ml-2 text-[11px] font-semibold text-slate-500">
                  {percent < 0.1 && percent > 0
                    ? "<0.1"
                    : percent.toFixed(percent < 10 ? 1 : 0)}
                  %
                </span>
              </div>
            </div>

            <div className="ml-7 h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${
                  isSmall
                    ? "bg-amber-400"
                    : "bg-gradient-to-r from-sky-400 to-sky-500"
                }`}
                style={{ width: `${width}%` }}
              />
            </div>
          </button>
        );
      })}

      {hidden > 0 && (
        <div className="px-2 pt-2 text-[11px] text-slate-500">
          Còn {hidden} chủ đề khác không hiển thị.
        </div>
      )}
    </div>
  );
}
