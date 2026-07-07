"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";

import { authService } from "@/services/auth.service";
import {
  CompanyListItem,
  companyService,
} from "@/services/company.service";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

function StatusBadge({ value }: { value?: string }) {
  if (value === "ACTIVE" || value === "Đang hoạt động") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Đang hoạt động
      </span>
    );
  }

  if (value === "INACTIVE" || value === "Ngừng hoạt động") {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Ngừng hoạt động
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {value || "-"}
    </span>
  );
}

export default function CompaniesPage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [count, setCount] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await companyService.getCompanies({
        q,
        status,
      });

      setCompanies(data.results || []);
      setCount(data.count || 0);
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message;

      setError(
        `Không tải được danh sách công ty. Status: ${statusCode} - ${detail}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleSearch = () => {
    loadCompanies();
  };

  const handleClearFilter = () => {
    setQ("");
    setStatus("");
  };

  return (
    <main className="min-h-screen bg-[#eef2f5] text-slate-800">
      <MainNavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <DashboardTopbar onMenuClick={() => setMenuOpen(true)} />

      <DashboardSidebar
        open={settingsSidebarOpen}
        onClose={() => setSettingsSidebarOpen(false)}
      />

      {/* Left setting rail */}
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
        {/* Breadcrumb + actions */}
        <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Link
              href="/"
              className="font-medium text-slate-700 hover:text-orange-500"
            >
              TRANG CHỦ
            </Link>
            <span>&gt;</span>
            <span>Khách hàng</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">Công ty</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/companies/create"
              className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd]"
            >
              <Plus size={15} />
              Thêm công ty
            </Link>

            <button className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50">
              <Upload size={15} />
              Nhập dữ liệu
            </button>

            <button className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50">
              <Download size={15} />
              Xuất dữ liệu
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b bg-white px-4">
              <div>
                <h1 className="text-sm font-semibold text-slate-800">
                  Danh sách công ty
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Quản lý thông tin công ty, người liên hệ chính, tài khoản và
                  trạng thái.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700">
                <span>
                  {fromRecord} đến {toRecord} của {count}
                </span>

                <button className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400 hover:bg-slate-50">
                  <ChevronLeft size={16} />
                </button>

                <button className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500 hover:bg-slate-50">
                  ...
                </button>

                <button className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400 hover:bg-slate-50">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="grid grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
              <div className="col-span-12 md:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Từ khóa
                </label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tên công ty, email, mã số thuế, số tài khoản..."
                  className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
                />
              </div>

              <div className="col-span-12 md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Tình trạng
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
                >
                  <option value="">Tất cả</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </div>

              <div className="col-span-12 flex items-end gap-2 md:col-span-6">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex h-9 items-center gap-1 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
                >
                  <Search size={14} />
                  Tìm kiếm
                </button>

                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Xóa lọc
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1550px] border-collapse text-left text-xs">
                <thead>
                  <tr className="h-10 border-b bg-white text-slate-700">
                    <th className="sticky left-0 z-10 w-[90px] bg-white px-3 font-semibold">
                      Thao tác
                    </th>
                    <th className="w-[220px] px-3 font-semibold">
                      Tên công ty
                    </th>
                    <th className="w-[140px] px-3 font-semibold">
                      Điện thoại
                    </th>
                    <th className="w-[160px] px-3 font-semibold">
                      Số tài khoản
                    </th>
                    <th className="w-[135px] px-3 font-semibold">
                      Ngày mở TK
                    </th>
                    <th className="w-[150px] px-3 font-semibold">
                      Mã số thuế
                    </th>
                    <th className="w-[210px] px-3 font-semibold">Email</th>
                    <th className="w-[180px] px-3 font-semibold">Website</th>
                    <th className="w-[180px] px-3 font-semibold">
                      Người liên hệ chính
                    </th>
                    <th className="w-[140px] px-3 font-semibold">Nguồn</th>
                    <th className="w-[140px] px-3 font-semibold">Đánh giá</th>
                    <th className="w-[160px] px-3 font-semibold">
                      Hạng thành viên
                    </th>
                    <th className="w-[160px] px-3 font-semibold">Giao cho</th>
                    <th className="w-[140px] px-3 font-semibold">
                      Tình trạng
                    </th>
                    <th className="w-[220px] px-3 font-semibold">Địa chỉ</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={15}
                        className="h-28 text-center text-slate-500"
                      >
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  )}

                  {error && (
                    <tr>
                      <td
                        colSpan={15}
                        className="h-28 px-4 text-center text-red-600"
                      >
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading && !error && companies.length === 0 && (
                    <tr>
                      <td
                        colSpan={15}
                        className="h-28 text-center text-slate-500"
                      >
                        Không có dữ liệu công ty.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    companies.map((company, index) => (
                      <tr
                        key={company.id}
                        className={`h-14 border-b border-slate-100 ${
                          index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                        } hover:bg-sky-50`}
                      >
                        <td
                          className={`sticky left-0 z-10 px-3 ${
                            index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                          }`}
                        >
                          <div className="flex items-center gap-3 text-slate-400">
                            <button
                              type="button"
                              title="Xem"
                              onClick={() => router.push(`/companies/${company.id}`)}
                              className="hover:text-sky-600"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              title="Thêm"
                              className="hover:text-sky-600"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>
                        </td>

                        <td className="px-3">
                          <Link
                            href={`/companies/${company.id}`}
                            className="font-semibold text-sky-600 hover:underline"
                          >
                            {company.company_name || "-"}
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-3">
                          {company.phone || "-"}
                        </td>

                        <td className="px-3">
                          <span className="line-clamp-2 break-all">
                            {company.account_number || "-"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3">
                          {company.opened_at_display || company.opened_at || "-"}
                        </td>

                        <td className="px-3">{company.tax_code || "-"}</td>

                        <td className="px-3">
                          <span className="text-sky-600">
                            {company.email || "-"}
                          </span>
                        </td>

                        <td className="px-3">
                          <span className="text-sky-600">
                            {company.website || "-"}
                          </span>
                        </td>

                        <td className="px-3">
                          {company.primary_contact_name || "-"}
                        </td>

                        <td className="px-3">{company.source_name || "-"}</td>

                        <td className="px-3">{company.rating_name || "-"}</td>

                        <td className="px-3">
                          {company.membership_tier_name || "-"}
                        </td>

                        <td className="px-3">
                          {company.assigned_employee_name || "-"}
                        </td>

                        <td className="px-3">
                          <StatusBadge
                            value={company.status_label || company.status}
                          />
                        </td>

                        <td className="max-w-[220px] truncate px-3">
                          {[
                            company.address,
                            company.district,
                            company.province,
                            company.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}