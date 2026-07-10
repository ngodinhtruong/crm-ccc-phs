"use client";

import { CompanyCreateForm } from "@/components/companies/CompanyCreateForm";
import { useCompanyCreate } from "@/hooks/useCompanyCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function CompanyCreatePage() {
  const companyCreate = useCompanyCreate();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "CÔNG TY",
          href: "/companies",
        },
        {
          label: "Thêm mới",
        },
      ]}
    >
      {companyCreate.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {companyCreate.error}
        </div>
      )}

      {companyCreate.loadingDropdowns && (
        <div className="rounded-md border bg-white px-4 py-3 text-sm text-slate-500">
          Đang tải dropdown...
        </div>
      )}

      <CompanyCreateForm companyCreate={companyCreate} />
    </DashboardLayout>
  );
}