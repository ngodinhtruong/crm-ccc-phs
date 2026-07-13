"use client";

import {
    SaRecordFormController,
    SaRecordFormMode,
} from "@/types/sale-admin.type";
import {
    CheckboxInput,
    FieldLabel,
    SelectInput,
    TextInput,
} from "./SaRecordCreateFormControls";

type SaRecordCreateController = SaRecordFormController;



export function SaRecordAccountSection({
    create,
}: {
    create: SaRecordCreateController;
}) {
    return (
        <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                Thông tin tài khoản
            </h2>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3">
                    <FieldLabel required>Số TK KH</FieldLabel>
                    <TextInput
                        value={create.form.accountNo}
                        onChange={(value) => create.setField("accountNo", value)}
                        placeholder="VD: 058C..."
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Tên khách hàng</FieldLabel>
                    <TextInput
                        value={create.form.customerNameSnapshot}
                        onChange={(value) =>
                            create.setField("customerNameSnapshot", value)
                        }
                        placeholder="Tên KH snapshot"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Chi nhánh</FieldLabel>
                    <TextInput
                        value={create.form.branchNameSnapshot}
                        readOnly
                    // placeholder="Tự động theo chi nhánh của SA"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Tên PIC</FieldLabel>
                    <TextInput
                        value={create.form.picNameSnapshot}
                        readOnly
                    // placeholder="Tự động theo hồ sơ người dùng SA"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Trạng thái tài khoản</FieldLabel>
                    <TextInput
                        value={create.form.accountStatus}
                        onChange={(value) => create.setField("accountStatus", value)}
                        placeholder="ACTIVE / INACTIVE..."
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Phân loại VIP</FieldLabel>
                    <TextInput
                        value={create.form.vipClassification}
                        onChange={(value) =>
                            create.setField("vipClassification", value)
                        }
                        placeholder="VIP / NORMAL..."
                    />
                </div>
            </div>
        </section>
    );
}

export function SaRecordCallSection({
    create,
}: {
    create: SaRecordCreateController;
}) {
    return (
        <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                Thông tin cuộc gọi
            </h2>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3">
                    <FieldLabel required>Ngày gọi</FieldLabel>
                    <TextInput
                        type="date"
                        value={create.form.callDate}
                        onChange={(value) => create.setField("callDate", value)}
                    />
                </div>

                <div className="col-span-12 md:col-span-2">
                    <FieldLabel required>Lần follow</FieldLabel>
                    <TextInput
                        type="number"
                        value={create.form.followNo}
                        onChange={(value) => create.setField("followNo", value)}
                        placeholder="1"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel required>Kết quả cuộc gọi</FieldLabel>
                    <SelectInput
                        value={create.form.callResult}
                        onChange={(value) => create.setField("callResult", value)}
                    >
                        <option value="">
                            {create.loadingMaster ? "Đang tải..." : "Chọn kết quả"}
                        </option>

                        {create.callResults.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.result_name}
                            </option>
                        ))}
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-2">
                    <FieldLabel>Mức độ quan tâm</FieldLabel>
                    <SelectInput
                        value={create.form.interestLevel}
                        onChange={(value) => create.setField("interestLevel", value)}
                    >
                        <option value="">Không chọn</option>

                        {create.interestLevels.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.level_name}
                            </option>
                        ))}
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-2">
                    <FieldLabel>Nhóm KH ICP</FieldLabel>
                    <SelectInput
                        value={create.form.icpGroup}
                        onChange={(value) => create.setField("icpGroup", value)}
                    >
                        <option value="">Không chọn</option>

                        {create.icpGroups.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.icp_code} - {item.icp_name}
                            </option>
                        ))}
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-3">
                    <CheckboxInput
                        checked={create.form.reactivation}
                        onChange={(value) => create.setField("reactivation", value)}
                        label="Cờ hiệu tái kích hoạt"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <CheckboxInput
                        checked={create.form.introducedProduct}
                        onChange={(value) =>
                            create.setField("introducedProduct", value)
                        }
                        label="Giới thiệu sản phẩm"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <CheckboxInput
                        checked={create.form.supportInfo}
                        onChange={(value) => create.setField("supportInfo", value)}
                        label="Hỗ trợ thông tin"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <CheckboxInput
                        checked={create.form.referredRm}
                        onChange={(value) => create.setField("referredRm", value)}
                        label="Chuyển RM/MG"
                    />
                </div>
            </div>
        </section>
    );
}

export function SaRecordTransactionSection({
    create,
    mode = "create",
}: {
    create: SaRecordCreateController;
    mode?: SaRecordFormMode;
}) {

    return (
        <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                Giao dịch và bàn giao
            </h2>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Giá trị giao dịch</FieldLabel>
                    <TextInput
                        type="number"
                        value={create.form.transactionValueSnapshot}
                        onChange={(value) =>
                            create.setField("transactionValueSnapshot", value)
                        }
                        placeholder="Điền sau khi xác nhận tái kích hoạt"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Phí giao dịch</FieldLabel>
                    <TextInput
                        type="number"
                        value={create.form.transactionFeeSnapshot}
                        onChange={(value) =>
                            create.setField("transactionFeeSnapshot", value)
                        }
                        placeholder="Điền sau khi xác nhận tái kích hoạt"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <CheckboxInput
                        checked={create.form.handoverToBroker}
                        onChange={(value) =>
                            create.setField("handoverToBroker", value)
                        }
                        label="Bàn giao môi giới"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Ghi chú bàn giao</FieldLabel>
                    <TextInput
                        value={create.form.brokerHandoverNote}
                        onChange={(value) =>
                            create.setField("brokerHandoverNote", value)
                        }
                        placeholder="Ghi chú bàn giao"
                    />
                </div>

                <div className="col-span-12">
                    <FieldLabel>
                        {mode === "edit" ? "Lý do chỉnh sửa" : "Ghi chú"}
                    </FieldLabel>

                    <textarea
                        value={create.form.note}
                        onChange={(event) =>
                            create.setField("note", event.target.value)
                        }
                        rows={4}
                        placeholder={
                            mode === "edit"
                                ? "Nhập lý do chỉnh sửa. Có thể để trống."
                                : "Nhập ghi chú tự do..."
                        }
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                </div>
            </div>

        </section>
    );
}