"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import {
  CccDashboardAuditLog,
  CccDashboardRecurringIssue,
  CccDashboardTicketItem,
} from "@/types/ccc-dashboard.type";
import { formatDate, formatDateTime, formatNumber } from "./CccDashboardUtils";

function TableCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>

      {children}
    </div>
  );
}

function AccountLinkBadge({ value }: { value?: string | null }) {
  if (value === "LINKED") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
        Có TK
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
      Chưa có TK
    </span>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-24 text-center text-xs text-slate-500">
        {text}
      </td>
    </tr>
  );
}

function RecurringIssuesTable({ items }: { items: CccDashboardRecurringIssue[] }) {
  return (
    <TableCard
      title="Recurring Issues"
      description="Những nguồn/vấn đề phát sinh lặp lại nhiều lần trong kỳ."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-xs">
          <thead className="border-b bg-[#f8fafc] text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Vấn đề</th>
              <th className="px-3 py-2 font-semibold">Nguồn</th>
              <th className="px-3 py-2 font-semibold">Danh mục</th>
              <th className="px-3 py-2 font-semibold">Loại lỗi</th>
              <th className="px-3 py-2 text-right font-semibold">Số lần</th>
              <th className="px-3 py-2 font-semibold">Gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <EmptyRow colSpan={6} text="Chưa có vấn đề lặp lại." />
            )}

            {items.map((item, index) => (
              <tr
                key={`${item.problem_name}-${item.source}-${index}`}
                className="border-b border-slate-100 hover:bg-sky-50"
              >
                <td className="px-3 py-3 font-semibold text-slate-800">
                  {item.problem_name || "Chưa xác định"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.source_name || "Chưa có nguồn"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.support_category_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.error_type_name || item.error_group_name || "-"}
                </td>
                <td className="px-3 py-3 text-right font-bold text-slate-800">
                  {formatNumber(item.count)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatDateTime(item.latest_created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableCard>
  );
}

function AuditTrailTable({ items }: { items: CccDashboardAuditLog[] }) {
  return (
    <TableCard
      title="Audit Trail"
      description="Các lần cập nhật trạng thái/luân chuyển ticket gần nhất."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="border-b bg-[#f8fafc] text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Mã ticket</th>
              <th className="px-3 py-2 font-semibold">Từ trạng thái</th>
              <th className="px-3 py-2 font-semibold">Sang trạng thái</th>
              <th className="px-3 py-2 font-semibold">Người cập nhật</th>
              <th className="px-3 py-2 font-semibold">Thời gian</th>
              <th className="px-3 py-2 font-semibold">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <EmptyRow colSpan={6} text="Chưa có lịch sử cập nhật ticket." />
            )}

            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-sky-50">
                <td className="px-3 py-3 font-semibold text-sky-600">
                  {item.ticket_code || `#${item.ticket || item.id}`}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.from_status_name || "-"}
                </td>
                <td className="px-3 py-3 font-semibold text-slate-800">
                  {item.to_status_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.updated_by_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatDateTime(item.created_at)}
                </td>
                <td className="max-w-[280px] truncate px-3 py-3 text-slate-600" title={item.note || ""}>
                  {item.note || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableCard>
  );
}

function RecentTicketsTable({ items }: { items: CccDashboardTicketItem[] }) {
  return (
    <TableCard
      title="Ticket gần nhất"
      description="Danh sách nhanh các ticket mới nhất theo bộ lọc hiện tại."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-xs">
          <thead className="border-b bg-[#f8fafc] text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Mã ticket</th>
              <th className="px-3 py-2 font-semibold">Linked</th>
              <th className="px-3 py-2 font-semibold">Số TK</th>
              <th className="px-3 py-2 font-semibold">Trạng thái</th>
              <th className="px-3 py-2 font-semibold">Danh mục</th>
              <th className="px-3 py-2 font-semibold">Nguồn</th>
              <th className="px-3 py-2 font-semibold">KH/Công ty</th>
              <th className="px-3 py-2 font-semibold">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <EmptyRow colSpan={8} text="Chưa có ticket trong kỳ." />
            )}

            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-sky-50">
                <td className="px-3 py-3 font-semibold text-sky-600">
                  {item.ticket_code || `#${item.id}`}
                </td>
                <td className="px-3 py-3">
                  <AccountLinkBadge value={item.account_link_status} />
                </td>
                <td className="px-3 py-3 font-semibold text-slate-700">
                  {item.display_account_number || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.status_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.category_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.source_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.customer_name || item.company_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatDate(item.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableCard>
  );
}

export function CccDashboardTables({
  recurringIssues,
  auditTrail,
  recentTickets,
}: {
  recurringIssues: CccDashboardRecurringIssue[];
  auditTrail: CccDashboardAuditLog[];
  recentTickets: CccDashboardTicketItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecurringIssuesTable items={recurringIssues} />
        <AuditTrailTable items={auditTrail} />
      </div>

      <RecentTicketsTable items={recentTickets} />
    </div>
  );
}
