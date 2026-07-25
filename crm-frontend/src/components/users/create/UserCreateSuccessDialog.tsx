"use client";

import { CheckCircle2, Copy, List, Plus } from "lucide-react";

import { useUserCreate } from "@/hooks/useUserCreate";

import { FieldLabel, ReadonlyValue } from "./UserCreateFormControls";

type UserCreateController = ReturnType<typeof useUserCreate>;

export function UserCreateSuccessDialog({
  create,
}: {
  create: UserCreateController;
}) {
  if (!create.createdUser) return null;

  const defaultPassword =
    create.createdUser.generated_password ||
    `${create.createdUser.username}123`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="mt-0.5 text-emerald-600" size={22} />
          <div>
            <h2 className="text-base font-bold text-emerald-900">
              Tạo người dùng thành công
            </h2>
            <p className="mt-1 text-xs text-emerald-700">
              Tài khoản, nhân viên và vai trò đã được lưu.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Tên đăng nhập</FieldLabel>
              <ReadonlyValue value={create.createdUser.username} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <ReadonlyValue value={create.createdUser.email} />
            </div>
            <div>
              <FieldLabel>Nhân viên</FieldLabel>
              <ReadonlyValue
                value={
                  create.createdUser.employee_name ||
                  create.createdUser.employee_code
                }
              />
            </div>
            <div>
              <FieldLabel>Đơn vị tổ chức</FieldLabel>
              <ReadonlyValue
                value={
                  create.createdUser.primary_organization_unit_name ||
                  create.createdUser.department
                }
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-900">
              Mật khẩu mặc định
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
                {defaultPassword}
              </code>
              <button
                type="button"
                onClick={create.copyGeneratedPassword}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                <Copy size={15} />
                {create.passwordCopied ? "Đã sao chép" : "Sao chép"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={create.createAnother}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <Plus size={15} />
            Tạo người dùng khác
          </button>
          <button
            type="button"
            onClick={create.goToUserList}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-xs font-bold text-white hover:bg-sky-700"
          >
            <List size={15} />
            Về danh sách
          </button>
        </div>
      </div>
    </div>
  );
}
