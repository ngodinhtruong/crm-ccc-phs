"use client";

import { Plus } from "lucide-react";

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

function formatDate(value?: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN").format(date);
}

export function TicketListPage() {
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
                <button
                    type="button"
                    onClick={tickets.goCreate}
                    className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
                >
                    <Plus size={15} />
                    Thêm ticket
                </button>
            }
        >
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                {tickets.masterError && (
                    <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
                        {tickets.masterError}
                    </div>
                )}
                <div className="flex h-12 items-center justify-between border-b bg-white px-4">
                    <div>
                        <h1 className="text-sm font-semibold text-slate-800">
                            Danh sách ticket
                        </h1>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Quản lý ticket chatbot và ticket tạo thủ công.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-700">
                        <span>
                            {tickets.fromRecord} đến {tickets.toRecord} của{" "}
                            <span className="font-semibold">{tickets.count}</span>
                        </span>

                        <button
                            type="button"
                            onClick={tickets.clearFilter}
                            className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Xóa lọc
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1600px] border-collapse text-left text-xs">
                        <thead>
                            <tr className="h-10 border-b bg-white text-slate-700">
                                <th className="w-[150px] px-3 font-semibold">Mã ticket</th>
                                <th className="w-[130px] px-3 font-semibold">Loại tạo</th>
                                <th className="w-[180px] px-3 font-semibold">Danh mục</th>
                                <th className="w-[180px] px-3 font-semibold">Phân loại</th>
                                <th className="w-[160px] px-3 font-semibold">Tình trạng</th>
                                <th className="w-[180px] px-3 font-semibold">Công ty</th>
                                <th className="w-[180px] px-3 font-semibold">Khách hàng</th>
                                <th className="w-[180px] px-3 font-semibold">Giao cho</th>
                                <th className="w-[150px] px-3 font-semibold">Ngày tạo</th>
                                <th className="w-[350px] px-3 font-semibold">Nội dung</th>
                            </tr>

                            <tr className="border-b bg-[#f8fafc] align-top">
                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={tickets.ticketCode}
                                        onChange={tickets.setTicketCode}
                                        placeholder="Mã"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnSelectFilter
                                        value={tickets.classificationMethod}
                                        onChange={tickets.setClassificationMethod}
                                        options={[
                                            {
                                                label: "Chatbot",
                                                value: "AUTO",
                                            },
                                            {
                                                label: "Thủ công",
                                                value: "MANUAL",
                                            },
                                        ]}
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
                                        value={tickets.companyName}
                                        onChange={tickets.setCompanyName}
                                        placeholder="Công ty"
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
                                        value={tickets.ownerUserName}
                                        onChange={tickets.setOwnerUserName}
                                        placeholder="Người xử lý"
                                    />
                                </th>

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
                                        value={tickets.requestContent}
                                        onChange={tickets.setRequestContent}
                                        placeholder="Nội dung"
                                    />
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            <TableState
                                loading={tickets.loading}
                                error={tickets.error}
                                empty={!tickets.loading && !tickets.error && tickets.items.length === 0}
                                colSpan={10}
                                emptyText="Không có dữ liệu ticket."
                            />

                            {!tickets.loading &&
                                !tickets.error &&
                                tickets.items.map((item, index) => {
                                    const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                                        >
                                            <td className="px-3 font-semibold text-sky-600">
                                                {item.ticket_code || `TICKET-${item.id}`}
                                            </td>

                                            <td className="px-3">
                                                <TicketMethodBadge value={item.classification_method} />
                                            </td>

                                            <td className="px-3">
                                                {item.support_category_name || "-"}
                                            </td>

                                            <td className="px-3">
                                                {item.classification_name || "-"}
                                            </td>

                                            <td className="px-3">{item.status_name || "-"}</td>

                                            <td className="px-3">{item.company_name || "-"}</td>

                                            <td className="px-3">{item.customer_name || "-"}</td>

                                            <td className="px-3">
                                                {item.owner_user_name ||
                                                    item.assigned_employee_name ||
                                                    "-"}
                                            </td>

                                            <td className="px-3">{formatDate(item.created_at)}</td>

                                            <td className="max-w-[350px] truncate px-3">
                                                {item.request_content || "-"}
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