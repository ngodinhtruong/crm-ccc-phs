"use client";

import { X } from "lucide-react";

import { TableState } from "@/components/common";
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminTopEmployeeRow } from "@/types/sale-admin-dashboard.type";

import { useEscapeKey } from "@/hooks/useEscapeKey";

export function TopEmployeeAccountsModal({
  employee,
  onClose,
}: {
  employee: SaAdminTopEmployeeRow | null;
  onClose: () => void;
}) {
  useEscapeKey(onClose, Boolean(employee));

  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#059669]">Chi tiết tài khoản kích hoạt</p>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              {employee.employee_name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {employee.branch_name} · {formatNumber(employee.reactivated_accounts)} TK kích hoạt · Phí GD {formatCompactMoney(employee.transaction_fee)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
            title="Đóng"
          >
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[66vh] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="h-[46px] border-b border-slate-200 bg-white text-[11px] text-slate-500">
                <th className="w-[150px] px-4 font-semibold">Số tài khoản</th>
                <th className="w-[220px] px-4 font-semibold">Khách hàng</th>
                <th className="w-[180px] px-4 font-semibold">Chi nhánh</th>
                <th className="w-[150px] px-3 text-right font-semibold">Phí GD</th>
                <th className="w-[150px] px-3 text-right font-semibold">Giá trị GD</th>
                <th className="w-[120px] px-3 text-right font-semibold">Số lệnh</th>
                <th className="w-[130px] px-4 font-semibold">Ngày gọi</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                colSpan={7}
                empty={employee.accounts.length === 0}
                emptyText="Nhân viên này chưa có tài khoản kích hoạt có giao dịch trong kỳ."
              />

              {employee.accounts.map((account, index) => (
                <tr key={`${account.account_no}-${index}`} className={`h-[46px] border-b border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                  <td className="px-4 font-semibold text-[#059669]">{account.account_no}</td>
                  <td className="px-4 text-slate-700">{account.customer_name || "-"}</td>
                  <td className="px-4 text-slate-600">{account.branch_name || "-"}</td>
                  <td className="px-4 text-right font-semibold text-amber-600" title={formatMoney(account.transaction_fee)}>{formatCompactMoney(account.transaction_fee)}</td>
                  <td className="px-4 text-right text-slate-600" title={formatMoney(account.transaction_value)}>{formatCompactMoney(account.transaction_value)}</td>
                  <td className="px-4 text-right">{formatNumber(account.order_count)}</td>
                  <td className="px-4 text-slate-500">{account.call_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
