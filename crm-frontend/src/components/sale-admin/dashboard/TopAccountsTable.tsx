"use client";

import { useEffect, useMemo, useState } from "react";

import { SearchInput, TablePagination, TableState } from "@/components/common";
import { formatMoney } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { useDebounce } from "@/hooks/useDebounce";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SaAdminTopAccountRow } from "@/types/sale-admin-dashboard.type";

const PAGE_SIZE = 10;

export function TopAccountsTable({ rows }: { rows: SaAdminTopAccountRow[] }) {
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
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between gap-3 border-b bg-white px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Top TK có phí GD cao nhất</h2>
          <p className="mt-0.5 text-xs text-slate-500">Các tài khoản tái kích hoạt có doanh thu lớn nhất trong kỳ.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
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
        <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-white text-slate-700">
              <th className="w-[160px] px-3 font-semibold">Số tài khoản</th>
              <th className="w-[220px] px-3 font-semibold">Khách hàng</th>
              <th className="w-[180px] px-3 font-semibold">Chi nhánh</th>
              <th className="w-[170px] px-3 font-semibold">Phí GD</th>
              <th className="w-[170px] px-3 font-semibold">Khối lượng GD</th>
              <th className="w-[110px] px-3 font-semibold">Số lệnh</th>
              <th className="w-[220px] px-3 font-semibold">SA phụ trách kích hoạt</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              colSpan={7}
              empty={pagedRows.length === 0}
              emptyText="Không có tài khoản phát sinh phí trong kỳ."
            />

            {pagedRows.map((row, index) => (
              <tr key={`${row.account_no}-${index}`} className={`h-12 border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}`}>
                <td className="px-3 font-semibold text-sky-700">{row.account_no}</td>
                <td className="px-3">{row.customer_name || "-"}</td>
                <td className="px-3">{row.branch_name || "-"}</td>
                <td className="px-3 font-semibold text-slate-800">{formatMoney(row.transaction_fee)}</td>
                <td className="px-3">{formatMoney(row.transaction_value)}</td>
                <td className="px-3">{row.order_count}</td>
                <td className="px-3">{row.pic_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
