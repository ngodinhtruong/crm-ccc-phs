import { CheckCircle2, Info } from "lucide-react";

import { SaAdminCriteriaDefinition } from "@/types/sale-admin-dashboard.type";

const defaultGroups = [
  { code: "A", name: "Rất tiềm năng", description: "Hoạt động thường xuyên, GD đều" },
  { code: "B", name: "Tiềm năng", description: "Có GD nhưng chưa ổn định" },
  { code: "C", name: "Nuôi dưỡng", description: "Ít GD, cần chăm sóc thêm" },
  { code: "D", name: "Không tiềm năng", description: "Không phát sinh GD" },
  { code: "E–H", name: "Ảo / Không liên lạc", description: "SĐT lỗi, TK ảo, không nghe máy" },
];

export function PotentialCriteriaPanel({ criteria }: { criteria?: SaAdminCriteriaDefinition | null }) {
  const groups = criteria?.groups?.length ? criteria.groups : defaultGroups;

  return (
    <section className="self-start rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Info size={15} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Tiêu chí TK kích hoạt tiềm năng
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Cách tính cột <span className="font-semibold text-emerald-600">KH TN</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 size={14} /> Công thức tính
          </p>
          <p className="text-xs leading-5 text-emerald-700">
            {criteria?.formula || "KH có reactivation = true trong tháng và có phát sinh giao dịch trong transaction_logs."}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-slate-700">Phân loại nhóm KH</p>
          <div className="space-y-2">
            {groups.map((group, index) => (
              <div key={group.code} className="flex items-start gap-2 rounded-md bg-slate-50 px-2.5 py-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: ["#10b981", "#0097cf", "#f59e0b", "#ef4444", "#64748b"][index] || "#64748b" }}>
                  {group.code}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{group.name}</p>
                  <p className="text-[11px] leading-4 text-slate-500">{group.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
          <p className="mb-1 text-xs font-bold text-[#007ead]">Lưu ý</p>
          <p className="text-xs leading-5 text-sky-700">
            {criteria?.note || "Chuẩn giống tab Chất lượng của KPI Admin — KH có lệnh khớp bất kỳ lúc nào, không chỉ trong tháng."}
          </p>
        </div>
      </div>
    </section>
  );
}
