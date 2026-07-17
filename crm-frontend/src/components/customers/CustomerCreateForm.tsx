"use client";

import { Plus, Search } from "lucide-react";
import { UserAssigneeCombobox } from "@/components/common";
import {
  CustomerDateInput,
  CustomerFormField,
} from "@/components/customers/CustomerFormField";
import { UseCustomerCreateReturn } from "@/hooks/useCustomerCreate";
import {
  getBranchName,
  getOptionName,
} from "@/utils/customer-option.util";

export function CustomerCreateForm({
  customerCreate,
}: {
  customerCreate: UseCustomerCreateReturn;
}) {
  const {
    form,
    setField,
    branches,
    customerTypes,
    companies,
    sources,
    ratings,
    membershipTiers,

    assigneeUsers = [],
    assigneeLoading,
    assigneeError,

    saving,
    submit,
    cancel,
  } = customerCreate;

  return (
    <form onSubmit={submit} className="pb-16">
      <section className="mb-3 overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Thông tin chung
        </div>

        <div className="grid grid-cols-1 gap-x-12 gap-y-4 p-4 lg:grid-cols-2">
          <div className="grid grid-cols-[150px_1fr] items-center gap-3">
            <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
              Họ và tên <span className="text-red-500">*</span>
            </label>

            <div className="flex gap-2">
              <select
                value={form.genderPrefix}
                onChange={(event) =>
                  setField("genderPrefix", event.target.value)
                }
                className="h-9 w-20 rounded border px-2 text-xs"
              >
                <option value="Anh">Anh</option>
                <option value="Chị">Chị</option>
                <option value="Ông">Ông</option>
                <option value="Bà">Bà</option>
              </select>

              <input
                value={form.fullName}
                onChange={(event) => setField("fullName", event.target.value)}
                className="h-9 flex-1 rounded border px-3 text-xs outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <CustomerFormField label="Loại">
            <select
              value={form.customerType}
              onChange={(event) => setField("customerType", event.target.value)}
              className="h-9 rounded border px-3 text-xs"
            >
              <option value="">Chọn loại khách hàng</option>

              {customerTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {getOptionName(item, [
                    "type_name",
                    "customer_type_name",
                    "name",
                  ])}
                </option>
              ))}
            </select>
          </CustomerFormField>

          <CustomerFormField label="CMND/CCCD">
            <input
              value={form.identityNumber}
              onChange={(event) =>
                setField("identityNumber", event.target.value)
              }
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
            />
          </CustomerFormField>

          <CustomerFormField label="Số tài khoản">
            <input
              value={form.accountNumber}
              onChange={(event) =>
                setField(
                  "accountNumber",
                  event.target.value.toUpperCase().slice(0, 10)
                )
              }
              maxLength={10}
              placeholder="10 ký tự chữ + số"
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
            />
          </CustomerFormField>

          <CustomerFormField label="Ngày sinh">
            <CustomerDateInput
              value={form.birthDate}
              onChange={(value) => setField("birthDate", value)}
            />
          </CustomerFormField>

          <CustomerFormField label="Chi nhánh">
            <select
              value={form.branch}
              onChange={(event) => setField("branch", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            >
              <option value="">Chọn chi nhánh</option>

              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {getBranchName(item)}
                </option>
              ))}
            </select>
          </CustomerFormField>

          <CustomerFormField label="Giới tính">
            <select
              value={form.gender}
              onChange={(event) => setField("gender", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            >
              <option value="">Chọn một giá trị</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </CustomerFormField>

          <CustomerFormField label="Ngày mở tài khoản">
            <CustomerDateInput
              value={form.openedDate}
              onChange={(value) => setField("openedDate", value)}
            />
          </CustomerFormField>

          <CustomerFormField label="Di động" required>
            <input
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
            />
          </CustomerFormField>

          <CustomerFormField label="Môi giới">
            <input
              value={form.referrer}
              onChange={(event) => setField("referrer", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
            />
          </CustomerFormField>

          <CustomerFormField label="Email">
            <input
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
            />
          </CustomerFormField>

          <CustomerFormField label="Công ty">
            <div className="flex">
              <select
                value={form.company}
                onChange={(event) => setField("company", event.target.value)}
                className="h-9 flex-1 rounded-l border px-3 text-xs"
              >
                <option value="">Nhập để tìm kiếm</option>

                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getOptionName(item, ["company_name", "name"])}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center border-y border-r bg-slate-50"
              >
                <Search size={14} />
              </button>

              <button
                type="button"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded border bg-slate-50"
              >
                <Plus size={14} />
              </button>
            </div>
          </CustomerFormField>
        </div>
      </section>

      <section className="mb-3 overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Thông tin địa chỉ
        </div>

        <div className="grid grid-cols-1 gap-x-12 gap-y-4 p-4 lg:grid-cols-2">
          <CustomerFormField label="Địa chỉ">
            <input
              value={form.address}
              onChange={(event) => setField("address", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            />
          </CustomerFormField>

          <CustomerFormField label="Quốc gia">
            <input
              value={form.country}
              onChange={(event) => setField("country", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            />
          </CustomerFormField>

          <CustomerFormField label="Tỉnh/TP">
            <input
              value={form.province}
              onChange={(event) => setField("province", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            />
          </CustomerFormField>

          <CustomerFormField label="Quận/Huyện">
            <input
              value={form.district}
              onChange={(event) => setField("district", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            />
          </CustomerFormField>
        </div>
      </section>

      <section className="mb-3 overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Thông tin mô tả
        </div>

        <div className="grid grid-cols-[150px_1fr] items-start gap-3 p-4">
          <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
            Mô tả
          </label>

          <textarea
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            rows={3}
            className="w-full rounded border px-3 py-2 text-xs outline-none focus:border-sky-400"
          />
        </div>
      </section>

      <section className="mb-16 overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Thông tin quản lý
        </div>

        <div className="grid grid-cols-1 gap-x-12 gap-y-4 p-4 lg:grid-cols-2">
          <CustomerFormField label="Giao cho" required>
            <div>
              <UserAssigneeCombobox
                users={assigneeUsers}
                value={form.assignedTo}
                label={form.assignedToLabel}
                placeholder="Nhập tên/email nhân viên phụ trách..."
                onChange={(userId, label) => {
                  setField("assignedTo", userId);
                  setField("assignedToLabel", label);
                }}
              />

              {assigneeLoading && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Đang tải danh sách nhân viên...
                </p>
              )}

              {assigneeError && (
                <p className="mt-1 text-[11px] text-red-500">
                  {assigneeError}
                </p>
              )}
            </div>
          </CustomerFormField>

          <CustomerFormField label="Đánh giá">
            <select
              value={form.rating}
              onChange={(event) => setField("rating", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            >
              <option value="">Chọn đánh giá</option>

              {ratings.map((item) => (
                <option key={item.id} value={item.id}>
                  {getOptionName(item, ["rating_name", "name"])}
                </option>
              ))}
            </select>
          </CustomerFormField>

          <CustomerFormField label="Nguồn">
            <select
              value={form.source}
              onChange={(event) => setField("source", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs"
            >
              <option value="">Chọn một giá trị</option>

              {sources.map((item) => (
                <option key={item.id} value={item.id}>
                  {getOptionName(item, ["source_name", "name"])}
                </option>
              ))}
            </select>
          </CustomerFormField>

          <CustomerFormField label="Hạng thành viên">
            <select
              value={form.membershipTier}
              onChange={(event) =>
                setField("membershipTier", event.target.value)
              }
              className="h-9 w-full rounded border px-3 text-xs"
            >
              <option value="">Chọn một tùy chọn</option>

              {membershipTiers.map((item) => (
                <option key={item.id} value={item.id}>
                  {getOptionName(item, ["tier_name", "name"])}
                </option>
              ))}
            </select>
          </CustomerFormField>
        </div>
      </section>

      <div className="fixed bottom-0 left-10 right-0 z-20 flex h-14 items-center justify-center gap-2 border-t bg-white">
        <button
          type="button"
          onClick={cancel}
          className="h-9 rounded border bg-white px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Hủy bỏ
        </button>

        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded bg-[#0097cf] px-7 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}