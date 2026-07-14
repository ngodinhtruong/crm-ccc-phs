"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";

import { SearchInput, TablePagination, TableState } from "@/components/common";
import { formatMoney } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { TopEmployeeAccountsModal } from "@/components/sale-admin/dashboard/TopEmployeeAccountsModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SaAdminTopEmployeeRow } from "@/types/sale-admin-dashboard.type";

const PAGE_SIZE = 10;

export function TopEmployeesTable({ rows }: { rows: SaAdminTopEmployeeRow[] }) {
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
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between gap-3 border-b bg-white px-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Top nhân viên kích hoạt TK</h2>
            <p className="mt-0.5 text-xs text-slate-500">Click để xem danh sách tài khoản chi tiết.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-64">
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
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-white text-slate-700">
                <th className="sticky left-0 z-20 w-[80px] bg-white px-3 font-semibold">Thao tác</th>
                <th className="w-[80px] px-3 font-semibold">Hạng</th>
                <th className="w-[220px] px-3 font-semibold">Tên PIC</th>
                <th className="w-[180px] px-3 font-semibold">Chi nhánh</th>
                <th className="w-[150px] px-3 font-semibold">Số TK kích hoạt</th>
                <th className="w-[130px] px-3 font-semibold">Tổng cuộc gọi</th>
                <th className="w-[160px] px-3 font-semibold">Phí GD</th>
                <th className="w-[160px] px-3 font-semibold">Giá trị GD</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                colSpan={8}
                empty={pagedRows.length === 0}
                emptyText="Không có dữ liệu nhân viên kích hoạt tài khoản."
              />

              {pagedRows.map((row, index) => {
                const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";
                return (
                  <tr key={row.user_id} className={`h-12 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}>
                    <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(row)}
                        className="text-slate-400 hover:text-sky-600"
                        title="Xem tài khoản"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                    <td className="px-3 font-bold text-slate-700">#{row.rank}</td>
                    <td className="px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(row)}
                        className="font-semibold text-sky-700 hover:underline"
                      >
                        {row.employee_name}
                      </button>
                      <div className="mt-0.5 text-[11px] text-slate-400">{row.username}</div>
                    </td>
                    <td className="px-3">{row.branch_name}</td>
                    <td className="px-3 font-semibold text-slate-800">{row.reactivated_accounts}</td>
                    <td className="px-3">{row.total_calls}</td>
                    <td className="px-3 font-semibold text-slate-800">{formatMoney(row.transaction_fee)}</td>
                    <td className="px-3">{formatMoney(row.transaction_value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TopEmployeeAccountsModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </>
  );
}
