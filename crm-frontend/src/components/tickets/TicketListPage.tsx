"use client";

import { Eye, FolderTree, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
  TablePagination,
  TableState,
} from "@/components/common";
import { useTickets } from "@/hooks/useTickets";
import { DashboardLayout } from "@/layouts/DashboardLayout";

function TicketMethodBadge({ value }: { value?: string | null }) {
  if (value === "AUTO") {
    return (
      <span className="inline-flex rounded-md bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
        Chatbot
      </span>
    );
  }

  if (value === "MANUAL") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Thủ công
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      -
    </span>
  );
}

function TicketErrorBadge({ value }: { value?: string | null }) {
  if (!value) {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
        Ticket thường
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
      Ticket lỗi
    </span>
  );
}

function AccountLinkBadge({ value }: { value?: string | null }) {
  if (value === "LINKED") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
        Có TK liên kết
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
      Chưa có TK liên kết
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined) return "-";
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (hours < 24) {
    return remainingMinutes
      ? `${hours} giờ ${remainingMinutes} phút`
      : `${hours} giờ`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} ngày ${remainingHours} giờ` : `${days} ngày`;
}

const accountTabs = [
  { label: "Tất cả", value: "" },
  { label: "Có TK liên kết", value: "LINKED" },
  { label: "Chưa có TK liên kết", value: "UNLINKED" },
];

export function TicketListPage() {
  const router = useRouter();
  const tickets = useTickets();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "Tickets",
        },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={tickets.goErrorCatalogs}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FolderTree size={15} />
            Danh mục lỗi
          </button>

          <button
            type="button"
            onClick={tickets.goCreate}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
          >
            <Plus size={15} />
            Thêm ticket
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        {tickets.masterError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {tickets.masterError}
          </div>
        )}

        <div className="flex min-h-12 items-center justify-between border-b bg-white px-4 py-2">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Danh sách ticket
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý ticket chatbot, ticket thủ công, ticket lỗi và phân loại Linked/Unlinked theo tài khoản lưu ký.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TablePagination
              fromRecord={tickets.fromRecord}
              toRecord={tickets.toRecord}
              count={tickets.count}
              page={tickets.page}
              totalPages={tickets.totalPages}
              loading={tickets.loading}
              onPrevious={tickets.previousPage}
              onNext={tickets.nextPage}
            />

            <button
              type="button"
              onClick={tickets.clearFilter}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b bg-[#f8fafc] px-4 py-3">
          {accountTabs.map((tab) => {
            const active = tickets.accountLinkStatus === tab.value;

            return (
              <button
                key={tab.value || "ALL"}
                type="button"
                onClick={() => tickets.setAccountLinkStatus(tab.value)}
                className={`h-8 rounded-full border px-4 text-xs font-semibold transition ${active
                    ? "border-[#0097cf] bg-[#0097cf] text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[2200px] border-collapse text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-white text-slate-700">
                <th className="w-[150px] px-3 font-semibold">Ngày tạo</th>
                <th className="w-[145px] px-3 font-semibold">Mã ticket</th>
                <th className="w-[180px] px-3 font-semibold">Phân loại</th>
                <th className="w-[180px] px-3 font-semibold">Danh mục</th>
                <th className="w-[180px] px-3 font-semibold">Khách hàng</th>
                <th className="w-[140px] px-3 font-semibold">Số TK</th>
                <th className="w-[140px] px-3 font-semibold">Di động</th>
                <th className="w-[140px] px-3 font-semibold">Email</th>
                <th className="w-[140px] px-3 font-semibold">Nguồn Ticket</th>
                <th className="w-[160px] px-3 font-semibold">Tình trạng</th>
                <th className="w-[180px] px-3 font-semibold">Giao cho</th>
                <th className="w-[180px] px-3 font-semibold">Mức độ ưu tiên</th>
                <th className="w-[180px] px-3 font-semibold">Tổng thời gian</th>
                <th className="w-[180px] px-3 font-semibold">Tổng thời gian xử lý</th>
              </tr>

              <tr className="border-b bg-[#f8fafc] align-top">
                <th className="px-2 py-2">
                  <ColumnDateRangeFilter
                    fromValue={tickets.createdFrom}
                    toValue={tickets.createdTo}
                    onFromChange={tickets.setCreatedFrom}
                    onToChange={tickets.setCreatedTo}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.ticketCode}
                    onChange={tickets.setTicketCode}
                    placeholder="Mã"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.classification}
                    onChange={tickets.setClassification}
                    options={tickets.filteredClassifications.map((item) => ({
                      label: item.classification_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.supportCategory}
                    onChange={tickets.setSupportCategory}
                    options={tickets.supportCategories.map((item) => ({
                      label: item.category_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.customerName}
                    onChange={tickets.setCustomerName}
                    placeholder="KH"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.accountNumber}
                    onChange={tickets.setAccountNumber}
                    placeholder="Số TK"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.customerPhone}
                    onChange={tickets.setCustomerPhone}
                    placeholder="Di động"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.customerEmail}
                    onChange={tickets.setCustomerEmail}
                    placeholder="Email"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.source}
                    onChange={tickets.setSource}
                    options={tickets.sources.map((item) => ({
                      label: item.source_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.currentStatus}
                    onChange={tickets.setCurrentStatus}
                    options={tickets.statuses.map((item) => ({
                      label: item.status_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.ownerUserName}
                    onChange={tickets.setOwnerUserName}
                    placeholder="Giao cho"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.priority}
                    onChange={tickets.setPriority}
                    options={tickets.priorities.map((item) => ({
                      label: item.priority_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2"></th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>

            <tbody>
              <TableState
                loading={tickets.loading}
                error={tickets.error}
                empty={!tickets.loading && !tickets.error && tickets.items.length === 0}
                colSpan={14}
                emptyText="Không có dữ liệu ticket."
              />

              {!tickets.loading &&
                !tickets.error &&
                tickets.items.map((item, index) => {
                  const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/tickets/${item.id}`)}
                      className={`h-14 cursor-pointer border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                    >
                      <td className="px-3">{formatDate(item.created_at)}</td>

                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sky-600">
                            {item.ticket_code || `TICKET-${item.id}`}
                          </span>


                        </div>
                      </td>

                      <td className="px-3">{item.classification_name || "-"}</td>

                      <td className="px-3">{item.support_category_name || "-"}</td>

                      <td className="px-3">{item.customer_name || "-"}</td>

                      <td className="px-3 font-semibold text-slate-700">
                        {item.display_account_number || item.customer_account_number || item.contact_value || "-"}
                      </td>

                      <td className="px-3">{item.customer_phone || "-"}</td>

                      <td className="px-3">{item.customer_email || "-"}</td>

                      <td className="px-3">{item.source_name || "-"}</td>

                      <td className="px-3">{item.status_name || "-"}</td>

                      <td className="px-3">
                        {item.assigned_employee_name || item.owner_user_name || "-"}
                      </td>

                      <td className="px-3">{item.priority_name || "-"}</td>

                      <td className="px-3 font-medium text-slate-600">
                        {formatDuration(item.total_duration_minutes)}
                      </td>

                      <td className="px-3 font-medium text-slate-600">
                        {formatDuration(item.processing_duration_minutes)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
