"use client";

import Link from "next/link";
import { Eye, Medal, Search, Trophy } from "lucide-react";

import { KpiAdminController } from "@/hooks/useKpiAdmin";
import { KpiAdminRankingRow } from "@/types/kpi.type";
import {
  formatNumber,
  formatPercent,
  getEmployeeName,
  getMetricShortName,
  getRoleBadgeLabel,
} from "./KpiAdminUtils";

function RankBadge({ rank }: { rank?: number | null }) {
  if (!rank) return <span className="text-slate-400">-</span>;

  if (rank <= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-sm font-bold text-amber-700">
        <Trophy size={14} />#{rank}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-600">
      <Medal size={14} />#{rank}
    </span>
  );
}

function RoleBadge({ roleType }: { roleType?: string | null }) {
  const isSup = roleType === "SUP";

  return (
    <span
      className={[
        "inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold uppercase",
        isSup ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700",
      ].join(" ")}
    >
      {getRoleBadgeLabel(roleType)}
    </span>
  );
}

function buildKpiHref(row: KpiAdminRankingRow, periodId: string) {
  const params = new URLSearchParams({ user: String(row.user.id) });
  if (periodId) params.set("period", periodId);
  params.set("employeeName", getEmployeeName(row.user));
  return `/sale-admin/kpi?${params.toString()}`;
}

function getScoreClass(value?: string | number | null) {
  const score = Number(value || 0);
  if (score >= 90) return "text-emerald-700";
  if (score >= 70) return "text-amber-700";
  return "text-red-600";
}

function getTotalBadgeClass(value?: string | number | null) {
  const score = Number(value || 0);
  if (score >= 90) return "bg-emerald-100 text-emerald-700";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function KpiAdminRankingTab({ admin }: { admin: KpiAdminController }) {
  const ranking = admin.ranking;
  const metrics = ranking?.metrics || [];
  const rows = ranking?.results || [];

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="font-bold text-slate-800">BXH</span>
          <span>{ranking?.count || 0} NV</span>
          <span>A: {formatPercent(admin.report?.overview.avg_manual_score)}</span>
          <span>B: {formatPercent(admin.report?.overview.avg_auto_score)}</span>
          <span>Tổng: {formatPercent(admin.report?.overview.avg_total_score)}</span>
        </div>

        <div className="relative w-full lg:w-[300px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={admin.q}
            onChange={(event) => admin.setQ(event.target.value)}
            placeholder="Tìm nhân viên..."
            className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead>
            <tr className="h-11 border-b bg-[#f8fafc] text-slate-700">
              <th className="sticky left-0 z-20 w-[58px] bg-[#f8fafc] px-4 font-semibold" title="Xem chi tiết">
                Xem
              </th>
              <th className="w-[82px] px-4 font-semibold" title="Xếp hạng">Hạng</th>
              <th className="sticky left-[58px] z-20 w-[230px] bg-[#f8fafc] px-4 font-semibold" title="Nhân viên">
                NV
              </th>
              <th className="w-[150px] px-4 font-semibold" title="Chi nhánh">CN</th>
              <th className="w-[78px] px-3 text-right font-semibold" title="Phần A">A</th>
              <th className="w-[78px] px-3 text-right font-semibold" title="Phần B">B</th>
              <th className="w-[92px] px-3 text-right font-semibold" title="Tổng KPI">Tổng</th>
              {metrics.map((metric) => (
                <th
                  key={metric.id}
                  className="w-[86px] px-2 text-center font-semibold"
                  title={`${metric.metric_code} - ${metric.metric_name}`}
                >
                  <div className="text-[11px] font-medium text-slate-400">{metric.group_code}</div>
                  <div className="text-sm font-bold text-slate-700">
                    {getMetricShortName(metric.metric_name, metric.metric_code, metric.group_code)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admin.loading ? (
              <tr>
                <td colSpan={7 + metrics.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  Đang tải BXH...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7 + metrics.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  Chưa có dữ liệu.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const metricMap = new Map(row.metrics.map((metric) => [metric.metric_id, metric]));
                const metricCodeMap = new Map(row.metrics.map((metric) => [metric.metric_code, metric]));

                return (
                  <tr key={row.user.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="sticky left-0 z-10 border-b bg-inherit px-3 py-3">
                      <Link
                        href={buildKpiHref(row, admin.selectedPeriodId)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-emerald-200 bg-white text-[#059669] hover:bg-emerald-50"
                        title="Xem KPI cá nhân"
                      >
                        <Eye size={16} />
                      </Link>
                    </td>
                    <td className="border-b px-3 py-3"><RankBadge rank={row.rank || row.rank_overall} /></td>
                    <td className="sticky left-[58px] z-10 border-b bg-inherit px-3 py-3">
                      <div className="text-sm font-bold text-slate-800">{getEmployeeName(row.user)}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <RoleBadge roleType={row.user.role_type} />
                        <span className="truncate">{row.user.employee_code || row.user.email || "-"}</span>
                      </div>
                    </td>
                    <td className="border-b px-3 py-3 text-sm font-medium text-slate-600">{row.user.branch_name || "-"}</td>
                    <td className={`border-b px-3 py-3 text-right font-bold ${getScoreClass(row.part_a_score || row.manual_score)}`}>
                      {formatPercent(row.part_a_score || row.manual_score)}
                    </td>
                    <td className={`border-b px-3 py-3 text-right font-bold ${getScoreClass(row.part_b_score || row.auto_score)}`}>
                      {formatPercent(row.part_b_score || row.auto_score)}
                    </td>
                    <td className="border-b px-3 py-3 text-right">
                      <span className={`rounded px-2 py-1 text-sm font-bold ${getTotalBadgeClass(row.total_score)}`}>
                        {formatPercent(row.total_score)}
                      </span>
                    </td>
                    {metrics.map((metric) => {
                      const result = metricMap.get(metric.id) || metricCodeMap.get(metric.metric_code);
                      const actual = result?.actual_value ?? result?.score ?? null;
                      const target = result?.target_value;

                      return (
                        <td key={metric.id} className="border-b px-2 py-3 text-center" title={`${metric.metric_code} - ${metric.metric_name}`}>
                          <div className="text-sm font-bold text-slate-800">{formatNumber(actual, 0)}</div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            / {target ? formatNumber(target, 0) : "—"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
