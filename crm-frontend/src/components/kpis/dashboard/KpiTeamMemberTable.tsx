import { Eye } from "lucide-react";

import { KpiDashboardController } from "@/hooks/useKpiDashboard";
import { formatDateTime, formatNumber } from "./KpiDashboardUtils";

function getMemberName(member: KpiDashboardController["teamMembers"][number]) {
  return (
    member.employee_name ||
    member.user_username ||
    member.user_email ||
    `User ${member.user}`
  );
}

function GateBadge({ passed }: { passed?: boolean | null }) {
  if (passed) {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Đạt
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      Theo dõi
    </span>
  );
}

export function KpiTeamMemberTable({
  dashboard,
}: {
  dashboard: KpiDashboardController;
}) {
  if (!dashboard.canViewBranch) return null;

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Nhân viên Sale Admin trong chi nhánh
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            SUP bấm vào từng nhân viên để xem dashboard KPI SA của nhân viên đó.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-white text-slate-700">
              <th className="sticky left-0 z-20 w-[90px] bg-white px-3 font-semibold">
                Thao tác
              </th>
              <th className="w-[220px] px-3 font-semibold">Nhân viên</th>
              <th className="w-[160px] px-3 font-semibold">Chi nhánh</th>
              <th className="w-[120px] px-3 font-semibold">Bảng A</th>
              <th className="w-[120px] px-3 font-semibold">Bảng B</th>
              <th className="w-[120px] px-3 font-semibold">Tổng điểm</th>
              <th className="w-[130px] px-3 font-semibold">Xếp hạng CN</th>
              <th className="w-[160px] px-3 font-semibold">Điều kiện cổng</th>
              <th className="w-[170px] px-3 font-semibold">Cập nhật</th>
            </tr>
          </thead>

          <tbody>
            {dashboard.teamMembers.map((member, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";
              const selected =
                dashboard.scope === "BRANCH" &&
                String(member.user) === dashboard.selectedUserId;

              return (
                <tr
                  key={member.id}
                  className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50 ${
                    selected ? "outline outline-1 outline-sky-300" : ""
                  }`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <button
                      type="button"
                      title="Xem KPI SA"
                      onClick={() => dashboard.viewTeamMemberDashboard(member.user)}
                      className="text-slate-400 hover:text-sky-600"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                  <td className="px-3 font-semibold text-sky-600">
                    {getMemberName(member)}
                  </td>
                  <td className="px-3">{member.branch_name || "-"}</td>
                  <td className="px-3">{formatNumber(member.manual_score)}</td>
                  <td className="px-3">{formatNumber(member.auto_score)}</td>
                  <td className="px-3 font-semibold text-slate-800">
                    {formatNumber(member.total_score)}
                  </td>
                  <td className="px-3">
                    {member.rank_branch ? `#${member.rank_branch}` : "-"}
                  </td>
                  <td className="px-3">
                    <GateBadge passed={member.all_gates_passed} />
                  </td>
                  <td className="px-3 text-slate-500">
                    {formatDateTime(member.calculated_at)}
                  </td>
                </tr>
              );
            })}

            {dashboard.teamMembers.length === 0 && (
              <tr>
                <td colSpan={9} className="h-24 text-center text-slate-500">
                  Chưa có dữ liệu tổng hợp KPI SA cho chi nhánh.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
