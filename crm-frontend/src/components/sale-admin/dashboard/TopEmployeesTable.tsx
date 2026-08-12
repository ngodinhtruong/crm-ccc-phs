"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { TablePagination, TableState } from "@/components/common";
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
  getPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { TopEmployeeAccountsModal } from "@/components/sale-admin/dashboard/TopEmployeeAccountsModal";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SaAdminTopEmployeeRow } from "@/types/sale-admin-dashboard.type";

const PAGE_SIZE = 5;

export function TopEmployeesTable({
  rows,
  month,
  year,
  periodLabel,
}: {
  rows: SaAdminTopEmployeeRow[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<SaAdminTopEmployeeRow | null>(null);

  const pagination = useTablePagination(rows.length, PAGE_SIZE);

  const pagedRows = rows.slice(
    (pagination.page - 1) * PAGE_SIZE,
    pagination.page * PAGE_SIZE
  );

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2">
          <div>
            <h2 className="text-xs font-bold text-slate-800">
              Top Nhân viên kích hoạt TK · {periodLabel || getPeriodLabel(month, year)}
            </h2>
            <p className="text-[11px] text-slate-500">Click để xem danh sách tài khoản đã kích hoạt</p>
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
                <th className="w-[200px] px-3 font-semibold">Nhân viên</th>
                <th className="w-[150px] px-3 font-semibold">Chi nhánh</th>
                <th className="w-[110px] px-2 text-right font-semibold">TK kích hoạt</th>
                <th className="w-[100px] px-2 text-right font-semibold">Cuộc gọi</th>
                <th className="w-[120px] px-2 text-right font-semibold">Phí GD</th>
                <th className="w-[120px] px-2 text-right font-semibold">GT GD</th>
                <th className="w-[80px] px-2 text-center font-semibold">Chi tiết</th>
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
                  <tr key={`${row.user_id}-${index}`} className={`h-9 border-b border-slate-100 ${rowBg} hover:bg-sky-50/70`}>
                    <td className="px-2 text-center font-bold text-slate-500">
                      {(pagination.page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-4 text-slate-700">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(row)}
                        className="font-semibold text-[#059669] hover:underline"
                      >
                        {row.employee_name}
                      </button>
                      <div className="mt-0.5 truncate text-[11px] text-slate-400">{row.username || row.email || "-"}</div>
                    </td>
                    <td className="px-4 text-slate-600">{row.branch_name || "-"}</td>
                    <td className="px-4 text-right font-semibold text-emerald-600">{formatNumber(row.reactivated_accounts)}</td>
                    <td className="px-4 text-right text-slate-600">{formatNumber(row.total_calls)}</td>
                    <td className="px-4 text-right font-semibold text-slate-800" title={formatMoney(row.transaction_fee)}>{formatCompactMoney(row.transaction_fee)}</td>
                    <td className="px-4 text-right text-slate-600" title={formatMoney(row.transaction_value)}>{formatCompactMoney(row.transaction_value)}</td>
                    <td className="px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-50 hover:text-[#059669]"
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
