"use client";

import { ArrowLeft, Save } from "lucide-react";

import { AccessDenied } from "@/components/common";
import {
  PermissionCode,
  useCurrentUserPermissions,
} from "@/hooks/useCurrentUserPermissions";
import { useSaRecordCreate } from "@/hooks/useSaRecordCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { SaRecordCreateForm } from "./create/SaRecordCreateForm";

const breadcrumbs = [
  {
    label: "TRANG CHỦ",
    href: "/workspace",
  },
  {
    label: "Sale Admin",
  },
  {
    label: "Ghi nhận cuộc gọi",
    href: "/sale-admin/records",
  },
  {
    label: "Thêm SA Record",
  },
];

export function SaRecordCreatePage() {
  const create = useSaRecordCreate();
  const authz = useCurrentUserPermissions();

  const canCreate = authz.hasPermission(PermissionCode.SA_RECORD_CREATE);

  if (!authz.loading && !canCreate) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <AccessDenied
          title="Không có quyền tạo SA Record"
          description="Bạn chỉ được xem dữ liệu Sale Admin, không được tạo mới SA Record."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      breadcrumbs={breadcrumbs}
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
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} />
            {create.submitting ? "Đang lưu..." : "Lưu SA Record"}
          </button>
        </div>
      }
    >
      <SaRecordCreateForm create={create} />
    </DashboardLayout>
  );
}