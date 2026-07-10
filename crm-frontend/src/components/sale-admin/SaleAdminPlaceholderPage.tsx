"use client";

import { DashboardLayout } from "@/layouts/DashboardLayout";

type SaleAdminPlaceholderPageProps = {
  title: string;
  description: string;
};

export function SaleAdminPlaceholderPage({
  title,
  description,
}: SaleAdminPlaceholderPageProps) {
  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/workspace",
        },
        {
          label: "Sale Admin",
        },
        {
          label: title,
        },
      ]}
    >
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </DashboardLayout>
  );
}