"use client";

import { ArrowLeft, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useSaRecordAuditLogs } from "@/hooks/useSaRecordAuditLogs";
import { useSaRecordDetail } from "@/hooks/useSaRecordDetail";
import { SaRecordAuditLogItem, SaRecordItem } from "@/types/sale-admin.type";

function formatDate(value?: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatDateTime(value?: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
}

function formatMoney(value?: string | number | null) {
    const numberValue = Number(value || 0);
    if (!numberValue) return "-";

    return new Intl.NumberFormat("vi-VN").format(numberValue);
}

function formatBoolean(value?: boolean | null) {
    if (value === true) return "Có";
    if (value === false) return "Không";
    return "-";
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) {
    return (
        <div className="grid grid-cols-12 border-b border-slate-100 py-2 text-xs">
            <div className="col-span-4 font-semibold text-slate-500">{label}</div>
            <div className="col-span-8 text-slate-800">{value || "-"}</div>
        </div>
    );
}

function CurrentInfoTab({ item }: { item: SaRecordItem }) {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                    Thông tin khách hàng
                </h2>

                <InfoRow label="Mã record" value={item.record_code} />
                <InfoRow label="Số TK lưu ký" value={item.account_no} />
                <InfoRow
                    label="Tên KH"
                    value={item.customer_name_snapshot || item.customer_name}
                />
                <InfoRow
                    label="Chi nhánh"
                    value={item.branch_name_snapshot || item.branch_name}
                />
                <InfoRow label="Trạng thái TK" value={item.account_status} />
                <InfoRow label="VIP" value={item.vip_classification} />
                <InfoRow
                    label="PIC"
                    value={
                        item.pic_name_snapshot ||
                        item.pic_user_name ||
                        item.pic_employee_name
                    }
                />
            </section>

            <section className="rounded border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                    Thông tin cuộc gọi
                </h2>

                <InfoRow label="Ngày gọi" value={formatDate(item.call_date)} />
                <InfoRow label="Lần follow" value={item.follow_no} />
                <InfoRow label="Kết quả gọi" value={item.call_result_name} />
                <InfoRow label="Mức độ quan tâm" value={item.interest_level_name} />
                <InfoRow label="Nhóm KH" value={item.icp_group_name} />
                <InfoRow label="Mã nhóm KH" value={item.icp_group_code} />
            </section>

            <section className="rounded border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                    Trạng thái xử lý
                </h2>

                <InfoRow label="Giới thiệu sản phẩm" value={formatBoolean(item.introduced_product)} />
                <InfoRow label="Tái kích hoạt" value={formatBoolean(item.reactivation)} />
                <InfoRow label="Hỗ trợ thông tin" value={formatBoolean(item.support_info)} />
                <InfoRow label="Bàn giao môi giới" value={formatBoolean(item.handover_to_broker)} />
                <InfoRow label="Ghi chú bàn giao" value={item.broker_handover_note} />
            </section>

            <section className="rounded border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                    Giao dịch & ghi chú
                </h2>

                <InfoRow label="Nguồn dữ liệu" value={item.source_system} />
                <InfoRow label="Trạng thái dữ liệu" value={item.data_status} />
                <InfoRow label="Ghi chú" value={item.note} />
            </section>
        </div>
    );
}

function formatJsonValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "-";

    if (typeof value === "boolean") return value ? "Có" : "Không";

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

function AuditChangedFields({ log }: { log: SaRecordAuditLogItem }) {
    const changedFields = log.changed_fields || [];

    if (changedFields.length === 0) {
        return <span className="text-slate-400">-</span>;
    }

    return (
        <div className="flex max-w-[420px] flex-wrap gap-1">
            {changedFields.map((field) => (
                <span
                    key={field}
                    className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                >
                    {field}
                </span>
            ))}
        </div>
    );
}

function AuditSnapshot({ log }: { log: SaRecordAuditLogItem }) {
    const changedFields = log.changed_fields || [];
    const oldData = log.old_data || {};
    const newData = log.new_data || {};

    if (log.action_type === "CREATE") {
        return (
            <div className="text-xs text-slate-600">
                Tạo mới record.
            </div>
        );
    }

    if (log.action_type === "DELETE") {
        return (
            <div className="text-xs text-slate-600">
                Xóa record.
            </div>
        );
    }

    if (changedFields.length === 0) {
        return <div className="text-xs text-slate-400">Không có field thay đổi.</div>;
    }

    return (
        <div className="space-y-2">
            {changedFields.map((field) => (
                <div
                    key={field}
                    className="rounded border border-slate-200 bg-slate-50 p-2 text-xs"
                >
                    <div className="mb-1 font-semibold text-slate-700">{field}</div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="mb-0.5 text-[11px] font-semibold text-red-500">
                                Trước
                            </div>
                            <div className="break-words text-slate-700">
                                {formatJsonValue(oldData[field])}
                            </div>
                        </div>

                        <div>
                            <div className="mb-0.5 text-[11px] font-semibold text-emerald-600">
                                Sau
                            </div>
                            <div className="break-words text-slate-700">
                                {formatJsonValue(newData[field])}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}


const auditColumns = [
    {
        label: "Mã record",
        fields: ["record_code"],
        width: "w-[150px]",
    },
    {
        label: "Số TK lưu ký",
        fields: ["account_no"],
        width: "w-[140px]",
    },
    {
        label: "Tên KH",
        fields: ["customer_name_snapshot"],
        width: "w-[180px]",
    },
    {
        label: "Tên CN",
        fields: ["branch_name_snapshot", "branch_name", "branch_id"],
        width: "w-[150px]",
    },
    {
        label: "Trạng thái",
        fields: ["account_status"],
        width: "w-[120px]",
    },
    {
        label: "VIP",
        fields: ["vip_classification"],
        width: "w-[120px]",
    },
    {
        label: "PIC",
        fields: [
            "pic_name_snapshot",
            "pic_user_name",
            "pic_employee_name",
            "pic_user_id",
            "pic_employee_id",
        ],
        width: "w-[150px]",
    },
    {
        label: "Ngày gọi",
        fields: ["call_date"],
        width: "w-[130px]",
    },
    {
        label: "Follow",
        fields: ["follow_no"],
        width: "w-[90px]",
    },
    {
        label: "Kết quả",
        fields: ["call_result_name", "call_result_id"],
        width: "w-[130px]",
    },
    {
        label: "Quan tâm",
        fields: ["interest_level_name", "interest_level_id"],
        width: "w-[130px]",
    },
    {
        label: "Nhóm KH",
        fields: ["icp_group_id"],
        width: "w-[120px]",
    },
    {
        label: "Giới thiệu SP",
        fields: ["introduced_product"],
        width: "w-[120px]",
    },
    {
        label: "Tái kích hoạt",
        fields: ["reactivation"],
        width: "w-[120px]",
    },
    {
        label: "Hỗ trợ TT",
        fields: ["support_info"],
        width: "w-[120px]",
    },
    {
        label: "Tổng GTGD",
        fields: ["transaction_value_snapshot"],
        width: "w-[140px]",
    },
    {
        label: "Phí GD",
        fields: ["transaction_fee_snapshot"],
        width: "w-[130px]",
    },
    {
        label: "Bàn giao MG",
        fields: ["handover_to_broker", "referred_rm", "broker_handover_note"],
        width: "w-[150px]",
    },
];

function getAuditSnapshot(log: SaRecordAuditLogItem) {
    if (log.action_type === "DELETE") {
        return log.old_data || {};
    }

    return log.new_data || log.old_data || {};
}

function isColumnChanged(log: SaRecordAuditLogItem, fields: string[]) {
    const changedFields = log.changed_fields || [];

    return fields.some((field) => changedFields.includes(field));
}

function getFirstValue(data: Record<string, unknown>, fields: string[]) {
    for (const field of fields) {
        const value = data[field];

        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }

    return null;
}

function formatAuditCellValue(value: unknown, fields: string[]) {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "boolean") return value ? "Có" : "Không";

  const rawValue = String(value);

  if (fields.includes("call_date")) {
    return formatDate(rawValue);
  }

  if (
    fields.includes("transaction_value_snapshot") ||
    fields.includes("transaction_fee_snapshot")
  ) {
    return formatMoney(rawValue);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return rawValue;
}

function getActionLabel(value?: string | null) {
    if (value === "CREATE") return "Tạo mới";
    if (value === "UPDATE") return "Chỉnh sửa";
    if (value === "DELETE") return "Xóa";
    if (value === "IMPORT") return "Import";

    return value || "-";
}

function getActionClass(value?: string | null) {
    if (value === "CREATE") return "bg-emerald-100 text-emerald-700";
    if (value === "UPDATE") return "bg-emerald-100 text-emerald-700";
    if (value === "DELETE") return "bg-red-100 text-red-700";
    if (value === "IMPORT") return "bg-violet-100 text-violet-700";

    return "bg-slate-100 text-slate-600";
}

function shortReason(value?: string | null) {
    if (!value) return "-";

    if (value.length <= 60) return value;

    return `${value.slice(0, 60)}...`;
}
function getAuditReason(log: SaRecordAuditLogItem) {
    const snapshot = getAuditSnapshot(log);
    const value = snapshot.note;

    if (value === null || value === undefined || value === "") {
        return "";
    }

    return String(value);
}
function ReasonModal({
    reason,
    onClose,
}: {
    reason: string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-md bg-white shadow-lg">
                <div className="flex h-12 items-center justify-between border-b px-4">
                    <h3 className="text-sm font-semibold text-slate-800">
                        Lý do chỉnh sửa -
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                    >
                        Đóng
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap p-4 text-sm leading-6 text-slate-700">
                    {reason}
                </div>
            </div>
        </div>
    );
}
function AuditHistoryTab({ recordId }: { recordId: string }) {
    const audit = useSaRecordAuditLogs(recordId);
    const [selectedReason, setSelectedReason] = useState("");

    if (audit.loading) {
        return (
            <div className="rounded border border-slate-200 bg-white p-4 text-xs text-slate-500">
                Đang tải lịch sử chỉnh sửa...
            </div>
        );
    }

    if (audit.error) {
        return (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-xs text-red-600">
                {audit.error}
            </div>
        );
    }

    if (audit.items.length === 0) {
        return (
            <div className="rounded border border-slate-200 bg-white p-4 text-xs text-slate-500">
                Chưa có lịch sử chỉnh sửa.
            </div>
        );
    }

    return (
        <>
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex h-12 items-center justify-between border-b bg-white px-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">
                            Toàn bộ lịch sử chỉnh sửa
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Mỗi dòng là một phiên thay đổi. Ô màu vàng là cột đã được sửa trong phiên đó.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[2600px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
                                <th className="w-[150px] px-4 font-semibold">Thời gian</th>
                                <th className="w-[110px] px-4 font-semibold">Hành động</th>
                                <th className="w-[260px] px-4 font-semibold">Lý do chỉnh sửa</th>

                                {auditColumns.map((column) => (
                                    <th
                                        key={column.label}
                                        className={`${column.width} px-4 font-semibold`}
                                    >
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {audit.items.map((log, index) => {
                                const snapshot = getAuditSnapshot(log);
                                const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";
                                const reason = getAuditReason(log);

                                return (
                                    <tr
                                        key={log.id}
                                        className={`h-[46px] border-b border-slate-200 ${rowBg} align-top hover:bg-emerald-50`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {formatDateTime(log.changed_at || log.created_at)}
                                        </td>

                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold ${getActionClass(log.action_type)}`}
                                            >
                                                {getActionLabel(log.action_type)}
                                            </span>
                                        </td>



                                        <td
                                            className={[
                                                "max-w-[260px] cursor-default px-3 py-3",
                                                reason ? "text-slate-700" : "text-slate-400",
                                            ].join(" ")}
                                            title={reason ? "Double click để xem đầy đủ" : ""}
                                            onDoubleClick={() => {
                                                if (reason) setSelectedReason(reason);
                                            }}
                                        >
                                            <div className="truncate">
                                                {shortReason(reason)}
                                            </div>
                                        </td>

                                        {auditColumns.map((column) => {
                                            const changed = isColumnChanged(log, column.fields);
                                            const value = getFirstValue(snapshot, column.fields);

                                            return (
                                                <td
                                                    key={column.label}
                                                    className={[
                                                        "px-3 py-3",
                                                        changed
                                                            ? "bg-yellow-100 font-semibold text-slate-900 ring-1 ring-inset ring-yellow-300"
                                                            : "",
                                                    ].join(" ")}
                                                >
                                                    <div className="max-w-[220px] truncate">
                                                        {formatAuditCellValue(value, column.fields)}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedReason && (
                <ReasonModal
                    reason={selectedReason}
                    onClose={() => setSelectedReason("")}
                />
            )}
        </>
    );
}

export function SaRecordDetailPage({ recordId }: { recordId: string }) {
    const router = useRouter();
    const detail = useSaRecordDetail(recordId);

    return (
        <DashboardLayout
            breadcrumbs={[
                {
                    label: "TRANG CHỦ",
                    href: "/workspace",
                },
                {
                    label: "Sale Admin",
                    href: "/sale-admin/dashboard",
                },
                {
                    label: "SA Records",
                    href: "/sale-admin/records",
                },
                {
                    label: detail.item?.record_code || "Chi tiết",
                },
            ]}
            rightAction={
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => router.push("/sale-admin/records")}
                        className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <ArrowLeft size={15} />
                        Quay lại
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push(`/sale-admin/records/${recordId}/edit`)}
                        className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669]"
                    >
                        <Edit size={15} />
                        Chỉnh sửa
                    </button>
                </div>
            }
        >
            {detail.loading && (
                <div className="rounded border border-slate-200 bg-white p-4 text-xs text-slate-500">
                    Đang tải chi tiết SA Record...
                </div>
            )}

            {detail.error && (
                <div className="rounded border border-red-200 bg-red-50 p-4 text-xs text-red-600">
                    {detail.error}
                </div>
            )}

            {!detail.loading && !detail.error && detail.item && (
                <div className="space-y-4">
                    <div className="rounded border border-slate-200 bg-white px-4 py-3">
                        <div className="text-sm font-semibold text-slate-800">
                            {detail.item.record_code}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            Số TK: {detail.item.account_no} · KH:{" "}
                            {detail.item.customer_name_snapshot ||
                                detail.item.customer_name ||
                                "-"}
                        </div>
                    </div>

                    <div className="flex border-b border-slate-200">
                        <button
                            type="button"
                            onClick={() => detail.setActiveTab("info")}
                            className={[
                                "h-10 px-4 text-xs font-semibold",
                                detail.activeTab === "info"
                                    ? "border-b-2 border-[#10b981] text-[#059669]"
                                    : "text-slate-500 hover:text-slate-700",
                            ].join(" ")}
                        >
                            Thông tin hiện tại
                        </button>

                        <button
                            type="button"
                            onClick={() => detail.setActiveTab("audit")}
                            className={[
                                "h-10 px-4 text-xs font-semibold",
                                detail.activeTab === "audit"
                                    ? "border-b-2 border-[#10b981] text-[#059669]"
                                    : "text-slate-500 hover:text-slate-700",
                            ].join(" ")}
                        >
                            Lịch sử chỉnh sửa
                        </button>
                    </div>

                    {detail.activeTab === "info" && <CurrentInfoTab item={detail.item} />}

                    {detail.activeTab === "audit" && (
                        <AuditHistoryTab recordId={recordId} />
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}