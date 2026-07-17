"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Trophy } from "lucide-react";

import { SearchInput, TablePagination, TableState } from "@/components/common";
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
  getPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { TopEmployeeAccountsModal } from "@/components/sale-admin/dashboard/TopEmployeeAccountsModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SaAdminTopEmployeeRow } from "@/types/sale-admin-dashboard.type";

const PAGE_SIZE = 8;

function rankClass(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-700 ring-amber-200";
  if (rank === 2) return "bg-slate-100 text-slate-700 ring-slate-200";
  if (rank === 3) return "bg-orange-100 text-orange-700 ring-orange-200";
  return "bg-sky-50 text-[#0097cf] ring-sky-100";
}

export function TopEmployeesTable({
  rows,
  month,
  year,
}: {
  rows: SaAdminTopEmployeeRow[];
  month?: string | number;
  year?: string | number;
}) {
  const [keyword, setKeyword] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<SaAdminTopEmployeeRow | null>(null);
  const debouncedKeyword = useDebounce(keyword, 400);

  const filteredRows = useMemo(() => {
    const text = debouncedKeyword.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((row) =>
      [row.employee_name, row.username, row.email, row.branch_name]
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
    <>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-14 flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Top Nhân viên kích hoạt TK · {getPeriodLabel(month, year)}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Click để xem danh sách tài khoản đã kích hoạt</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-64">
              <SearchInput value={keyword} onChange={setKeyword} placeholder="Tìm nhân viên..." />
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
                <th className="sticky left-0 z-20 w-[76px] bg-slate-50 px-3 font-semibold">#</th>
                <th className="w-[230px] px-3 font-semibold">Nhân viên</th>
                <th className="w-[170px] px-3 font-semibold">Chi nhánh</th>
                <th className="w-[130px] px-3 text-right font-semibold">TK kích hoạt</th>
                <th className="w-[120px] px-3 text-right font-semibold">Cuộc gọi</th>
                <th className="w-[140px] px-3 text-right font-semibold">Phí GD</th>
                <th className="w-[140px] px-3 text-right font-semibold">GT GD</th>
                <th className="w-[90px] px-3 text-center font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                colSpan={8}
                empty={pagedRows.length === 0}
                emptyText="Chưa có dữ liệu nhân viên kích hoạt tài khoản."
              />

              {pagedRows.map((row, index) => {
                const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/50";
                return (
                  <tr key={`${row.user_id}-${index}`} className={`h-12 border-b border-slate-100 ${rowBg} hover:bg-sky-50/70`}>
                    <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ring-1 ${rankClass(row.rank)}`}>
                        <Trophy size={12} /> {row.rank}
                      </span>
                    </td>
                    <td className="px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(row)}
                        className="font-semibold text-[#007ead] hover:underline"
                      >
                        {row.employee_name}
                      </button>
                      <div className="mt-0.5 truncate text-[11px] text-slate-400">{row.username || row.email || "-"}</div>
                    </td>
                    <td className="px-3 text-slate-600">{row.branch_name || "-"}</td>
                    <td className="px-3 text-right font-semibold text-emerald-600">{formatNumber(row.reactivated_accounts)}</td>
                    <td className="px-3 text-right text-slate-600">{formatNumber(row.total_calls)}</td>
                    <td className="px-3 text-right font-semibold text-slate-800" title={formatMoney(row.transaction_fee)}>{formatCompactMoney(row.transaction_fee)}</td>
                    <td className="px-3 text-right text-slate-600" title={formatMoney(row.transaction_value)}>{formatCompactMoney(row.transaction_value)}</td>
                    <td className="px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-sky-50 hover:text-[#0097cf]"
                        title="Xem tài khoản"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <TopEmployeeAccountsModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </>
  );
}
