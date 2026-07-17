
"use client";

import { useMemo, useState } from "react";
import { Layers3, X } from "lucide-react";

import {
  CHART_COLORS,
  formatCompactMoney,
  formatMoney,
  formatNumber,
  getPeriodLabel,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import { SaAdminAccountRow, SaAdminCustomerGroupRow } from "@/types/sale-admin-dashboard.type";

type LooseCustomerGroupRow = SaAdminCustomerGroupRow & {
  id?: string | number | null;
  code?: string | null;
  name?: string | null;
  label?: string | null;
  icp_code?: string | null;
  icp_type?: string | null;
};

function getGroupCode(row: LooseCustomerGroupRow, index = 0) {
  return (
    row.group_code ||
    row.icp_code ||
    row.code ||
    row.icp_type ||
    (row.id !== undefined && row.id !== null ? String(row.id) : "") ||
    `G${index + 1}`
  );
}

function groupLabel(row: LooseCustomerGroupRow, index = 0) {
  return (
    row.group_label ||
    row.group_name ||
    row.label ||
    row.name ||
    getGroupCode(row, index) ||
    "Chưa phân nhóm"
  );
}

function AccountModal({
  group,
  onClose,
}: {
  group: SaAdminCustomerGroupRow | null;
  onClose: () => void;
}) {
  if (!group) return null;

  const accounts: SaAdminAccountRow[] = group.accounts || [];
  const looseGroup = group as LooseCustomerGroupRow;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="max-h-[82vh] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0097cf]">
              Chi tiết phân nhóm KH
            </p>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              {groupLabel(looseGroup)}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {formatNumber(group.count)} tài khoản · Phí GD {formatCompactMoney(group.transaction_fee)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="h-10 border-b border-slate-100 bg-white text-[11px] text-slate-500">
                <th className="px-3 font-semibold">Số TK</th>
                <th className="px-3 font-semibold">Khách hàng</th>
                <th className="px-3 font-semibold">Chi nhánh</th>
                <th className="px-3 font-semibold">PIC</th>
                <th className="px-3 text-right font-semibold">Phí GD</th>
                <th className="px-3 text-right font-semibold">GT GD</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Chưa có danh sách tài khoản cho nhóm này.
                  </td>
                </tr>
              ) : (
                accounts.map((account, index) => (
                  <tr
                    key={`${account.account_no || "account"}-${index}`}
                    className={`h-11 border-b border-slate-100 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-3 font-semibold text-[#007ead]">
                      {account.account_no || "-"}
                    </td>
                    <td className="px-3 text-slate-700">{account.customer_name || "-"}</td>
                    <td className="px-3 text-slate-600">{account.branch_name || "-"}</td>
                    <td className="px-3 text-slate-600">{account.pic_name || "-"}</td>
                    <td
                      className="px-3 text-right font-semibold text-amber-600"
                      title={formatMoney(account.transaction_fee)}
                    >
                      {formatCompactMoney(account.transaction_fee)}
                    </td>
                    <td
                      className="px-3 text-right text-slate-600"
                      title={formatMoney(account.transaction_value)}
                    >
                      {formatCompactMoney(account.transaction_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CustomerGroupDistributionPanel({
  rows,
  month,
  year,
  periodLabel,
}: {
  rows: SaAdminCustomerGroupRow[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
}) {
  const [selectedGroup, setSelectedGroup] = useState<SaAdminCustomerGroupRow | null>(null);
  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
    [rows]
  );
  const totalFee = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.transaction_fee || 0), 0),
    [rows]
  );

  const normalizedRows = rows.map((row, index) => {
    const looseRow = row as LooseCustomerGroupRow;
    const code = getGroupCode(looseRow, index);
    const label = groupLabel(looseRow, index);
    const count = Number(row.count || 0);
    const percent = row.percent ?? (total ? (count / total) * 100 : 0);

    return {
      row,
      code,
      label,
      count,
      percent,
      color: CHART_COLORS[index % CHART_COLORS.length],
      key: `${code}-${label}-${index}`,
    };
  });

  return (
    <>
      <section className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Phân nhóm Khách hàng · {periodLabel || getPeriodLabel(month, year)}
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Click vào nhóm để xem danh sách tài khoản chi tiết
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {formatNumber(total)} TK
          </span>
        </div>

        <div className="flex flex-1 p-4">
          {normalizedRows.length === 0 ? (
            <div className="flex min-h-[240px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Chưa có dữ liệu phân nhóm
            </div>
          ) : (
            <div className="grid flex-1 gap-4 lg:grid-cols-[180px_1fr]">
              <div className="flex min-h-[230px] flex-col justify-between rounded-xl border border-slate-100 bg-gradient-to-b from-sky-50 to-white p-4">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0097cf] text-white shadow-sm shadow-sky-100">
                    <Layers3 size={20} />
                  </div>
                  <p className="mt-4 text-xs font-semibold text-slate-500">Tổng tài khoản</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    {formatNumber(total)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Phí GD: <span className="font-semibold text-amber-600">{formatCompactMoney(totalFee)}</span>
                  </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-full bg-slate-100 ring-1 ring-white">
                  <div className="flex h-2.5 w-full">
                    {normalizedRows.map((item) => (
                      <span
                        key={`${item.key}-segment`}
                        style={{
                          width: `${Math.max(4, Math.min(100, Number(item.percent || 0)))}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="max-h-[250px] space-y-2 overflow-y-auto pr-1">
                {normalizedRows.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedGroup(item.row)}
                    className="group w-full rounded-lg bg-slate-50 px-3 py-2.5 text-left ring-1 ring-transparent transition hover:bg-sky-50 hover:ring-sky-100"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.code}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800">
                            {item.label}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {item.row.description || "Nhóm KH theo ICP"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {formatNumber(item.count)}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {Number(item.percent || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                        <div
                          className="h-full rounded-full transition-all group-hover:opacity-90"
                          style={{
                            width: `${Math.min(100, Number(item.percent || 0))}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span
                        className="w-16 shrink-0 text-right text-[11px] font-bold text-amber-600"
                        title={formatMoney(item.row.transaction_fee)}
                      >
                        {formatCompactMoney(item.row.transaction_fee)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <AccountModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />
    </>
  );
}
