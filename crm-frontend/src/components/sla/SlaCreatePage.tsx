"use client";

import { SlaCreateForm } from "@/components/sla/SlaCreateForm";
import { useSlaCreate } from "@/hooks/useSlaCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function SlaCreatePage() {
  const slaCreate = useSlaCreate();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "SLA",
          href: "/sla",
        },
        {
          label: "Thêm mới",
        },
      ]}
    >
      {slaCreate.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {slaCreate.error}
        </div>
      )}

      {slaCreate.loadingDropdowns && (
        <div className="rounded-md border bg-white px-4 py-3 text-sm text-slate-500">
          Đang tải dữ liệu SLA...
        </div>
      )}

      <SlaCreateForm slaCreate={slaCreate} />
    </DashboardLayout>
  );
}