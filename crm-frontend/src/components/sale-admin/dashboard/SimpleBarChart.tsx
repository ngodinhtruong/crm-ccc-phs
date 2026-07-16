import { getMaxValue } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";

type ChartRow = {
  key: string | number;
  label: string;
  value: string | number;
  secondValue?: string | number;
  valueLabel: string;
  secondValueLabel?: string;
  secondLabel?: string;
};

function asNumber(value: string | number | null | undefined) {
  return Number(value || 0);
}

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
  const data = rows.slice(0, 12);
  const hasComparison = data.some((row) => row.secondValue !== undefined);
  const maxValue = getMaxValue(data.flatMap((row) => [row.value, row.secondValue]));

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>

      {data.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="p-4">
          <div className="flex h-[240px] items-end gap-4 overflow-x-auto border-b border-slate-100 pb-3">
            {data.map((row, index) => {
              const currentHeight = Math.max((asNumber(row.value) / maxValue) * 170, asNumber(row.value) > 0 ? 8 : 0);
              const previousHeight = Math.max((asNumber(row.secondValue) / maxValue) * 170, asNumber(row.secondValue) > 0 ? 8 : 0);

              return (
                <div
                  key={row.key}
                  className="flex min-w-[72px] flex-1 flex-col items-center justify-end"
                  title={`${row.label}: ${row.valueLabel}${row.secondValueLabel ? ` · ${row.secondValueLabel}` : ""}`}
                >
                  <div className="mb-2 flex h-8 flex-col items-center justify-end text-center">
                    <span className="max-w-[92px] truncate text-[10px] font-semibold text-slate-700">
                      {row.valueLabel}
                    </span>
                    {hasComparison && row.secondValueLabel && (
                      <span className="max-w-[92px] truncate text-[10px] text-slate-400">
                        {row.secondValueLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex h-[175px] items-end justify-center gap-1.5">
                    <div
                      className={`w-7 rounded-t-md bg-gradient-to-t ${
                        index % 4 === 0
                          ? "from-[#0097cf] to-sky-300"
                          : index % 4 === 1
                            ? "from-emerald-500 to-emerald-300"
                            : index % 4 === 2
                              ? "from-amber-500 to-amber-300"
                              : "from-violet-500 to-violet-300"
                      }`}
                      style={{ height: currentHeight }}
                    />

                    {hasComparison && (
                      <div
                        className="w-5 rounded-t-md bg-slate-300"
                        style={{ height: previousHeight }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="mt-3 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${data.length}, minmax(72px, 1fr))` }}
          >
            {data.map((row) => (
              <div key={`${row.key}-label`} className="text-center">
                <p className="mx-auto max-w-[96px] truncate text-[11px] font-medium text-slate-600" title={row.label}>
                  {row.label}
                </p>
              </div>
            ))}
          </div>

          {hasComparison && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#0097cf]" />
                <span>Tháng hiện tại</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-slate-300" />
                <span>{data.find((row) => row.secondLabel)?.secondLabel || "Tháng trước"}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
