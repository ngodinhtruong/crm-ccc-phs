"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSaRecords } from "@/hooks/useSaRecords";

import {
  PermissionCode,
  useCurrentUserPermissions,
} from "@/hooks/useCurrentUserPermissions";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { SaRecordItem } from "@/types/sale-admin.type";
import {
    ColumnBooleanFilter,
    ColumnDateRangeFilter,
    ColumnNumberRangeFilter,
    ColumnSelectFilter,
    ColumnTextFilter,
    TablePagination,
    TableState,
} from "@/components/common";

function formatMoney(value?: string | number | null) {
    const numberValue = Number(value || 0);
    if (!numberValue) return "-";

    return new Intl.NumberFormat("vi-VN").format(numberValue);
}

function formatDate(value?: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN").format(date);
}

function BooleanBadge({
    value,
    trueLabel = "Có",
    falseLabel = "Không",
}: {
    value: boolean;
    trueLabel?: string;
    falseLabel?: string;
}) {
    return (
        <span
            className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold ${value
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
                }`}
        >
            {value ? trueLabel : falseLabel}
        </span>
    );
}

function IcpBadge({ item }: { item: SaRecordItem }) {
    if (!item.icp_group_code) {
        return <span className="text-slate-400">-</span>;
    }

    return (
        <span
            className={`inline-flex rounded px-2 py-1 text-[11px] font-bold ${item.icp_group_type === "POTENTIAL"
                ? "bg-emerald-100 text-emerald-700"
                : item.icp_group_type === "NURTURE"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-100 text-slate-600"
                }`}
        >
            {item.icp_group_code}
        </span>
    );
}


export function SaRecordListPage() {
    const router = useRouter();
    const records = useSaRecords();
    const authz = useCurrentUserPermissions();

    const canCreate = authz.hasPermission(PermissionCode.SA_RECORD_CREATE);

    return (
        <DashboardLayout
            breadcrumbs={[
                {
                    label: "TRANG CHỦ",
                    href: "/workspace",
                },
                {
                    label: "Sale Admin",
                },
                {
                    label: "Ghi nhận cuộc gọi",
                },
            ]}
            rightAction={
                canCreate ? (
                    <button
                        type="button"
                        onClick={() => router.push("/sale-admin/records/create")}
                        className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
                    >
                        <Plus size={15} />
                        Thêm SA Record
                    </button>
                ) : null
            }
                    >
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex h-12 items-center justify-between border-b bg-white px-4">
                    <div>
                        <h1 className="text-sm font-semibold text-slate-800">
                            Danh sách SA Records
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <TablePagination
                            fromRecord={records.fromRecord}
                            toRecord={records.toRecord}
                            count={records.count}
                            page={records.page}
                            totalPages={records.totalPages}
                            loading={records.loading}
                            onPrevious={records.previousPage}
                            onNext={records.nextPage}
                        />

                        <button
                            type="button"
                            onClick={records.clearFilter}
                            className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Xóa lọc
                        </button>
                    </div>
                </div>



                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1900px] border-collapse text-left text-xs">
                        <thead>
                            <tr className="h-10 border-b bg-white text-slate-700">
                                <th className="w-[150px] px-3 font-semibold">Mã record</th>
                                <th className="w-[140px] px-3 font-semibold">Số TK lưu ký</th>
                                <th className="w-[180px] px-3 font-semibold">Tên KH</th>
                                <th className="w-[150px] px-3 font-semibold">Tên CN</th>
                                <th className="w-[120px] px-3 font-semibold">Trạng thái</th>
                                <th className="w-[120px] px-3 font-semibold">VIP</th>
                                <th className="w-[150px] px-3 font-semibold">PIC</th>
                                <th className="w-[150px] px-3 font-semibold">Ngày gọi</th>
                                <th className="w-[90px] px-3 font-semibold">Follow</th>
                                <th className="w-[150px] px-3 font-semibold">Kết quả</th>
                                <th className="w-[140px] px-3 font-semibold">Quan tâm</th>
                                <th className="w-[110px] px-3 font-semibold">Nhóm KH</th>
                                <th className="w-[110px] px-3 font-semibold">Giới thiệu SP</th>
                                <th className="w-[110px] px-3 font-semibold">Tái kích hoạt</th>
                                <th className="w-[110px] px-3 font-semibold">Hỗ trợ TT</th>
                                <th className="w-[150px] px-3 font-semibold">Tổng GTGD</th>
                                <th className="w-[130px] px-3 font-semibold">Phí GD</th>
                                <th className="w-[250px] px-3 font-semibold">Ghi chú</th>
                                <th className="w-[140px] px-3 font-semibold">Bàn giao MG</th>
                            </tr>

                            <tr className="border-b bg-[#f8fafc] align-top">
                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.recordCode}
                                        onChange={records.setRecordCode}
                                        placeholder="Mã"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.accountNo}
                                        onChange={records.setAccountNo}
                                        placeholder="Số TK"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.customerName}
                                        onChange={records.setCustomerName}
                                        placeholder="Tên KH"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.branchName}
                                        onChange={records.setBranchName}
                                        placeholder="Tên CN"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.accountStatus}
                                        onChange={records.setAccountStatus}
                                        placeholder="Trạng thái"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.vipClassification}
                                        onChange={records.setVipClassification}
                                        placeholder="VIP"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.pic}
                                        onChange={records.setPic}
                                        placeholder="PIC"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnDateRangeFilter
                                        fromValue={records.callDateFrom}
                                        toValue={records.callDateTo}
                                        onFromChange={records.setCallDateFrom}
                                        onToChange={records.setCallDateTo}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        type="number"
                                        value={records.followNo}
                                        onChange={records.setFollowNo}
                                        placeholder="Lần"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnSelectFilter
                                        value={records.callResult}
                                        onChange={records.setCallResult}
                                        options={records.callResults.map((item) => ({
                                            label: item.result_name,
                                            value: String(item.id),
                                        }))}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnSelectFilter
                                        value={records.interestLevel}
                                        onChange={records.setInterestLevel}
                                        options={records.interestLevels.map((item) => ({
                                            label: item.level_name,
                                            value: String(item.id),
                                        }))}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnSelectFilter
                                        value={records.icpGroup}
                                        onChange={records.setIcpGroup}
                                        options={records.icpGroups.map((item) => ({
                                            label: `${item.icp_code} - ${item.icp_name}`,
                                            value: String(item.id),
                                        }))}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnBooleanFilter
                                        value={records.introducedProduct}
                                        onChange={records.setIntroducedProduct}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnBooleanFilter
                                        value={records.reactivation}
                                        onChange={records.setReactivation}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnBooleanFilter
                                        value={records.supportInfo}
                                        onChange={records.setSupportInfo}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnNumberRangeFilter
                                        minValue={records.transactionValueMin}
                                        maxValue={records.transactionValueMax}
                                        onMinChange={records.setTransactionValueMin}
                                        onMaxChange={records.setTransactionValueMax}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnNumberRangeFilter
                                        minValue={records.transactionFeeMin}
                                        maxValue={records.transactionFeeMax}
                                        onMinChange={records.setTransactionFeeMin}
                                        onMaxChange={records.setTransactionFeeMax}
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnTextFilter
                                        value={records.note}
                                        onChange={records.setNote}
                                        placeholder="Ghi chú"
                                    />
                                </th>

                                <th className="px-2 py-2">
                                    <ColumnBooleanFilter
                                        value={records.handoverToBroker}
                                        onChange={records.setHandoverToBroker}
                                    />
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            <TableState
                                loading={records.loading}
                                error={records.error}
                                empty={!records.loading && !records.error && records.items.length === 0}
                                colSpan={19}
                                emptyText="Không có dữ liệu SA Record."
                            />
                            {!records.loading &&
                                !records.error &&
                                records.items.map((item, index) => {
                                    const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                                        >
                                            <td className="px-3 font-semibold text-sky-600">
                                                {item.record_code}
                                            </td>
                                            <td className="px-3 font-semibold">{item.account_no}</td>
                                            <td className="px-3">
                                                {item.customer_name_snapshot || item.customer_name || "-"}
                                            </td>
                                            <td className="px-3">
                                                {item.branch_name_snapshot || item.branch_name || "-"}
                                            </td>
                                            <td className="px-3">{item.account_status || "-"}</td>
                                            <td className="px-3">{item.vip_classification || "-"}</td>
                                            <td className="px-3">
                                                {item.pic_name_snapshot ||
                                                    item.pic_user_name ||
                                                    item.pic_employee_name ||
                                                    "-"}
                                            </td>
                                            <td className="px-3">{formatDate(item.call_date)}</td>
                                            <td className="px-3">{item.follow_no}</td>
                                            <td className="px-3">{item.call_result_name || "-"}</td>
                                            <td className="px-3">
                                                {item.interest_level_name || "-"}
                                            </td>
                                            <td className="px-3">
                                                <IcpBadge item={item} />
                                            </td>
                                            <td className="px-3">
                                                <BooleanBadge value={item.introduced_product} />
                                            </td>
                                            <td className="px-3">
                                                <BooleanBadge value={item.reactivation} />
                                            </td>
                                            <td className="px-3">
                                                <BooleanBadge value={item.support_info} />
                                            </td>
                                            <td className="px-3 text-right font-semibold">
                                                {formatMoney(item.transaction_value_snapshot)}
                                            </td>
                                            <td className="px-3 text-right font-semibold">
                                                {formatMoney(item.transaction_fee_snapshot)}
                                            </td>
                                            <td className="max-w-[250px] truncate px-3">
                                                {item.note || "-"}
                                            </td>
                                            <td className="px-3">
                                                <BooleanBadge
                                                    value={item.handover_to_broker || item.referred_rm}
                                                />
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