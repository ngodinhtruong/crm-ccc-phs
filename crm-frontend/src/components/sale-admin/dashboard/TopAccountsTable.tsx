"use client";

import { TablePagination, TableState } from "@/components/common";
import {
  formatCompactMoney,
  formatMoney,
  getPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SaAdminTopAccountRow } from "@/types/sale-admin-dashboard.type";

const PAGE_SIZE = 5;

export function TopAccountsTable({
  rows,
  month,
  year,
  periodLabel,
}: {
  rows: SaAdminTopAccountRow[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
}) {
  const pagination = useTablePagination(rows.length, PAGE_SIZE);

  const pagedRows = rows.slice(
    (pagination.page - 1) * PAGE_SIZE,
    pagination.page * PAGE_SIZE
  );

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2">
        <div>
          <h2 className="text-xs font-bold text-slate-800">
            Top TK có phí GD cao nhất · {periodLabel || getPeriodLabel(month, year)}
          </h2>
          <p className="text-[11px] text-slate-500">Từ dữ liệu giao dịch thực · bao gồm NV kích hoạt</p>
        </div>
        <TablePagination
          fromRecord={pagination.fromRecord}
          toRecord={pagination.toRecord}
          count={rows.length}
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPrevious={() => pagination.setSafePage(pagination.page - 1)}
          onNext={() => pagination.setSafePage(pagination.page + 1)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-8 border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
              <th className="w-[48px] px-2 text-center font-semibold">#</th>
              <th className="w-[140px] px-3 font-semibold">Tài khoản</th>
              <th className="w-[200px] px-3 font-semibold">Tên tài khoản</th>
              <th className="w-[150px] px-3 font-semibold">Chi nhánh</th>
              <th className="w-[120px] px-2 text-right font-semibold">Phí GD</th>
              <th className="w-[120px] px-2 text-right font-semibold">GT GD</th>
              <th className="w-[160px] px-3 font-semibold">NV kích hoạt</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              colSpan={7}
              empty={pagedRows.length === 0}
              emptyText="Chưa có dữ liệu giao dịch."
            />

            {pagedRows.map((row, index) => (
              <tr key={`${row.account_no}-${index}`} className={`h-9 border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-sky-50/70`}>
                <td className="px-2 text-center font-bold text-slate-500">{(pagination.page - 1) * PAGE_SIZE + index + 1}</td>
                <td className="px-3 font-semibold text-[#059669]">{row.account_no}</td>
                <td className="px-3 text-slate-700">{row.customer_name || "-"}</td>
                <td className="px-3 text-slate-600">{row.branch_name || "-"}</td>
                <td className="px-2 text-right font-bold text-amber-600" title={formatMoney(row.transaction_fee)}>{formatCompactMoney(row.transaction_fee)}</td>
                <td className="px-2 text-right text-slate-600" title={formatMoney(row.transaction_value)}>{formatCompactMoney(row.transaction_value)}</td>
                <td className="px-3 text-slate-700">{row.pic_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
