"use client";

import { useEffect, useMemo, useState } from "react";

import { SearchInput, TablePagination, TableState } from "@/components/common";
import {
  formatCompactMoney,
  formatMoney,
  getPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { useDebounce } from "@/hooks/useDebounce";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SaAdminTopAccountRow } from "@/types/sale-admin-dashboard.type";

const PAGE_SIZE = 8;

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
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 400);

  const filteredRows = useMemo(() => {
    const text = debouncedKeyword.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((row) =>
      [row.account_no, row.customer_name, row.branch_name, row.pic_name]
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [debouncedKeyword, rows]);

  const pagination = useTablePagination(filteredRows.length, PAGE_SIZE);

  useEffect(() => {
    pagination.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, rows.length]);

  const pagedRows = filteredRows.slice(
    (pagination.page - 1) * PAGE_SIZE,
    pagination.page * PAGE_SIZE
  );

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-14 flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Top TK có phí GD cao nhất · {periodLabel || getPeriodLabel(month, year)}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Từ dữ liệu giao dịch thực · bao gồm NV kích hoạt</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-64">
            <SearchInput value={keyword} onChange={setKeyword} placeholder="Tìm số TK, KH, PIC..." />
          </div>
          <TablePagination
            fromRecord={pagination.fromRecord}
            toRecord={pagination.toRecord}
            count={filteredRows.length}
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPrevious={() => pagination.setSafePage(pagination.page - 1)}
            onNext={() => pagination.setSafePage(pagination.page + 1)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b border-slate-100 bg-slate-50 text-[11px] text-slate-500">
              <th className="w-[56px] px-3 text-center font-semibold">#</th>
              <th className="w-[160px] px-3 font-semibold">Tài khoản</th>
              <th className="w-[220px] px-3 font-semibold">Tên tài khoản</th>
              <th className="w-[160px] px-3 font-semibold">Chi nhánh</th>
              <th className="w-[130px] px-3 text-right font-semibold">Phí GD</th>
              <th className="w-[130px] px-3 text-right font-semibold">GT GD</th>
              <th className="w-[180px] px-3 font-semibold">NV kích hoạt</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              colSpan={7}
              empty={pagedRows.length === 0}
              emptyText="Chưa có dữ liệu giao dịch."
            />

            {pagedRows.map((row, index) => (
              <tr key={`${row.account_no}-${index}`} className={`h-12 border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-sky-50/70`}>
                <td className="px-3 text-center font-bold text-slate-500">{(pagination.page - 1) * PAGE_SIZE + index + 1}</td>
                <td className="px-3 font-semibold text-[#007ead]">{row.account_no}</td>
                <td className="px-3 text-slate-700">{row.customer_name || "-"}</td>
                <td className="px-3 text-slate-600">{row.branch_name || "-"}</td>
                <td className="px-3 text-right font-bold text-amber-600" title={formatMoney(row.transaction_fee)}>{formatCompactMoney(row.transaction_fee)}</td>
                <td className="px-3 text-right text-slate-600" title={formatMoney(row.transaction_value)}>{formatCompactMoney(row.transaction_value)}</td>
                <td className="px-3 text-slate-700">{row.pic_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
