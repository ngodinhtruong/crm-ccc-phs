"use client";

import { useMemo, useState } from "react";
import { Layers3, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ExpandableChartCard } from "@/components/common";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import {
  CHART_COLORS,
  formatCompactMoney,
  formatMoney,
  formatNumber,
  toNumber,
} from "@/components/sale-admin/dashboard/SaleAdminDashboardUtils";
import {
  SaAdminAccountRow,
  SaAdminCustomerGroupRow,
  SaAdminDashboardResponse,
} from "@/types/sale-admin-dashboard.type";
import { GranularityMode, CompareMode } from "@/components/tickets/dashboard/CccDashboardUtils";

type LooseCustomerGroupRow = SaAdminCustomerGroupRow & {
  id?: string | number | null;
  code?: string | null;
  name?: string | null;
  label?: string | null;
  icp_code?: string | null;
  icp_type?: string | null;
};

function getGroupCode(row: LooseCustomerGroupRow, index = 0) {
  return (
    row.group_code ||
    row.icp_code ||
    row.code ||
    row.icp_type ||
    (row.id !== undefined && row.id !== null ? String(row.id) : "") ||
    `G${index + 1}`
  );
}

function groupLabel(row: LooseCustomerGroupRow, index = 0) {
  return (
    row.group_label ||
    row.group_name ||
    row.label ||
    row.name ||
    getGroupCode(row, index) ||
    "Chưa phân nhóm"
  );
}

function getGranularityLabelFromResponse(res: SaAdminDashboardResponse, granularity: GranularityMode = "MONTH"): string {
  const year = res.period?.year || (res.period?.date_from ? new Date(res.period.date_from).getFullYear() : null);
  const month = res.period?.month || (res.period?.date_from ? new Date(res.period.date_from).getMonth() + 1 : null);

  if (granularity === "QUARTER" && month && year) {
    const q = Math.floor((Number(month) - 1) / 3) + 1;
    return `Q${q}/${year}`;
  }

  if (granularity === "YEAR" && year) {
    return `${year}`;
  }

  if (month && year) {
    return `T${Number(month)}/${year}`;
  }

  if (res.period?.label) {
    const match = String(res.period.label).match(/(\d{4})[-/](\d{1,2})/) || String(res.period.label).match(/(\d{1,2})[-/](\d{4})/);
    if (match) {
      if (match[1].length === 4) return `T${Number(match[2])}/${match[1]}`;
      return `T${Number(match[1])}/${match[2]}`;
    }
    return res.period.label;
  }

  return "—";
}

function AccountModal({
  group,
  onClose,
}: {
  group: SaAdminCustomerGroupRow | null;
  onClose: () => void;
}) {
  useEscapeKey(onClose, Boolean(group));

  if (!group) return null;

  const accounts: SaAdminAccountRow[] = group.accounts || [];
  const looseGroup = group as LooseCustomerGroupRow;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="max-h-[82vh] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0097cf]">
              Chi tiết phân nhóm KH
            </p>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              {groupLabel(looseGroup)}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {formatNumber(group.count)} tài khoản · Phí GD {formatCompactMoney(group.transaction_fee)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="h-10 border-b border-slate-100 bg-white text-[11px] text-slate-500">
                <th className="px-3 font-semibold">Số TK</th>
                <th className="px-3 font-semibold">Khách hàng</th>
                <th className="px-3 font-semibold">Chi nhánh</th>
                <th className="px-3 font-semibold">PIC</th>
                <th className="px-3 text-right font-semibold">Phí GD</th>
                <th className="px-3 text-right font-semibold">GT GD</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Chưa có danh sách tài khoản cho nhóm này.
                  </td>
                </tr>
              ) : (
                accounts.map((account, index) => (
                  <tr
                    key={`${account.account_no || "account"}-${index}`}
                    className={`h-11 border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                  >
                    <td className="px-3 font-semibold text-[#007ead]">
                      {account.account_no || "-"}
                    </td>
                    <td className="px-3 text-slate-700">{account.customer_name || "-"}</td>
                    <td className="px-3 text-slate-600">{account.branch_name || "-"}</td>
                    <td className="px-3 text-slate-600">{account.pic_name || "-"}</td>
                    <td
                      className="px-3 text-right font-semibold text-amber-600"
                      title={formatMoney(account.transaction_fee)}
                    >
                      {formatCompactMoney(account.transaction_fee)}
                    </td>
                    <td
                      className="px-3 text-right text-slate-600"
                      title={formatMoney(account.transaction_value)}
                    >
                      {formatCompactMoney(account.transaction_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum: number, item: any) => sum + toNumber(item.value), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 text-xs shadow-xl backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 font-bold text-slate-800">
        <span>{label}</span>
        <span className="text-[#0097cf]">Tổng: {formatNumber(total)} TK</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-600">{item.name}</span>
            </div>
            <span className="font-bold text-slate-900">{formatNumber(item.value)} TK</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerGroupDistributionPanel({
  rows = [],
  historyData = [],
  month,
  year,
  periodLabel,
  granularity = "MONTH",
  compareMode = "NONE",
}: {
  rows?: SaAdminCustomerGroupRow[];
  historyData?: SaAdminDashboardResponse[];
  month?: string | number;
  year?: string | number;
  periodLabel?: string;
  granularity?: GranularityMode;
  compareMode?: CompareMode;
}) {
  const [selectedGroup, setSelectedGroup] = useState<SaAdminCustomerGroupRow | null>(null);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
    [rows]
  );
  const totalFee = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.transaction_fee || 0), 0),
    [rows]
  );

  const normalizedRows = useMemo(() => {
    return rows.map((row, index) => {
      const looseRow = row as LooseCustomerGroupRow;
      const code = getGroupCode(looseRow, index);
      const label = groupLabel(looseRow, index);
      const count = Number(row.count || 0);
      const percent = row.percent ?? (total ? (count / total) * 100 : 0);

      return {
        row,
        code,
        label,
        count,
        percent,
        color: CHART_COLORS[index % CHART_COLORS.length],
        key: `${code}-${label}-${index}`,
      };
    });
  }, [rows, total]);

  const { chartData, groupKeys } = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      const currLabel = (month && year) ? `T${Number(month)}/${year}` : (periodLabel || "Kỳ hiện tại");
      const singlePoint: Record<string, any> = {
        monthLabel: currLabel,
      };
      const keys = normalizedRows.map((r) => r.label);
      normalizedRows.forEach((r) => {
        singlePoint[r.label] = r.count;
      });
      return {
        chartData: [singlePoint],
        groupKeys: keys,
      };
    }

    const allGroupLabels = new Set<string>();
    historyData.forEach((res) => {
      (res.customer_group_distribution || []).forEach((row, idx) => {
        const lbl = groupLabel(row as LooseCustomerGroupRow, idx);
        allGroupLabels.add(lbl);
      });
    });

    const keys = Array.from(allGroupLabels);

    const pointsMap = new Map<string, Record<string, number>>();

    historyData.forEach((res) => {
      const label = getGranularityLabelFromResponse(res, granularity);
      if (!pointsMap.has(label)) {
        pointsMap.set(label, {});
      }
      const currentObj = pointsMap.get(label)!;
      keys.forEach((gLabel) => {
        const found = (res.customer_group_distribution || []).find(
          (row, idx) => groupLabel(row as LooseCustomerGroupRow, idx) === gLabel
        );
        const cnt = found ? toNumber(found.count) : 0;
        currentObj[gLabel] = (currentObj[gLabel] || 0) + cnt;
      });
    });

    const points = Array.from(pointsMap.entries()).map(([monthLabel, gMap]) => ({
      monthLabel,
      ...gMap,
    }));

    return {
      chartData: points,
      groupKeys: keys,
    };
  }, [historyData, normalizedRows, month, year, periodLabel, granularity]);

  const hasData = chartData.some((point: Record<string, any>) =>
    groupKeys.some((key) => (point[key] || 0) > 0)
  );

  const granularityDesc = granularity === "QUARTER" ? "theo Quý" : granularity === "YEAR" ? "theo Năm" : "theo Tháng";
  const compareDesc = compareMode === "YOY" ? " (So sánh cùng kỳ YoY)" : compareMode === "QOQ" ? " (So sánh kỳ trước QoQ)" : "";

  return (
    <>
      <ExpandableChartCard
        title="Phân nhóm Khách hàng"
        description={`Biến động số lượng tài khoản theo phân nhóm ${granularityDesc}${compareDesc} (Click nhóm bên dưới để xem tài khoản)`}
        className="h-full"
        headerRight={
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {formatNumber(total)} TK
          </span>
        }
      >
        {(isExpanded) => (
          <div className="space-y-4">
            <div style={{ width: "100%", height: isExpanded ? 450 : 320 }}>
              {!hasData ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                  Chưa có dữ liệu phân nhóm.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 16, right: 16, left: 0, bottom: 12 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatNumber}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} isAnimationActive={false} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
                    {groupKeys.map((gLabel, index) => (
                      <Bar
                        key={gLabel}
                        dataKey={gLabel}
                        name={gLabel}
                        stackId="groupStack"
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        radius={index === groupKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        maxBarSize={56}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sub-panel showing current month groups with clickable drill-down
            {normalizedRows.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">
                    Danh sách nhóm tháng hiện tại ({formatNumber(total)} TK · Phí GD {formatCompactMoney(totalFee)})
                  </p>
                  <span className="text-[11px] text-slate-400">Bấm nhóm để xem danh sách tài khoản</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {normalizedRows.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedGroup(item.row)}
                      className="group flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-left ring-1 ring-slate-200/60 transition hover:bg-sky-50 hover:ring-sky-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-xs font-semibold text-slate-800">
                          {item.label}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900">
                          {formatNumber(item.count)} TK
                        </span>
                        <span className="ml-1.5 text-[10px] text-slate-500 font-medium">
                          ({Number(item.percent || 0).toFixed(1)}%)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )} */}
          </div>
        )}
      </ExpandableChartCard>

      <AccountModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />
    </>
  );
}
