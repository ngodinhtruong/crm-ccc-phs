"use client";

import {
    ChevronLeft,
    ChevronRight,
    Download,
    Plus,
    Wrench,
} from "lucide-react";

import { UserFilter } from "@/components/users/UserFilter";
import { UserTable } from "@/components/users/UserTable";
import { useUsers } from "@/hooks/useUsers";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function UserListPage() {
    const users = useUsers();

    return (
        <DashboardLayout
            breadcrumbs={[
                {
                    label: "TRANG CHỦ",
                    href: "/",
                },
                {
                    label: "Quản lý người dùng",
                },
                {
                    label: "Users",
                },
            ]}
            sidebarDefaultExpandedGroupKey="user-management"
            sidebarDefaultActiveChildKey="users"
            contentClassName="pl-10"
            rightAction={
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
                    >
                        <Plus size={15} />
                        Thêm Người dùng thường
                    </button>

                    <button
                        type="button"
                        className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
                    >
                        <Plus size={15} />
                        Thêm Người dùng Mobile
                    </button>

                    <button
                        type="button"
                        className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                    >
                        <Download size={15} />
                        Nhập dữ liệu
                    </button>

                    <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded border border-sky-300 bg-white text-sky-600 hover:bg-sky-50"
                    >
                        <Wrench size={15} />
                    </button>
                </div>
            }
        >
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex h-12 items-center justify-between border-b bg-white px-4">
                    <div>
                        <h1 className="text-sm font-semibold text-slate-800">
                            Danh sách người dùng
                        </h1>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Quản lý tài khoản đăng nhập, chi nhánh, phòng ban và vai trò của người dùng.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-700">
                        <span>
                            {users.fromRecord} - {users.toRecord} / {users.count}
                        </span>

                        <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400 hover:bg-slate-50"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500 hover:bg-slate-50"
                        >
                            ...
                        </button>

                        <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400 hover:bg-slate-50"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex h-12 items-center justify-center border-b bg-white px-4">
                    <div className="inline-flex overflow-hidden rounded border border-sky-300 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => users.changeTab("active")}
                            className={`h-8 px-5 ${users.activeTab === "active"
                                    ? "bg-[#0097cf] text-white"
                                    : "bg-white text-[#0097cf] hover:bg-sky-50"
                                }`}
                        >
                            Người dùng đang hoạt động
                        </button>

                        <button
                            type="button"
                            onClick={() => users.changeTab("inactive")}
                            className={`h-8 border-l border-sky-300 px-5 ${users.activeTab === "inactive"
                                    ? "bg-[#0097cf] text-white"
                                    : "bg-white text-[#0097cf] hover:bg-sky-50"
                                }`}
                        >
                            Người dùng ngừng hoạt động
                        </button>
                    </div>
                </div>

                <UserFilter
                    q={users.q}
                    branch={users.branch}
                    department={users.department}
                    online={users.online}
                    onQChange={users.setQ}
                    onBranchChange={users.setBranch}
                    onDepartmentChange={users.setDepartment}
                    onOnlineChange={users.setOnline}
                    onSearch={users.search}
                    onClear={users.clearFilter}
                />

                <UserTable
                    users={users.filteredUsers}
                    loading={users.loading}
                    error={users.error}
                />
            </div>
        </DashboardLayout>
    );
}