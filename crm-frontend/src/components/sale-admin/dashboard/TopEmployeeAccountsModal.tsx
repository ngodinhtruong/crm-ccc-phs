"use client";

import { X } from "lucide-react";

import { TableState } from "@/components/common";
import { formatMoney } from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminTopEmployeeRow } from "@/types/sale-admin-dashboard.type";

export function TopEmployeeAccountsModal({
  employee,
  onClose,
}: {
  employee: SaAdminTopEmployeeRow | null;
  onClose: () => void;
}) {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Tài khoản kích hoạt của {employee.employee_name}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {employee.branch_name} · {employee.reactivated_accounts} tài khoản có giao dịch khớp.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-white text-slate-700">
                <th className="w-[150px] px-3 font-semibold">Số tài khoản</th>
                <th className="w-[220px] px-3 font-semibold">Khách hàng</th>
                <th className="w-[180px] px-3 font-semibold">Chi nhánh</th>
                <th className="w-[150px] px-3 font-semibold">Phí GD</th>
                <th className="w-[150px] px-3 font-semibold">Giá trị GD</th>
                <th className="w-[120px] px-3 font-semibold">Số lệnh</th>
                <th className="w-[130px] px-3 font-semibold">Ngày gọi</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                colSpan={7}
                empty={employee.accounts.length === 0}
                emptyText="Nhân viên này chưa có tài khoản kích hoạt có giao dịch trong kỳ."
              />

              {employee.accounts.map((account, index) => (
                <tr key={`${account.account_no}-${index}`} className={`h-12 border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}`}>
                  <td className="px-3 font-semibold text-sky-700">{account.account_no}</td>
                  <td className="px-3">{account.customer_name || "-"}</td>
                  <td className="px-3">{account.branch_name || "-"}</td>
                  <td className="px-3 font-semibold text-slate-800">{formatMoney(account.transaction_fee)}</td>
                  <td className="px-3">{formatMoney(account.transaction_value)}</td>
                  <td className="px-3">{account.order_count}</td>
                  <td className="px-3">{account.call_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
