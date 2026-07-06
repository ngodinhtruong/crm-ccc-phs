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
    Phone,
    Plus,
    Search,
    Settings,
    Upload,
} from "lucide-react";

import { authService } from "@/services/auth.service";
import {
    CustomerListItem,
    customerService,
} from "@/services/customer.service";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

function StatusBadge({ value }: { value?: string }) {
    const label = value || "-";

    if (label === "Chính thức" || label === "ACTIVE") {
        return (
            <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Chính thức
            </span>
        );
    }

    if (label === "Ngừng hoạt động" || label === "INACTIVE") {
        return (
            <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Ngừng hoạt động
            </span>
        );
    }

    if (label === "Tiềm năng" || label === "POTENTIAL") {
        return (
            <span className="inline-flex rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Tiềm năng
            </span>
        );
    }

    return (
        <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {label}
        </span>
    );
}

function VipBadge({ value }: { value?: string }) {
    return (
        <span className="inline-flex max-w-[130px] truncate rounded-md bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            {value || "Khách thường"}
        </span>
    );
}

export default function CustomersPage() {
    const router = useRouter();

    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

    const [customers, setCustomers] = useState<CustomerListItem[]>([]);
    const [count, setCount] = useState(0);

    const [q, setQ] = useState("");
    const [branch, setBranch] = useState("");
    const [phone, setPhone] = useState("");
    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fromRecord = count === 0 ? 0 : 1;
    const toRecord = Math.min(20, count);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await customerService.getCustomers({
                q,
                branch,
                phone,
                status,
            });

            setCustomers(data.results || []);
            setCount(data.count || 0);
        } catch (err: any) {
            const statusCode = err?.response?.status;
            const detail = err?.response?.data
                ? JSON.stringify(err.response.data)
                : err?.message;

            setError(
                `Không tải được danh sách khách hàng. Status: ${statusCode} - ${detail}`
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

        loadCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleSearch = () => {
        loadCustomers();
    };

    const handleClearFilter = () => {
        setQ("");
        setBranch("");
        setPhone("");
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
                        <span className="font-semibold text-slate-800">Customers</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/customers/create"
                            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd]"
                        >
                            <Plus size={15} />
                            Thêm khách hàng
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
                                    Danh sách khách hàng
                                </h1>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Quản lý thông tin khách hàng, tài khoản, chi nhánh và trạng
                                    thái.
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
                            <div className="col-span-12 md:col-span-3">
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                    Từ khóa
                                </label>
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Tên, email, mã KH..."
                                    className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
                                />
                            </div>

                            <div className="col-span-12 md:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                    Di động
                                </label>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Số điện thoại"
                                    className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
                                />
                            </div>

                            <div className="col-span-12 md:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                    Chi nhánh
                                </label>
                                <input
                                    value={branch}
                                    onChange={(e) => setBranch(e.target.value)}
                                    placeholder="ID chi nhánh"
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
                                    <option value="ACTIVE">Chính thức</option>
                                    <option value="INACTIVE">Ngừng hoạt động</option>
                                    <option value="POTENTIAL">Tiềm năng</option>
                                </select>
                            </div>

                            <div className="col-span-12 flex items-end gap-2 md:col-span-3">
                                <button
                                    onClick={handleSearch}
                                    className="flex h-9 items-center gap-1 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
                                >
                                    <Search size={14} />
                                    Tìm kiếm
                                </button>

                                <button
                                    onClick={handleClearFilter}
                                    className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Xóa lọc
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1580px] border-collapse text-left text-xs">
                                <thead>
                                    <tr className="h-10 border-b bg-white text-slate-700">
                                        <th className="sticky left-0 z-10 w-[90px] bg-white px-3 font-semibold">
                                            Thao tác
                                        </th>
                                        <th className="w-[135px] px-3 font-semibold">
                                            Ngày mở tài khoản
                                        </th>
                                        <th className="w-[180px] px-3 font-semibold">Họ và tên</th>
                                        <th className="w-[140px] px-3 font-semibold">Di động</th>
                                        <th className="w-[160px] px-3 font-semibold">
                                            Số tài khoản
                                        </th>
                                        <th className="w-[160px] px-3 font-semibold">Công ty</th>
                                        <th className="w-[230px] px-3 font-semibold">Email</th>
                                        <th className="w-[145px] px-3 font-semibold">
                                            Phân loại VIP
                                        </th>
                                        <th className="w-[150px] px-3 font-semibold">Giao cho</th>
                                        <th className="w-[140px] px-3 font-semibold">Nguồn</th>
                                        <th className="w-[125px] px-3 font-semibold">Ngày sinh</th>
                                        <th className="w-[180px] px-3 font-semibold">Mô tả</th>
                                        <th className="w-[120px] px-3 font-semibold">Theo dõi</th>
                                        <th className="w-[130px] px-3 font-semibold">Tình trạng</th>
                                        <th className="w-[150px] px-3 font-semibold">Chi nhánh</th>
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

                                    {!loading && !error && customers.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={15}
                                                className="h-28 text-center text-slate-500"
                                            >
                                                Không có dữ liệu khách hàng.
                                            </td>
                                        </tr>
                                    )}

                                    {!loading &&
                                        !error &&
                                        customers.map((customer, index) => (
                                            <tr
                                                key={customer.id}
                                                className={`h-14 border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                                                    } hover:bg-sky-50`}
                                            >
                                                <td
                                                    className={`sticky left-0 z-10 px-3 ${index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 text-slate-400">
                                                        <button title="Xem" className="hover:text-sky-600">
                                                            <Eye size={15} />
                                                        </button>

                                                        <button
                                                            title="Thêm"
                                                            className="hover:text-sky-600"
                                                        >
                                                            <MoreVertical size={15} />
                                                        </button>
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-3">
                                                    {customer.opened_account_date || "-"}
                                                </td>

                                                <td className="px-3">
                                                    <span className="font-semibold text-sky-600">
                                                        {customer.full_name || "-"}
                                                    </span>
                                                </td>

                                                <td className="px-3">
                                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                                        <span>{customer.phone || "-"}</span>
                                                        {customer.phone && (
                                                            <Phone size={13} className="text-sky-500" />
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-3">
                                                    <span className="line-clamp-2 break-all">
                                                        {customer.account_number || "-"}
                                                    </span>
                                                </td>

                                                <td className="px-3">
                                                    <span className="line-clamp-2">
                                                        {customer.company_name || "-"}
                                                    </span>
                                                </td>

                                                <td className="px-3">
                                                    <span className="text-sky-600">
                                                        {customer.email || "-"}
                                                    </span>
                                                </td>

                                                <td className="px-3">
                                                    <VipBadge value={customer.vip_type} />
                                                </td>

                                                <td className="px-3">
                                                    {customer.assigned_employee_name || "-"}
                                                </td>

                                                <td className="px-3">{customer.source_name || "-"}</td>

                                                <td className="whitespace-nowrap px-3">
                                                    {customer.birth_date_display || "-"}
                                                </td>

                                                <td className="max-w-[180px] truncate px-3">
                                                    {customer.description_display || "-"}
                                                </td>

                                                <td className="px-3">
                                                    <span className="inline-flex h-6 min-w-16 items-center justify-center rounded bg-sky-100 px-2 text-xs font-semibold text-sky-700">
                                                        -
                                                    </span>
                                                </td>

                                                <td className="px-3">
                                                    <StatusBadge
                                                        value={customer.status_label || customer.status}
                                                    />
                                                </td>

                                                <td className="px-3">
                                                    <span className="font-medium text-slate-700">
                                                        {customer.branch_name || "-"}
                                                    </span>
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