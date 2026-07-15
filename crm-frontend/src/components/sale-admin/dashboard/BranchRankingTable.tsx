"use client";

import { useEffect, useMemo, useState } from "react";

import { SearchInput, TablePagination, TableState } from "@/components/common";
import {
  formatMoney,
  formatPercent,
  getGrowthClass,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { useDebounce } from "@/hooks/useDebounce";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SaAdminBranchRankingRow } from "@/types/sale-admin-dashboard.type";

const PAGE_SIZE = 10;

export function BranchRankingTable({ rows }: { rows: SaAdminBranchRankingRow[] }) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 400);

  const filteredRows = useMemo(() => {
    const text = debouncedKeyword.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((row) => row.branch_name.toLowerCase().includes(text));
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
          <h2 className="text-sm font-semibold text-slate-800">Xếp hạng chi nhánh</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <SearchInput value={keyword} onChange={setKeyword} placeholder="Tìm chi nhánh..." />
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
        <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-white text-slate-700">
              <th className="w-[80px] px-3 font-semibold">Hạng</th>
              <th className="w-[260px] px-3 font-semibold">Chi nhánh</th>
              <th className="w-[130px] px-3 font-semibold">Số cuộc gọi</th>
              <th className="w-[140px] px-3 font-semibold">SL TK kích hoạt</th>
              <th className="w-[150px] px-3 font-semibold">SL KH tiềm năng</th>
              <th className="w-[170px] px-3 font-semibold">Phí GD</th>
              <th className="w-[140px] px-3 font-semibold">Tăng trưởng MoM</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              colSpan={7}
              empty={pagedRows.length === 0}
              emptyText="Không có dữ liệu xếp hạng chi nhánh."
            />

            {pagedRows.map((row, index) => (
              <tr key={row.branch_id} className={`h-12 border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}`}>
                <td className="px-3 font-bold text-slate-700">#{row.rank}</td>
                <td className="px-3 font-semibold text-sky-700">{row.branch_name}</td>
                <td className="px-3">{row.total_calls}</td>
                <td className="px-3">{row.reactivated_accounts}</td>
                <td className="px-3">{row.potential_active_accounts}</td>
                <td className="px-3 font-semibold text-slate-800">{formatMoney(row.transaction_fee)}</td>
                <td className="px-3">
                  <span className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold ${getGrowthClass(row.mom_growth_percent)}`}>
                    {formatPercent(row.mom_growth_percent)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
