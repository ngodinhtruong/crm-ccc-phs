"use client";

import {
    SlaFormField,
    SlaFormSection,
} from "@/components/sla/SlaFormField";
import { UseSlaCreateReturn } from "@/hooks/useSlaCreate";
import { getSlaOptionName } from "@/utils/sla-option.util";
import { UserAssigneeCombobox } from "@/components/common/UserAssigneeCombobox";


export function SlaCreateForm({
    slaCreate,
}: {
    slaCreate: UseSlaCreateReturn;
}) {
    const {
        form,
        setField,
        ticketCategories,
        processingUnits,
        users,
        saving,
        submit,
        cancel,
    } = slaCreate;

    return (
        <form onSubmit={submit} className="pb-20">
            <SlaFormSection title="Thông tin chung" className='z-30'>
                <div className="grid grid-cols-1 gap-x-16 gap-y-3 lg:grid-cols-2">
                    <SlaFormField label="Tên" required>
                        <input
                            value={form.policyName}
                            onChange={(event) => setField("policyName", event.target.value)}
                            placeholder="Nhập tên SLA"
                            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                        />
                    </SlaFormField>

                    <SlaFormField label="Danh mục Ticket" required>
                        <select
                            value={form.ticketCategory}
                            onChange={(event) =>
                                setField("ticketCategory", event.target.value)
                            }
                            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                        >
                            <option value="">Chọn danh mục Ticket</option>

                            {ticketCategories.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {getSlaOptionName(item, [
                                        "support_category_name",
                                        "category_name",
                                        "ticket_category_name",
                                        "name",
                                    ])}
                                </option>
                            ))}
                        </select>
                    </SlaFormField>

                    <SlaFormField label="Thời gian xử lý tiêu chuẩn" required>
                        <input
                            type="number"
                            min={1}
                            value={form.targetTimeValue}
                            onChange={(event) =>
                                setField("targetTimeValue", event.target.value)
                            }
                            placeholder="Ví dụ: 30"
                            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                        />
                    </SlaFormField>

                    <SlaFormField label="Đơn vị">
                        <select
                            value={form.targetTimeUnit}
                            onChange={(event) =>
                                setField(
                                    "targetTimeUnit",
                                    event.target.value as typeof form.targetTimeUnit
                                )
                            }
                            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                        >
                            <option value="MINUTE">Phút</option>
                            <option value="HOUR">Giờ</option>
                            <option value="DAY">Ngày</option>
                        </select>
                    </SlaFormField>

                    <SlaFormField label="Phân công xử lý" required>
                        <select
                            value={form.processingUnit}
                            onChange={(event) =>
                                setField("processingUnit", event.target.value)
                            }
                            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                        >
                            <option value="">Chọn bộ phận xử lý</option>

                            {processingUnits.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {getSlaOptionName(item, [
                                        "processing_unit_name",
                                        "unit_name",
                                        "department_name",
                                        "name",
                                    ])}
                                </option>
                            ))}
                        </select>
                    </SlaFormField>

                    <SlaFormField label="Giao cho" required>
                        <UserAssigneeCombobox
                            users={users}
                            value={form.assignedTo}
                            label={form.assignedToLabel}
                            onChange={(userId, nextLabel) => {
                                setField("assignedTo", userId);
                                setField("assignedToLabel", nextLabel);
                            }}
                        />
                    </SlaFormField>
                </div>
            </SlaFormSection>

            <SlaFormSection title="Thông tin mô tả" className='z-0'>
                <div className="grid grid-cols-[210px_1fr] items-start">
                    <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
                        Mô tả
                    </label>

                    <div className="pl-3">
                        <textarea
                            value={form.description}
                            onChange={(event) => setField("description", event.target.value)}
                            rows={4}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
                        />
                    </div>
                </div>
            </SlaFormSection>

            <div className="fixed bottom-0 left-10 right-0 z-20 flex h-14 items-center justify-center gap-3 border-t bg-white">
                <button
                    type="submit"
                    disabled={saving}
                    className="h-9 rounded bg-emerald-500 px-7 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? "Đang lưu..." : "Lưu"}
                </button>

                <button
                    type="button"
                    onClick={cancel}
                    className="h-9 rounded px-4 text-xs font-semibold text-red-500 hover:bg-red-50"
                >
                    Hủy bỏ
                </button>
            </div>
        </form>
    );
}