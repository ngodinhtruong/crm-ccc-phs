"use client";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { EkycHeaderNav } from "@/components/ekyc/EkycHeaderNav";
import { EkycImportView } from "@/components/ekyc/EkycImportView";

export default function Page() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "QUẢN LÝ eKYC", href: "/ekyc" },
        { label: "Import Excel" },
      ]}
      sidebarDefaultExpandedGroupKey="ekyc"
      sidebarDefaultActiveChildKey="ekyc-import"
      rightAction={<EkycHeaderNav />}
    >
      <div className="p-2">
        <EkycImportView />
      </div>
    </DashboardLayout>
  );
}
