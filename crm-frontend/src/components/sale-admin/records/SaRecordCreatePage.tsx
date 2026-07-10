"use client";

import { ArrowLeft, Save } from "lucide-react";

import { useSaRecordCreate } from "@/hooks/useSaRecordCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-slate-600">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
    >
      {children}
    </select>
  );
}

function CheckboxInput({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex h-9 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function SaRecordCreatePage() {
  const create = useSaRecordCreate();

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
          href: "/sale-admin/records",
        },
        {
          label: "Thêm SA Record",
        },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={create.cancel}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
            Quay lại
          </button>

          <button
            type="button"
            onClick={create.submit}
            disabled={create.submitting}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} />
            {create.submitting ? "Đang lưu..." : "Lưu SA Record"}
          </button>
        </div>
      }
    >
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h1 className="text-sm font-semibold text-slate-800">
            Thêm SA Record
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Ghi nhận cuộc gọi Sale Admin cho khách hàng/tài khoản.
          </p>
        </div>

        {create.masterError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {create.masterError}
          </div>
        )}

        {create.error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {create.error}
          </div>
        )}

        <div className="space-y-6 p-4">
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
              Thông tin tài khoản
            </h2>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-3">
                <FieldLabel required>Số TK lưu ký</FieldLabel>
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
                  onChange={(value) =>
                    create.setField("branchNameSnapshot", value)
                  }
                  placeholder="Tên chi nhánh"
                />
              </div>

              <div className="col-span-12 md:col-span-3">
                <FieldLabel>PIC</FieldLabel>
                <TextInput
                  value={create.form.picNameSnapshot}
                  onChange={(value) =>
                    create.setField("picNameSnapshot", value)
                  }
                  placeholder="Tên PIC"
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
                <FieldLabel>Mức quan tâm</FieldLabel>
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
                <FieldLabel>Nhóm ICP</FieldLabel>
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
                  checked={create.form.introducedProduct}
                  onChange={(value) =>
                    create.setField("introducedProduct", value)
                  }
                  label="Đã giới thiệu sản phẩm"
                />
              </div>

              <div className="col-span-12 md:col-span-3">
                <CheckboxInput
                  checked={create.form.reactivation}
                  onChange={(value) => create.setField("reactivation", value)}
                  label="Tái kích hoạt"
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

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
              Giao dịch và bàn giao
            </h2>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-3">
                <FieldLabel>Tổng giá trị giao dịch</FieldLabel>
                <TextInput
                  type="number"
                  value={create.form.transactionValueSnapshot}
                  onChange={(value) =>
                    create.setField("transactionValueSnapshot", value)
                  }
                  placeholder="0"
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
                  placeholder="0"
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
                <FieldLabel>Ghi chú cuộc gọi</FieldLabel>
                <textarea
                  value={create.form.note}
                  onChange={(event) =>
                    create.setField("note", event.target.value)
                  }
                  rows={4}
                  placeholder="Nhập ghi chú..."
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={create.cancel}
              className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={create.submit}
              disabled={create.submitting}
              className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {create.submitting ? "Đang lưu..." : "Lưu SA Record"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}