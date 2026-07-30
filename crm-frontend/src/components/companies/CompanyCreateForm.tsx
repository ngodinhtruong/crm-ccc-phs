"use client";

import { Search } from "lucide-react";

import { EmployeeCombobox } from "@/components/companies/EmployeeCombobox";
import {
  CompanyDateInput,
  CompanyFormField,
  CompanyFormSection,
} from "@/components/companies/CompanyFormField";
import { UseCompanyCreateReturn } from "@/hooks/useCompanyCreate";
import { getCompanyOptionName } from "@/utils/company-option.util";

export function CompanyCreateForm({
  companyCreate,
}: {
  companyCreate: UseCompanyCreateReturn;
}) {
  const {
    form,
    setField,
    sources,
    ratings,
    membershipTiers,
    filteredEmployees,
    employeeDropdownOpen,
    setEmployeeDropdownOpen,
    selectEmployee,
    clearEmployee,
    saving,
    submit,
    cancel,
  } = companyCreate;

  return (
    <form onSubmit={submit} className="pb-24">
      <CompanyFormSection title="Thông tin chung">
        <div className="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-2">
          <CompanyFormField label="Tên công ty" required>
            <input
              value={form.companyName}
              onChange={(event) => setField("companyName", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Người liên hệ chính">
            <div className="flex">
              <input
                disabled
                placeholder="Lưu công ty trước, sau đó chọn người liên hệ"
                className="h-9 flex-1 rounded-l border bg-slate-50 px-3 text-xs text-slate-500"
              />

              <button
                type="button"
                disabled
                className="flex h-9 w-9 items-center justify-center rounded-r border-y border-r bg-slate-100 text-slate-400"
              >
                <Search size={14} />
              </button>
            </div>
          </CompanyFormField>

          <CompanyFormField label="Điện thoại">
            <input
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Số tài khoản">
            <input
              value={form.accountNumber}
              maxLength={10}
              onChange={(event) =>
                setField(
                  "accountNumber",
                  event.target.value.toUpperCase().slice(0, 10)
                )
              }
              placeholder="10 ký tự chữ + số"
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Email">
            <input
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Ngày mở tài khoản">
            <CompanyDateInput
              value={form.openedAt}
              onChange={(value) => setField("openedAt", value)}
            />
          </CompanyFormField>

          <CompanyFormField label="Website">
            <input
              value={form.website}
              onChange={(event) => setField("website", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Mã số thuế">
            <input
              value={form.taxCode}
              onChange={(event) => setField("taxCode", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Fax">
            <input
              value={form.fax}
              onChange={(event) => setField("fax", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Nguồn">
            <select
              value={form.source}
              onChange={(event) => setField("source", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            >
              <option value="">Chọn một giá trị</option>

              {sources.map((item) => (
                <option key={item.id} value={item.id}>
                  {getCompanyOptionName(item, ["source_name", "name"])}
                </option>
              ))}
            </select>
          </CompanyFormField>
        </div>
      </CompanyFormSection>

      <CompanyFormSection title="Thông tin địa chỉ">
        <div className="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-2">
          <CompanyFormField label="Địa chỉ">
            <input
              value={form.address}
              onChange={(event) => setField("address", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Quốc gia">
            <input
              value={form.country}
              onChange={(event) => setField("country", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Tỉnh/TP">
            <input
              value={form.province}
              onChange={(event) => setField("province", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>

          <CompanyFormField label="Quận/Huyện">
            <input
              value={form.district}
              onChange={(event) => setField("district", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            />
          </CompanyFormField>
        </div>
      </CompanyFormSection>

      <CompanyFormSection title="Thông tin mô tả">
        <div className="grid grid-cols-[150px_1fr] items-start gap-3">
          <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
            Mô tả
          </label>

          <textarea
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            rows={3}
            className="w-full rounded border px-3 py-2 text-xs outline-none focus:border-emerald-500"
          />
        </div>
      </CompanyFormSection>

      <CompanyFormSection title="Thông tin quản lý">
        <div className="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-2">
          <CompanyFormField label="Giao cho" required>
            <EmployeeCombobox
              value={form.employeeSearch}
              selectedEmployee={form.assignedEmployee}
              open={employeeDropdownOpen}
              employees={filteredEmployees}
              onOpenChange={setEmployeeDropdownOpen}
              onSearchChange={(value) => {
                setField("employeeSearch", value);
                setField("assignedEmployee", "");
              }}
              onSelect={selectEmployee}
              onClear={clearEmployee}
            />
          </CompanyFormField>

          <CompanyFormField label="Hạng thành viên">
            <select
              value={form.membershipTier}
              onChange={(event) =>
                setField("membershipTier", event.target.value)
              }
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            >
              <option value="">Chọn một tùy chọn</option>

              {membershipTiers.map((item) => (
                <option key={item.id} value={item.id}>
                  {getCompanyOptionName(item, ["tier_name", "name"])}
                </option>
              ))}
            </select>
          </CompanyFormField>

          <CompanyFormField label="Đánh giá">
            <select
              value={form.rating}
              onChange={(event) => setField("rating", event.target.value)}
              className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-emerald-500"
            >
              <option value="">Chọn đánh giá</option>

              {ratings.map((item) => (
                <option key={item.id} value={item.id}>
                  {getCompanyOptionName(item, ["rating_name", "name"])}
                </option>
              ))}
            </select>
          </CompanyFormField>
        </div>
      </CompanyFormSection>

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
          className="h-9 rounded bg-[#10b981] px-7 text-xs font-semibold text-white hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}