"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useRouter } from "next/navigation";

import {
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

export function TicketListTable({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: CccDashboardTicketItem[];
}) {
  const router = useRouter();

  return (
    <TableCard
      title={title}
      description={description}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-xs">
          <thead className="border-b bg-[#f8fafc] text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Mã Ticket</th>
              <th className="px-3 py-2 font-semibold">Chi nhánh xử lý</th>
              <th className="px-3 py-2 font-semibold">Phân loại</th>
              <th className="px-3 py-2 font-semibold">Công ty</th>
              <th className="px-3 py-2 font-semibold">Tình trạng</th>
              <th className="px-3 py-2 font-semibold">Mô tả</th>
              <th className="px-3 py-2 font-semibold">Nguồn Ticket</th>
              <th className="px-3 py-2 font-semibold">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <EmptyRow colSpan={8} text="Chưa có ticket trong kỳ." />
            )}

            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => router.push(`/tickets/${item.id}`)}
                className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-sky-50"
              >
                <td className="px-3 py-3 font-semibold text-sky-600">
                  <span>{item.ticket_code || `#${item.id}`}</span>
                  {item.origin === "CHATBOT" && (
                    <span className="ml-2 inline-flex rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                      Chatbot
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.handling_branch_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.category_name || "-"}
                </td>
                <td className="px-3 py-3 font-semibold text-slate-700">
                  {item.company_name || item.customer_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.status_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600 max-w-[200px] truncate" title={item.title || ""}>
                  {item.title || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.source_name || "-"}
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
