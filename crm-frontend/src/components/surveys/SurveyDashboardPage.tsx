"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks } from "lucide-react";

import { SurveyDashboardSection } from "@/components/surveys/SurveyDashboardSection";
import { SurveyToolbar } from "@/components/surveys/SurveyToolbar";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  defaultSurveyFilters,
  type SurveyFilters,
} from "@/utils/survey-period.util";

/** Dashboard CSAT — trang riêng, dùng chung bộ lọc thời gian với màn danh sách. */
export function SurveyDashboardPage() {
  // Khởi tạo lười: tính kỳ hiện tại lúc mount, không phải lúc nạp module.
  const [filters, setFilters] = useState<SurveyFilters>(() =>
    defaultSurveyFilters()
  );

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Khảo sát", href: "/surveys" },
        { label: "Dashboard CSAT" },
      ]}
    >
      <SurveyToolbar
        filters={filters}
        onChange={setFilters}
        title="Dashboard khảo sát CSAT"
        subtitle="Tỷ lệ phản hồi, điểm hài lòng và so sánh với kỳ trước."
        rightSlot={
          <Link
            href="/surveys"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ListChecks size={13} className="text-emerald-600" />
            Danh sách khảo sát
          </Link>
        }
      />

      <SurveyDashboardSection filters={filters} />
    </DashboardLayout>
  );
}
