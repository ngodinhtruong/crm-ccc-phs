"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";

import { authService } from "@/services/auth.service";
import {
  customerService,
  SelectOption,
} from "@/services/customer.service";
import { masterDataService } from "@/services/master-data.service";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

type BranchOption = {
  id: number;
  branch_code?: string;
  branch_name: string;
};

function getOptionName(
  option: SelectOption,
  keys: string[],
  fallback = ""
): string {
  for (const key of keys) {
    if (option[key]) return String(option[key]);
  }

  return fallback || String(option.id);
}

export default function CustomerCreatePage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [customerTypes, setCustomerTypes] = useState<SelectOption[]>([]);
  const [companies, setCompanies] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [ratings, setRatings] = useState<SelectOption[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<SelectOption[]>([]);

  const [genderPrefix, setGenderPrefix] = useState("Chị");
  const [fullName, setFullName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [customerType, setCustomerType] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [openedDate, setOpenedDate] = useState("");
  const [referrer, setReferrer] = useState("");
  const [company, setCompany] = useState("");

  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("");
  const [district, setDistrict] = useState("");

  const [description, setDescription] = useState("");

  const [assignedTo, setAssignedTo] = useState("");
  const [source, setSource] = useState("");
  const [rating, setRating] = useState("");
  const [membershipTier, setMembershipTier] = useState("");

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCustomerTypeName = useMemo(() => {
    const selected = customerTypes.find((item) => String(item.id) === customerType);

    if (!selected) return "";

    return getOptionName(selected, ["type_name", "customer_type_name", "name"]);
  }, [customerType, customerTypes]);

  const isContactPerson =
    selectedCustomerTypeName.toLowerCase().includes("người liên hệ") ||
    selectedCustomerTypeName.toLowerCase().includes("contact");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const loadDropdowns = async () => {
      try {
        setLoadingDropdowns(true);

        const [
          branchData,
          typeData,
          companyData,
          sourceData,
          ratingData,
          tierData,
        ] = await Promise.all([
          masterDataService.getBranches(),
          customerService.getCustomerTypes(),
          customerService.getCompanies(),
          customerService.getSources(),
          customerService.getRatings(),
          customerService.getMembershipTiers(),
        ]);

        setBranches(branchData.results || branchData);
        setCustomerTypes(typeData);
        setCompanies(companyData);
        setSources(sourceData);
        setRatings(ratingData);
        setMembershipTiers(tierData);
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

  const validateForm = async () => {
    if (!fullName.trim()) {
      return "Họ và tên không được để trống.";
    }

    if (!phone.trim()) {
      return "Di động không được để trống.";
    }

    if (accountNumber.trim()) {
      if (!/^[A-Za-z0-9]{10}$/.test(accountNumber.trim())) {
        return "Số tài khoản phải gồm đúng 10 ký tự, chỉ bao gồm chữ và số.";
      }

      const exists = await customerService.checkAccountNumberExists(
        accountNumber.trim()
      );

      if (exists) {
        if (isContactPerson) {
          return "Người liên hệ đã tồn tại theo Số tài khoản này.";
        }

        return "Số tài khoản này đã tồn tại.";
      }
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const validateMessage = await validateForm();

      if (validateMessage) {
        setError(validateMessage);
        return;
      }

      const customer = await customerService.createCustomer({
        full_name: `${genderPrefix} ${fullName}`.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        identity_number: identityNumber.trim() || undefined,
        birth_date: birthDate || undefined,
        gender: gender || undefined,
        customer_type: customerType ? Number(customerType) : null,
        branch: branch ? Number(branch) : null,
        company: company ? Number(company) : null,
        source: source ? Number(source) : null,
        rating: rating ? Number(rating) : null,
        membership_tier: membershipTier ? Number(membershipTier) : null,
        address: [address, district, province, country].filter(Boolean).join(", "),
        status: "ACTIVE",
      });

      if (accountNumber.trim()) {
        await customerService.createCustomerAccount({
          customer: customer.id,
          account_number: accountNumber.trim(),
          account_status: "ACTIVE",
          source_system: "CRM_MINI",
        });
      }

      router.push("/customers");
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message;

      setError(`Lưu khách hàng thất bại. Status: ${status} - ${detail}`);
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
          title="Mở cài đặt"
        >
          <Settings size={22} />
        </button>
      </aside>

      <section className="min-h-screen pl-10 pt-14">
        <div className="flex h-11 items-center justify-between border-b bg-white px-4">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Link href="/" className="font-medium text-slate-700 hover:text-orange-500">
              TRANG CHỦ
            </Link>
            <span>&gt;</span>
            <Link href="/customers" className="hover:text-orange-500">
              Khách hàng
            </Link>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">Thêm khách hàng</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3">
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

          {/* Thông tin chung */}
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
                    value={genderPrefix}
                    onChange={(e) => setGenderPrefix(e.target.value)}
                    className="h-9 w-20 rounded border px-2 text-xs"
                  >
                    <option value="Anh">Anh</option>
                    <option value="Chị">Chị</option>
                    <option value="Ông">Ông</option>
                    <option value="Bà">Bà</option>
                  </select>

                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-9 flex-1 rounded border px-3 text-xs outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
                  Loại
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="h-9 rounded border px-3 text-xs"
                >
                  <option value="">Chọn loại khách hàng</option>
                  {customerTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionName(item, ["type_name", "customer_type_name", "name"])}
                    </option>
                  ))}
                </select>
              </div>

              <Field label="CMND/CCCD">
                <input
                  value={identityNumber}
                  onChange={(e) => setIdentityNumber(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Số tài khoản">
                <input
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.toUpperCase().slice(0, 10))
                  }
                  maxLength={10}
                  placeholder="10 ký tự chữ + số"
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Ngày sinh">
                <DateInput value={birthDate} onChange={setBirthDate} />
              </Field>

              <Field label="Chi nhánh">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                >
                  <option value="">Chọn chi nhánh</option>
                  {branches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.branch_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Giới tính">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                >
                  <option value="">Chọn một giá trị</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </Field>

              <Field label="Ngày mở tài khoản">
                <DateInput value={openedDate} onChange={setOpenedDate} />
              </Field>

              <Field label="Di động" required>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs outline-none focus:border-sky-400"
                />
              </Field>

              <Field label="Môi giới">
                <input
                  value={referrer}
                  onChange={(e) => setReferrer(e.target.value)}
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

              <Field label="Công ty">
                <div className="flex">
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
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
              </Field>
            </div>
          </section>

          {/* Thông tin địa chỉ */}
          <section className="mb-3 overflow-hidden rounded-md border bg-white shadow-sm">
            <div className="border-b px-4 py-3 text-sm font-semibold">
              Thông tin địa chỉ
            </div>

            <div className="grid grid-cols-1 gap-x-12 gap-y-4 p-4 lg:grid-cols-2">
              <Field label="Địa chỉ">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                />
              </Field>

              <Field label="Quốc gia">
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                />
              </Field>

              <Field label="Tỉnh/TP">
                <input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                />
              </Field>

              <Field label="Quận/Huyện">
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                />
              </Field>
            </div>
          </section>

          {/* Thông tin mô tả */}
          <section className="mb-3 overflow-hidden rounded-md border bg-white shadow-sm">
            <div className="border-b px-4 py-3 text-sm font-semibold">
              Thông tin mô tả
            </div>

            <div className="grid grid-cols-[150px_1fr] items-start gap-3 p-4">
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
          </section>

          {/* Thông tin quản lý */}
          <section className="mb-16 overflow-hidden rounded-md border bg-white shadow-sm">
            <div className="border-b px-4 py-3 text-sm font-semibold">
              Thông tin quản lý
            </div>

            <div className="grid grid-cols-1 gap-x-12 gap-y-4 p-4 lg:grid-cols-2">
              <Field label="Giao cho" required>
                <input
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Nhân viên phụ trách"
                  className="h-9 w-full rounded border px-3 text-xs"
                />
              </Field>

              <Field label="Đánh giá">
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                >
                  <option value="">Chọn đánh giá</option>
                  {ratings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionName(item, ["rating_name", "name"])}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Nguồn">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                >
                  <option value="">Chọn một giá trị</option>
                  {sources.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionName(item, ["source_name", "name"])}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Hạng thành viên">
                <select
                  value={membershipTier}
                  onChange={(e) => setMembershipTier(e.target.value)}
                  className="h-9 w-full rounded border px-3 text-xs"
                >
                  <option value="">Chọn một tùy chọn</option>
                  {membershipTiers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionName(item, ["tier_name", "name"])}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <div className="fixed bottom-0 left-10 right-0 z-20 flex h-14 items-center justify-center gap-2 border-t bg-white">
            <button
              type="button"
              onClick={() => router.push("/customers")}
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