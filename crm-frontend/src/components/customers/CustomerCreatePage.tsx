"use client";

import { CustomerCreateForm } from "@/components/customers/CustomerCreateForm";
import { useCustomerCreate } from "@/hooks/useCustomerCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function CustomerCreatePage() {
  const customerCreate = useCustomerCreate();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "Khách hàng",
          href: "/customers",
        },
        {
          label: "Thêm khách hàng",
        },
      ]}
    >
      {customerCreate.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {customerCreate.error}
        </div>
      )}

      {customerCreate.loadingDropdowns && (
        <div className="rounded-md border bg-white px-4 py-3 text-sm text-slate-500">
          Đang tải dropdown...
        </div>
      )}

      <CustomerCreateForm customerCreate={customerCreate} />
    </DashboardLayout>
  );
}