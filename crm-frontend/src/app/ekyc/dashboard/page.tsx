"use client";

import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { EkycHeaderNav } from "@/components/ekyc/EkycHeaderNav";
import { EkycDashboardView } from "@/components/ekyc/EkycDashboardView";
import { GranularityMode, CompareMode } from "@/components/tickets/dashboard/CccDashboardUtils";

export default function Page() {
  const [granularity, setGranularity] = useState<GranularityMode>("MONTH");
  const [compareMode, setCompareMode] = useState<CompareMode>("NONE");

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "QUẢN LÝ eKYC", href: "/ekyc" },
        { label: "Dashboard eKYC" },
      ]}
      sidebarDefaultExpandedGroupKey="ekyc"
      sidebarDefaultActiveChildKey="ekyc-dashboard"
      rightAction={
        <EkycHeaderNav
          granularity={granularity}
          onGranularityChange={setGranularity}
          compareMode={compareMode}
          onCompareModeChange={setCompareMode}
        />
      }
    >
      <div className="p-2">
        <EkycDashboardView granularity={granularity} compareMode={compareMode} />
      </div>
    </DashboardLayout>
  );
}
