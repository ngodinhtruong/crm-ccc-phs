"use client";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { EkycHeaderNav } from "@/components/ekyc/EkycHeaderNav";
import { EkycCreateForm } from "@/components/ekyc/EkycCreateForm";

export default function Page() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "QUẢN LÝ eKYC", href: "/ekyc" },
        { label: "Nhập eKYC mới" },
      ]}
      sidebarDefaultExpandedGroupKey="ekyc"
      sidebarDefaultActiveChildKey="ekyc-create"
      rightAction={<EkycHeaderNav />}
    >
      <div className="p-2">
        <EkycCreateForm />
      </div>
    </DashboardLayout>
  );
}
