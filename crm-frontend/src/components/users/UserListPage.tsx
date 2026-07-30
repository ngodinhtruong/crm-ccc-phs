"use client";

import { Download, Plus, Wrench } from "lucide-react";

import { useRouter } from "next/navigation";
import { TablePagination } from "@/components/common";
import { UserTable } from "@/components/users/UserTable";
import { useUsers } from "@/hooks/useUsers";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function UserListPage() {
  const users = useUsers();
  const router = useRouter();
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
            onClick={() => router.push("/accounts/users/create")}
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669]"
          >
            <Plus size={15} />
            Thêm người dùng
          </button>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669]"
          >
            <Plus size={15} />
            Thêm Người dùng Mobile
          </button>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded border border-emerald-300 bg-white px-3 text-xs font-semibold text-[#059669] hover:bg-emerald-50"
          >
            <Download size={15} />
            Nhập dữ liệu
          </button>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-emerald-300 bg-white text-[#059669] hover:bg-emerald-50"
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
              Quản lý tài khoản đăng nhập, chi nhánh, đơn vị tổ chức, trách nhiệm và vai trò của người dùng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TablePagination
              fromRecord={users.fromRecord}
              toRecord={users.toRecord}
              count={users.count}
              page={users.page}
              totalPages={users.totalPages}
              loading={users.loading}
              onPrevious={users.previousPage}
              onNext={users.nextPage}
            />

            <button
              type="button"
              onClick={users.clearFilter}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <div className="flex h-12 items-center justify-center border-b bg-white px-4">
          <div className="inline-flex overflow-hidden rounded border border-emerald-300 text-xs font-semibold">
            <button
              type="button"
              onClick={() => users.changeTab("active")}
              className={`h-8 px-5 ${users.activeTab === "active"
                  ? "bg-[#10b981] text-white"
                  : "bg-white text-[#059669] hover:bg-emerald-50"
                }`}
            >
              Người dùng đang hoạt động
            </button>

            <button
              type="button"
              onClick={() => users.changeTab("inactive")}
              className={`h-8 border-l border-emerald-300 px-5 ${users.activeTab === "inactive"
                  ? "bg-[#10b981] text-white"
                  : "bg-white text-[#059669] hover:bg-emerald-50"
                }`}
            >
              Người dùng ngừng hoạt động
            </button>
          </div>
        </div>

        {users.masterError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {users.masterError}
          </div>
        )}

        <UserTable userState={users} />
      </div>
    </DashboardLayout>
  );
}