"use client";

import { AlertCircle, Loader2 } from "lucide-react";

import { useUserCreate } from "@/hooks/useUserCreate";

import {
  UserAccountSection,
  UserEmployeeSection,
  UserRoleAccessSection,
} from "./UserCreateSections";
import { UserCreateSuccessDialog } from "./UserCreateSuccessDialog";

type UserCreateController = ReturnType<typeof useUserCreate>;

export function UserCreateForm({
  create,
}: {
  create: UserCreateController;
}) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <h1 className="text-base font-bold text-slate-900">Thêm người dùng</h1>
          <p className="mt-1 text-xs text-slate-500">
            Chọn nhân viên, nhập tài khoản và gán vai trò.
          </p>
        </div>

        {create.loadingMaster && (
          <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50 px-5 py-3 text-xs font-medium text-sky-700">
            <Loader2 className="animate-spin" size={15} />
            Đang tải chi nhánh, nhân viên, đơn vị tổ chức, trách nhiệm và vai trò...
          </div>
        )}

        {create.masterError && (
          <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-5 py-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={15} />
            <span>{create.masterError}</span>
          </div>
        )}

        {create.error && (
          <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-5 py-3 text-xs font-medium text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={15} />
            <span>{create.error}</span>
          </div>
        )}

        <div className="space-y-4 p-5">
          <UserAccountSection create={create} />
          <UserEmployeeSection create={create} />
          <UserRoleAccessSection create={create} />

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={create.cancel}
              disabled={create.submitting}
              className="h-10 rounded-md border border-slate-300 bg-white px-5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={create.submit}
              disabled={create.submitting || create.loadingMaster}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-sky-600 px-5 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {create.submitting && <Loader2 className="animate-spin" size={15} />}
              {create.submitting ? "Đang tạo người dùng..." : "Tạo người dùng"}
            </button>
          </div>
        </div>
      </div>

      <UserCreateSuccessDialog create={create} />
    </>
  );
}
