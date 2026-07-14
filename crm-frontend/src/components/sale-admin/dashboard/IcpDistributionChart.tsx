import { getBarWidth, getMaxValue } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminIcpDistributionRow } from "@/types/sale-admin-dashboard.type";

function getIcpBadgeClass(type: string) {
  if (type === "POTENTIAL") return "bg-emerald-100 text-emerald-700";
  if (type === "NURTURE") return "bg-yellow-100 text-yellow-700";
  if (type === "NON_POTENTIAL") return "bg-orange-100 text-orange-700";
  if (type === "INVALID") return "bg-red-100 text-red-600";
  return "bg-slate-100 text-slate-600";
}

export function IcpDistributionChart({ rows }: { rows: SaAdminIcpDistributionRow[] }) {
  const maxValue = getMaxValue(rows.map((row) => row.count));

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Tỷ lệ Tiềm năng / Không Tiềm năng</h2>
        <p className="mt-0.5 text-xs text-slate-500">Phân bổ khách hàng theo nhóm ICP từ SA Records.</p>
      </div>

      {rows.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">Chưa có dữ liệu ICP.</div>
      ) : (
        <div className="space-y-3 p-4">
          {rows.map((row) => (
            <div key={`${row.icp_type}-${row.icp_code || row.label}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold ${getIcpBadgeClass(row.icp_type)}`}>
                    {row.icp_code || row.icp_type}
                  </span>
                  <span className="truncate font-medium text-slate-700">{row.label}</span>
                </div>
                <span className="shrink-0 text-slate-500">
                  {row.count} KH · {row.percent.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0097cf]" style={{ width: getBarWidth(row.count, maxValue) }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
