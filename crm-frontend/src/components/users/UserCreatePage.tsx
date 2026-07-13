"use client";

import { ArrowLeft, Save } from "lucide-react";

import { useUserCreate } from "@/hooks/useUserCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { UserCreateForm } from "./create/UserCreateForm";

export function UserCreatePage() {
  const create = useUserCreate();

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
          href: "/accounts/users",
        },
        {
          label: "Thêm user",
        },
      ]}
      sidebarDefaultExpandedGroupKey="user-management"
      sidebarDefaultActiveChildKey="users"
      contentClassName="pl-10"
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
            {create.submitting ? "Đang lưu..." : "Lưu user"}
          </button>
        </div>
      }
    >
      <UserCreateForm create={create} />
    </DashboardLayout>
  );
}