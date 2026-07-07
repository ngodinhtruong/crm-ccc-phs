"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Search, Settings } from "lucide-react";

import { authService } from "@/services/auth.service";
import {
  companyService,
  SelectOption,
} from "@/services/company.service";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";

function getOptionName(option: SelectOption, keys: string[]) {
  for (const key of keys) {
    if (option[key]) return String(option[key]);
  }

  return String(option.id);
}
function getEmployeeLabel(option: SelectOption) {
  const name = getOptionName(option, [
    "full_name",
    "employee_name",
    "name",
    "username",
  ]);

  const code = option.employee_code ? ` - ${option.employee_code}` : "";
  const branch = option.branch_name ? ` (${option.branch_name})` : "";

  return `${name}${code}${branch}`;
}
export default function CompanyCreatePage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

  const [sources, setSources] = useState<SelectOption[]>([]);
  const [ratings, setRatings] = useState<SelectOption[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<SelectOption[]>([]);
  const [employees, setEmployees] = useState<SelectOption[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [fax, setFax] = useState("");

  const [accountNumber, setAccountNumber] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [source, setSource] = useState("");

  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");

  const [description, setDescription] = useState("");

  const [assignedEmployee, setAssignedEmployee] = useState("");

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [rating, setRating] = useState("");
  const [membershipTier, setMembershipTier] = useState("");

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  const filteredEmployees = useMemo(() => {
    const keyword = employeeSearch.trim().toLowerCase();

    if (!keyword) {
      return employees.slice(0, 20);
    }

    return employees
      .filter((item) => {
        const label = getEmployeeLabel(item).toLowerCase();
        const code = String(item.employee_code || "").toLowerCase();
        const branch = String(item.branch_name || "").toLowerCase();
        const department = String(item.department || "").toLowerCase();

        return (
          label.includes(keyword) ||
          code.includes(keyword) ||
          branch.includes(keyword) ||
          department.includes(keyword)
        );
      })
      .slice(0, 20);
  }, [employeeSearch, employees]);
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const loadDropdowns = async () => {
      try {
        setLoadingDropdowns(true);
        setError("");

        const [sourceData, ratingData, tierData, employeeData] =
          await Promise.all([
            companyService.getSources(),
            companyService.getRatings(),
            companyService.getMembershipTiers(),
            companyService.getEmployees(),
          ]);

        setSources(sourceData);
        setRatings(ratingData);
        setMembershipTiers(tierData);
        setEmployees(employeeData);
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message;

        setError(`Không tải được dropdown. Status: ${status} - ${detail}`);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadDropdowns();
  }, [router]);

  const validateForm = () => {
    if (!companyName.trim()) {
      return "Tên công ty không được để trống.";
    }
    if (!assignedEmployee) {
      return "Vui lòng chọn nhân viên phụ trách.";
    }

    if (accountNumber.trim()) {
      if (!/^[A-Za-z0-9]{10}$/.test(accountNumber.trim())) {
        return "Số tài khoản phải gồm đúng 10 ký tự, chỉ bao gồm chữ và số.";
      }
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const message = validateForm();

      if (message) {
        setError(message);
        return;
      }

      const createdCompany = await companyService.createCompany({
        company_name: companyName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        fax: fax.trim() || undefined,

        account_number: accountNumber.trim() || undefined,
        opened_at: openedAt || undefined,
        tax_code: taxCode.trim() || undefined,

        source: source ? Number(source) : null,
        rating: rating ? Number(rating) : null,
        membership_tier: membershipTier ? Number(membershipTier) : null,
        assigned_employee: assignedEmployee ? Number(assignedEmployee) : null,

        address: address.trim() || undefined,
        country: country.trim() || undefined,
        province: province.trim() || undefined,
        district: district.trim() || undefined,

        description: description.trim() || undefined,
        status: "ACTIVE",
      });

      router.push(`/companies/${createdCompany.id}`);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message;

      setError(`Lưu công ty thất bại. Status: ${status} - ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eef2f5] text-slate-800">
      <MainNavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <DashboardTopbar onMenuClick={() => setMenuOpen(true)} />

      <DashboardSidebar
        open={settingsSidebarOpen}
        onClose={() => setSettingsSidebarOpen(false)}
      />

      <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-56px)] w-10 bg-[#263747]">
        <button
          type="button"
          onClick={() => setSettingsSidebarOpen(true)}
          className="flex h-10 w-full items-center justify-center bg-[#1d2c39] text-white hover:bg-orange-500"
        >
          <Settings size={22} />
        </button>
      </aside>

      <section className="min-h-screen pl-10 pt-14">
        <div className="flex h-11 items-center border-b bg-white px-4">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Link
              href="/"
              className="font-medium text-slate-700 hover:text-orange-500"
            >
              TRANG CHỦ
            </Link>
            <span>&gt;</span>
            <Link href="/companies" className="font-medium hover:text-orange-500">
              CÔNG TY
            </Link>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">Thêm mới</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3 pb-24">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {loadingDropdowns && (
            <div className="mb-3 rounded-md border bg-white px-4 py-3 text-sm text-slate-500">
              Đang tải dropdown...
            </div>
          )}

          <FormSection title="Thông tin chung">
            <div className="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-2">
              <Field label="Tên công ty" required>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Người liên hệ chính">
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
              </Field>

              <Field label="Điện thoại">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Số tài khoản">
                <input
                  value={accountNumber}
                  maxLength={10}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="10 ký tự chữ + số"
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Ngày mở tài khoản">
                <DateInput value={openedAt} onChange={setOpenedAt} />
              </Field>

              <Field label="Website">
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Mã số thuế">
                <input
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Fax">
                <input
                  value={fax}
                  onChange={(e) => setFax(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Nguồn">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                >
                  <option value="">Chọn một giá trị</option>
                  {sources.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionName(item, ["source_name", "name"])}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection title="Thông tin địa chỉ">
            <div className="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-2">
              <Field label="Địa chỉ">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Quốc gia">
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Tỉnh/TP">
                <input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Quận/Huyện">
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Thông tin mô tả">
            <div className="grid grid-cols-[150px_1fr] items-start gap-3">
              <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
                Mô tả
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border px-3 py-2 text-xs outline-none focus:border-sky-400"
              />
            </div>
          </FormSection>

          <FormSection title="Thông tin quản lý">
            <div className="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-2">
              <Field label="Giao cho" required>
                <div className="relative">
                  <input
                    value={employeeSearch}
                    onFocus={() => setEmployeeDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setEmployeeDropdownOpen(false), 150);
                    }}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setAssignedEmployee("");
                      setEmployeeDropdownOpen(true);
                    }}
                    placeholder="Nhập tên, mã nhân viên, chi nhánh..."
                    className="h-9 w-full rounded border px-3 pr-9 text-xs outline-none focus:border-sky-400"
                  />

                  {employeeSearch && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setEmployeeSearch("");
                        setAssignedEmployee("");
                        setEmployeeDropdownOpen(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  )}

                  {employeeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-10 z-40 max-h-60 overflow-y-auto rounded-md border bg-white shadow-lg">
                      {filteredEmployees.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-slate-500">
                          Không tìm thấy nhân viên phù hợp.
                        </div>
                      ) : (
                        filteredEmployees.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();

                              setAssignedEmployee(String(item.id));
                              setEmployeeSearch(getEmployeeLabel(item));
                              setEmployeeDropdownOpen(false);
                            }}
                            className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-sky-50"
                          >
                            <div className="font-semibold text-slate-700">
                              {getOptionName(item, [
                                "full_name",
                                "employee_name",
                                "name",
                                "username",
                              ])}
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {[
                                item.employee_code,
                                item.branch_name,
                                item.department,
                                item.position,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "Nhân viên"}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {assignedEmployee && (
                    <p className="mt-1 text-[11px] text-emerald-600">
                      Đã chọn nhân viên phụ trách.
                    </p>
                  )}
                </div>
              </Field>

              <Field label="Hạng thành viên">
                <select
                  value={membershipTier}
                  onChange={(e) => setMembershipTier(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                >
                  <option value="">Chọn một tùy chọn</option>
                  {membershipTiers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionName(item, ["tier_name", "name"])}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Đánh giá">
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                >
                  <option value="">Chọn đánh giá</option>
                  {ratings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionName(item, ["rating_name", "name"])}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <div className="fixed bottom-0 left-10 right-0 z-20 flex h-14 items-center justify-center gap-2 border-t bg-white">
            <button
              type="button"
              onClick={() => router.push("/companies")}
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
      </section>
    </main>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3 overflow-hidden rounded-md border bg-white shadow-sm">
      <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
      <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 flex-1 rounded-l border px-3 text-xs outline-none focus:border-sky-400"
      />

      <div className="flex h-9 w-9 items-center justify-center rounded-r border-y border-r bg-slate-100 text-slate-600">
        <CalendarDays size={14} />
      </div>
    </div>
  );
}