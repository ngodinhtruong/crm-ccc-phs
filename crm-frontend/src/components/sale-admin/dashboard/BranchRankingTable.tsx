"use client";

import { TableState } from "@/components/common";
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
  formatPercent,
  getGrowthClass,
  getPeriodLabel,
  toNumber,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminBranchRankingRow } from "@/types/sale-admin-dashboard.type";

function moneyValue(row: SaAdminBranchRankingRow, key: keyof SaAdminBranchRankingRow, fallback?: string | number) {
  return toNumber((row[key] as string | number | undefined) ?? fallback ?? 0);
}

function totalFee(row: SaAdminBranchRankingRow) {
  return moneyValue(row, "total_transaction_fee", row.transaction_fee);
}

function RankingRow({ row, index, isTotal = false }: { row: SaAdminBranchRankingRow; index: number; isTotal?: boolean }) {
  const rowClass = isTotal
    ? "border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900"
    : `border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-emerald-50/70`;

  return (
    <tr className={`h-10 text-[11px] ${rowClass}`}>
      <td className="sticky left-0 z-10 bg-inherit px-4 font-semibold text-slate-800">
        {isTotal ? "TOTAL" : row.branch_name}
      </td>
      <td className="px-4 text-right text-slate-600">{formatNumber(row.total_calls)}</td>
      <td className="px-4 text-right font-semibold text-emerald-600">{formatNumber(row.reactivated_accounts)}</td>
      <td className="px-4 text-right font-semibold text-emerald-500">{formatNumber(row.potential_active_accounts)}</td>
      <td className="px-2 text-right text-emerald-600" title={formatMoney(moneyValue(row, "sa_transaction_value"))}>
        {formatCompactMoney(moneyValue(row, "sa_transaction_value"))}
      </td>
      <td className="px-2 text-right font-semibold text-[#059669]" title={formatMoney(moneyValue(row, "sa_transaction_fee"))}>
        {formatCompactMoney(moneyValue(row, "sa_transaction_fee"))}
      </td>
      <td className="px-2 text-right text-orange-500" title={formatMoney(moneyValue(row, "broker_transaction_value"))}>
        {formatCompactMoney(moneyValue(row, "broker_transaction_value"))}
      </td>
      <td className="px-2 text-right font-semibold text-orange-600" title={formatMoney(moneyValue(row, "broker_transaction_fee"))}>
        {formatCompactMoney(moneyValue(row, "broker_transaction_fee"))}
      </td>
      <td className="px-2 text-right text-slate-600" title={formatMoney(moneyValue(row, "total_transaction_value", row.transaction_value))}>
        {formatCompactMoney(moneyValue(row, "total_transaction_value", row.transaction_value))}
      </td>
      <td className="px-2 text-right font-bold text-amber-600" title={formatMoney(totalFee(row))}>
        {formatCompactMoney(totalFee(row))}
      </td>
      <td className="px-4 text-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${getGrowthClass(row.mom_growth_percent)}`}>
          {formatPercent(row.mom_growth_percent)}
        </span>
      </td>
    </tr>
  );
}

export function BranchRankingTable({
  rows,
  totalRow,
  month,
  year,
  periodLabel,
}: {
  rows: SaAdminBranchRankingRow[];
  totalRow?: SaAdminBranchRankingRow | null;
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
}) {
  const visibleRows = rows.slice(0, 12);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-14 flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Xếp hạng Chi nhánh · {periodLabel || getPeriodLabel(month, year)}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Phí GD · TK kích hoạt · KH tiềm năng · MoM</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-full bg-white px-2.5 py-1 font-semibold ring-1 ring-slate-200">
            {formatNumber(rows.length)} chi nhánh
          </span>
          {rows.length > visibleRows.length && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-[#059669] ring-1 ring-emerald-100">
              Hiển thị top {visibleRows.length}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] text-slate-500">
              <th className="sticky left-0 z-20 w-[210px] bg-slate-50 px-3 py-2 text-left" rowSpan={2}>Chi nhánh</th>
              <th className="w-[80px] px-3 py-2 text-right" rowSpan={2}>Gọi</th>
              <th className="w-[90px] px-3 py-2 text-right" rowSpan={2}>TK<br />kích hoạt</th>
              <th className="w-[80px] px-3 py-2 text-right text-emerald-600" rowSpan={2}>KH<br />TN</th>
              <th className="px-2 py-1.5 text-center text-[#059669]" colSpan={2}>SA</th>
              <th className="px-2 py-1.5 text-center text-orange-600" colSpan={2}>Môi giới</th>
              <th className="px-2 py-1.5 text-center text-slate-700" colSpan={2}>Tổng</th>
              <th className="w-[90px] px-3 py-2 text-center" rowSpan={2}>MoM</th>
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] text-slate-400">
              <th className="px-2 py-1 text-right">GT GD</th>
              <th className="px-2 py-1 text-right">Phí</th>
              <th className="px-2 py-1 text-right">GT GD</th>
              <th className="px-2 py-1 text-right">Phí</th>
              <th className="px-2 py-1 text-right">GT GD</th>
              <th className="px-2 py-1 text-right font-semibold">Phí</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              colSpan={11}
              empty={visibleRows.length === 0}
              emptyText="Không có dữ liệu xếp hạng chi nhánh."
            />

            {visibleRows.map((row, index) => (
              <RankingRow key={`${row.branch_id}-${index}`} row={row} index={index} />
            ))}

            {totalRow && visibleRows.length > 0 && (
              <RankingRow row={totalRow} index={visibleRows.length} isTotal />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
