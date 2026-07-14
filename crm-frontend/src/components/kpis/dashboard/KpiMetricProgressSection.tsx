"use client";

import { useState } from "react";

import { KpiDashboardParams, KpiMetricSection, KpiProgressMetric } from "@/types/kpi-dashboard.type";
import { KpiMetricDashboardDetailModal } from "./KpiMetricDashboardDetailModal";
import { KpiMetricProgressRow } from "./KpiMetricProgressRow";

export function KpiMetricProgressSection({
  title,
  description,
  sections,
  emptyText,
  contributionParams,
}: {
  title: string;
  description: string;
  sections: KpiMetricSection[];
  emptyText: string;
  contributionParams: KpiDashboardParams;
}) {
  const [selectedMetric, setSelectedMetric] = useState<KpiProgressMetric | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between border-b bg-white px-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {sections.map((section) => (
            <div key={section.section.id} className="overflow-hidden rounded border border-slate-200">
              <div className="border-b bg-[#f8fafc] px-3 py-2">
                <div className="text-xs font-bold text-slate-700">
                  {section.section.section_code} - {section.section.section_name}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Trọng số: {section.section.weight_percent}% · {section.metricCount} chỉ tiêu
                </div>
              </div>

              {section.groups.map((group) => (
                <div key={group.group.id} className="border-b last:border-b-0">
                  <div className="flex items-center justify-between bg-white px-3 py-2">
                    <div className="text-xs font-semibold text-slate-700">
                      {group.group.group_code} - {group.group.group_name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {group.activeMetricCount} KPI · Trọng số nhóm {group.group.weight_percent}%
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="h-10 border-y bg-white text-slate-700">
                          <th className="sticky left-0 z-20 w-[80px] bg-white px-3 font-semibold">
                            Thao tác
                          </th>
                          <th className="w-[120px] px-3 font-semibold">Mã KPI</th>
                          <th className="w-[300px] px-3 font-semibold">Tên KPI</th>
                          <th className="w-[120px] px-3 font-semibold">Nguồn</th>
                          <th className="w-[100px] px-3 font-semibold">Tần suất</th>
                          <th className="w-[100px] px-3 font-semibold">Đơn vị</th>
                          <th className="w-[120px] px-3 font-semibold">Thực tế</th>
                          <th className="w-[120px] px-3 font-semibold">Chỉ tiêu</th>
                          <th className="w-[260px] px-3 font-semibold">Tiến độ</th>
                          <th className="w-[130px] px-3 font-semibold">Trạng thái</th>
                          <th className="w-[160px] px-3 font-semibold">Cập nhật</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.metrics.map((metric) => (
                          <KpiMetricProgressRow
                            key={metric.metric.id}
                            item={metric}
                            onViewDetail={setSelectedMetric}
                          />
                        ))}

                        {group.metrics.length === 0 && (
                          <tr>
                            <td colSpan={11} className="h-20 text-center text-slate-500">
                              Nhóm này chưa có KPI active.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {sections.length === 0 && (
            <div className="rounded border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              {emptyText}
            </div>
          )}
        </div>
      </div>

      <KpiMetricDashboardDetailModal
        item={selectedMetric}
        contributionParams={contributionParams}
        onClose={() => setSelectedMetric(null)}
      />
    </>
  );
}
