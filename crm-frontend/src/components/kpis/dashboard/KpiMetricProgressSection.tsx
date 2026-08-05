"use client";

import { Fragment, useMemo, useState } from "react";
import { Clock, Layers, ListFilter } from "lucide-react";

import { KpiDashboardParams, KpiMetricSection, KpiProgressMetric } from "@/types/kpi-dashboard.type";
import { formatDateTime } from "./KpiDashboardUtils";
import { KpiMetricDashboardDetailModal } from "./KpiMetricDashboardDetailModal";
import { KpiMetricProgressRow } from "./KpiMetricProgressRow";

export function KpiMetricProgressSection({
  title,
  description,
  sections,
  emptyText,
  contributionParams,
  hideCardWrapper = false,
}: {
  title: string;
  description: string;
  sections: KpiMetricSection[];
  emptyText: string;
  contributionParams: KpiDashboardParams;
  hideCardWrapper?: boolean;
}) {
  const [selectedMetric, setSelectedMetric] = useState<KpiProgressMetric | null>(null);

  const totalMetrics = sections.reduce((sum, s) => sum + s.metricCount, 0);

  const latestUpdatedTime = useMemo(() => {
    let latest: string | null = null;
    sections.forEach((section) => {
      section.groups.forEach((group) => {
        group.metrics.forEach((m) => {
          const t = m.result?.calculated_at || m.result?.scored_at || m.result?.updated_at;
          if (t && (!latest || new Date(t).getTime() > new Date(latest).getTime())) {
            latest = t;
          }
        });
      });
    });
    return latest;
  }, [sections]);

  const content = (
    <>
      {/* Unified Table */}
      {sections.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="h-9 border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="sticky left-0 z-20 w-14 bg-slate-50/90 px-3 text-center">
                  Thao tác
                </th>
                <th className="w-28 px-3">Mã KPI</th>
                <th className="w-[260px] px-3">Tên KPI</th>
                <th className="w-32 px-3 text-right">Thực tế</th>
                <th className="w-32 px-3 text-right">Chỉ tiêu</th>
                <th className="w-[360px] px-3">Tiến độ (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sections.map((section) => (
                <Fragment key={section.section.id}>
                  {section.groups.map((group) => (
                    <Fragment key={group.group.id}>
                      {/* Group Header Row */}
                      <tr className="bg-slate-50/70 font-semibold text-slate-700 text-xs border-b border-slate-200">
                        <td colSpan={6} className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-slate-700">
                              <Layers size={13} className="text-slate-400" />
                              <span>
                                Nhóm {group.group.group_code}: {group.group.group_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 font-normal">
                              <span>{group.activeMetricCount} chỉ tiêu</span>
                              <span className="h-3 w-px bg-slate-300" />
                              <span className="font-semibold text-slate-700">
                                Trọng số nhóm: {group.group.weight_percent}%
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Group Metrics */}
                      {group.metrics.map((metric) => (
                        <KpiMetricProgressRow
                          key={metric.metric.id}
                          item={metric}
                          onViewDetail={setSelectedMetric}
                        />
                      ))}

                      {group.metrics.length === 0 && (
                        <tr>
                          <td colSpan={6} className="h-12 text-center text-xs text-slate-400 italic bg-white">
                            Chưa có chỉ tiêu nào thuộc nhóm này.
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center m-4">
          <ListFilter className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-500">{emptyText}</p>
        </div>
      )}

      <KpiMetricDashboardDetailModal
        item={selectedMetric}
        contributionParams={contributionParams}
        onClose={() => setSelectedMetric(null)}
      />
    </>
  );

  if (hideCardWrapper) {
    return content;
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Card Header */}
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">{title}</h2>
              <span className="inline-flex items-center rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-bold text-[#059669]">
                {totalMetrics} chỉ tiêu
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>

          {latestUpdatedTime && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-2xs">
              <Clock size={13} className="text-slate-400" />
              <span>
                Cập nhật lúc: <strong className="text-slate-700">{formatDateTime(latestUpdatedTime)}</strong>
              </span>
            </div>
          )}
        </div>

        {content}
      </div>
    </>
  );
}
