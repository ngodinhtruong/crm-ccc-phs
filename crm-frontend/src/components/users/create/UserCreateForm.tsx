"use client";

import { useUserCreate } from "@/hooks/useUserCreate";

import {
  UserAccountSection,
  UserEmployeeSection,
  UserRoleAccessSection,
} from "./UserCreateSections";

type UserCreateController = ReturnType<typeof useUserCreate>;

export function UserCreateForm({
  create,
}: {
  create: UserCreateController;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h1 className="text-sm font-semibold text-slate-800">
          Thêm user
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Tạo tài khoản đăng nhập, liên kết Employee, gán role và chi nhánh cho CCC hoặc Sale Admin.
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
        <UserAccountSection create={create} />
        <UserEmployeeSection create={create} />
        <UserRoleAccessSection create={create} />

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
            {create.submitting ? "Đang lưu..." : "Lưu user"}
          </button>
        </div>
      </div>
    </div>
  );
}