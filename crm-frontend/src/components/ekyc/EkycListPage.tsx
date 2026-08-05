"use client";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { EkycHeaderNav } from "./EkycHeaderNav";
import { EkycTable } from "./EkycTable";

export function EkycListPage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "QUẢN LÝ eKYC", href: "/ekyc" },
        { label: "Danh sách eKYC" },
      ]}
      sidebarDefaultExpandedGroupKey="ekyc"
      sidebarDefaultActiveChildKey="ekyc-list"
      rightAction={<EkycHeaderNav />}
    >
      <div className="p-2">
        <EkycTable />
      </div>
    </DashboardLayout>
  );
}
