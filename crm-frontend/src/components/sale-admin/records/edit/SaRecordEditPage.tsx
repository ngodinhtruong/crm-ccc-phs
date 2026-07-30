"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { SaRecordCreateForm } from "@/components/sale-admin/records/create/SaRecordCreateForm";
import { useSaRecordEdit } from "@/hooks/useSaRecordEdit";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function SaRecordEditPage({ recordId }: { recordId: string }) {
  const router = useRouter();
  const edit = useSaRecordEdit(recordId);

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/workspace",
        },
        {
          label: "Sale Admin",
          href: "/sale-admin/dashboard",
        },
        {
          label: "SA Records",
          href: "/sale-admin/records",
        },
        {
          label: edit.record?.record_code || "Chỉnh sửa",
        },
      ]}
      rightAction={
        <button
          type="button"
          onClick={() => router.push(`/sale-admin/records/${recordId}`)}
          className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={15} />
          Quay lại chi tiết
        </button>
      }
    >
      {edit.loadingRecord ? (
        <div className="rounded border border-slate-200 bg-white p-4 text-xs text-slate-500">
          Đang tải dữ liệu SA Record...
        </div>
      ) : (
        <SaRecordCreateForm create={edit} mode="edit" />
      )}
    </DashboardLayout>
  );
}