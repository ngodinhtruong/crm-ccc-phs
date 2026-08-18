import { Suspense } from "react";
import { KpiDashboardPage } from "@/components/kpis/dashboard/KpiDashboardPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-slate-500">
          Đang tải trang KPI cá nhân...
        </div>
      }
    >
      <KpiDashboardPage />
    </Suspense>
  );
}
