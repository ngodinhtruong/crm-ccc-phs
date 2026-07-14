import { getBarWidth, getMaxValue } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";

type ChartRow = {
  key: string | number;
  label: string;
  value: string | number;
  secondValue?: string | number;
  valueLabel: string;
  secondValueLabel?: string;
  secondLabel?: string;
};

export function SimpleBarChart({
  title,
  description,
  rows,
  emptyText = "Chưa có dữ liệu biểu đồ.",
}: {
  title: string;
  description?: string;
  rows: ChartRow[];
  emptyText?: string;
}) {
  const maxValue = getMaxValue(
    rows.flatMap((row) => [row.value, row.secondValue])
  );

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>

      {rows.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="space-y-3 p-4">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-slate-700">{row.label}</span>
                <span className="shrink-0 text-slate-500">{row.valueLabel}</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0097cf]"
                  style={{ width: getBarWidth(row.value, maxValue) }}
                />
              </div>

              {row.secondValue !== undefined && (
                <>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-400">{row.secondLabel || "Tháng trước"}</span>
                    <span className="shrink-0 text-slate-400">{row.secondValueLabel}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-300"
                      style={{ width: getBarWidth(row.secondValue, maxValue) }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
