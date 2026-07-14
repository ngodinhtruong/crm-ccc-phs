import Link from "next/link";
import { Eye, Medal, Trophy } from "lucide-react";

import { TableState } from "@/components/common";
import { KpiRankingItem } from "@/types/kpi-ranking.type";
import {
  formatDateTime,
  formatNumber,
  getEmployeeName,
  getFailedGateText,
} from "./KpiRankingUtils";

function RankBadge({ rank }: { rank?: number | null }) {
  if (!rank) return <span className="text-slate-400">-</span>;

  if (rank <= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
        <Trophy size={13} />#{rank}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
      <Medal size={13} />#{rank}
    </span>
  );
}

function ScoreStatusBadge({ item }: { item: KpiRankingItem }) {
  if (!item.has_summary) {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
        Chưa có điểm
      </span>
    );
  }

  if (item.all_gates_passed === true) {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
        Đạt cổng
      </span>
    );
  }

  if (item.all_gates_passed === false) {
    return (
      <span className="inline-flex rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
        Không đạt cổng
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
      Đã tính điểm
    </span>
  );
}

function buildKpiHref(item: KpiRankingItem, periodId: string) {
  const params = new URLSearchParams({
    user: String(item.user),
  });

  if (periodId) params.set("period", periodId);
  const employeeName = getEmployeeName(item);
  if (employeeName) params.set("employeeName", employeeName);

  return `/sale-admin/kpi?${params.toString()}`;
}

export function KpiRankingTable({
  items,
  loading,
  error,
  selectedPeriodId,
}: {
  items: KpiRankingItem[];
  loading: boolean;
  error: string;
  selectedPeriodId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1450px] border-collapse text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-white text-slate-700">
            <th className="sticky left-0 z-20 w-[90px] bg-white px-3 font-semibold">
              Thao tác
            </th>
            <th className="w-[90px] px-3 font-semibold">Hạng</th>
            <th className="w-[240px] px-3 font-semibold">Nhân viên</th>
            <th className="w-[180px] px-3 font-semibold">Chi nhánh</th>
            <th className="w-[120px] px-3 font-semibold">Bảng A</th>
            <th className="w-[120px] px-3 font-semibold">Bảng B</th>
            <th className="w-[130px] px-3 font-semibold">Tổng điểm</th>
            <th className="w-[150px] px-3 font-semibold">Phí GD</th>
            <th className="w-[150px] px-3 font-semibold">Tái kích hoạt</th>
            <th className="w-[170px] px-3 font-semibold">Điều kiện cổng</th>
            <th className="w-[180px] px-3 font-semibold">Cổng chưa đạt</th>
            <th className="w-[180px] px-3 font-semibold">Cập nhật</th>
          </tr>
        </thead>

        <tbody>
          <TableState
            loading={loading}
            error={error}
            empty={!loading && !error && items.length === 0}
            colSpan={12}
            emptyText="Không có nhân viên Sale Admin phù hợp với bộ lọc."
          />

          {!loading &&
            !error &&
            items.map((item, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

              return (
                <tr
                  key={item.user}
                  className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <Link
                      href={buildKpiHref(item, selectedPeriodId)}
                      title="Xem KPI nhân viên"
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-sky-50 hover:text-sky-600"
                    >
                      <Eye size={15} />
                    </Link>
                  </td>

                  <td className="px-3">
                    <RankBadge rank={item.rank} />
                  </td>

                  <td className="px-3">
                    <Link
                      href={buildKpiHref(item, selectedPeriodId)}
                      className="font-semibold text-sky-600 hover:underline"
                    >
                      {getEmployeeName(item)}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {[item.employee_code, item.user_username, item.user_email]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </div>
                  </td>

                  <td className="px-3">{item.branch_name || "-"}</td>
                  <td className="px-3 font-semibold">{formatNumber(item.manual_score)}</td>
                  <td className="px-3 font-semibold">{formatNumber(item.auto_score)}</td>
                  <td className="px-3 font-semibold text-slate-800">
                    {formatNumber(item.total_score)}
                  </td>
                  <td className="px-3">{formatNumber(item.fee_value)}</td>
                  <td className="px-3">{formatNumber(item.reactivated_accounts)}</td>
                  <td className="px-3">
                    <ScoreStatusBadge item={item} />
                  </td>
                  <td className="max-w-[180px] truncate px-3" title={getFailedGateText(item.failed_gate_codes)}>
                    {getFailedGateText(item.failed_gate_codes)}
                  </td>
                  <td className="whitespace-nowrap px-3">
                    {formatDateTime(item.calculated_at)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
