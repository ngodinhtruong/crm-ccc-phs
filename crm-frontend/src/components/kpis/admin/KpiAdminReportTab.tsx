"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CircleDollarSign,
  Phone,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { KpiAdminController } from "@/hooks/useKpiAdmin";
import {
  KpiAdminMetricResult,
  KpiAdminOperationalBranchRow,
  KpiAdminOperationalEmployeeRow,
  KpiAdminRankingRow,
} from "@/types/kpi.type";
import { formatNumber, getEmployeeName, toNumber } from "./KpiAdminUtils";

type ReportTab = "employee" | "branch";
type OperationalKey = "calls" | "activated" | "fee" | "value";

type EmployeeKpiRow = {
  rank: number;
  source?: KpiAdminRankingRow;
  userId: number;
  employeeName: string;
  branchId?: number | null;
  branchName: string;
  roleType: string;
  calls: number;
  activated: number;
  fee: number;
  value: number;
  activationRate: number;
  feePerCall: number;
  valuePerCall: number;
};

type BranchKpiRow = {
  branchId?: number | null;
  branchName: string;
  employeeCount: number;
  calls: number;
  activated: number;
  fee: number;
  value: number;
  activationRate: number;
  feePerCall: number;
  valuePerCall: number;
};

type EmployeeChartRow = {
  name: string;
  employeeName: string;
  branchName: string;
  calls: number;
  activated: number;
  fee: number;
  value: number;
  activationRate: number;
  feePerCall: number;
  valuePerCall: number;
};

type BranchChartRow = {
  name: string;
  branchName: string;
  calls: number;
  activated: number;
  fee: number;
  value: number;
  activationRate: number;
  feePerCall: number;
  valuePerCall: number;
  employeeCount: number;
};

const topLimitOptions = [3, 5, 10, 15, 20];
const chartPalette = ["#0097cf", "#16a34a", "#f59e0b", "#7c3aed", "#ef4444", "#0f766e", "#475569"];

function safeNumber(value?: string | number | null) {
  return toNumber(value);
}

function normalizeSearchText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function metricSource(metric?: Partial<KpiAdminMetricResult> | null) {
  return normalizeSearchText(
    `${metric?.metric_code || ""} ${metric?.metric_name || ""} ${metric?.group_code || ""}`
  );
}

function isRatioMetric(source: string) {
  return (
    source.includes("ty le") ||
    source.includes("rate") ||
    source.includes("percent") ||
    source.includes("ti le") ||
    source.includes("%")
  );
}

function getFallbackOperationalKey(metric: Partial<KpiAdminMetricResult>): OperationalKey | null {
  const source = metricSource(metric);

  if (isRatioMetric(source)) return null;

  if (
    source.includes("phi gd") ||
    source.includes("phi giao dich") ||
    source.includes("transaction fee") ||
    source.includes("fee")
  ) {
    return "fee";
  }

  if (
    source.includes("gia tri gd") ||
    source.includes("gia tri giao dich") ||
    source.includes("transaction value") ||
    source.includes("gtgd") ||
    source.includes("ltv")
  ) {
    return "value";
  }

  if (
    source.includes("so tk kich hoat") ||
    source.includes("tk kich hoat") ||
    source.includes("tai kich hoat") ||
    source.includes("aar tai kh") ||
    source.includes("reactivat")
  ) {
    return "activated";
  }

  if (
    source.includes("so kh goi") ||
    source.includes("kh da goi") ||
    source.includes("khach hang da goi") ||
    source.includes("tong cuoc goi") ||
    source.includes("call count")
  ) {
    return "calls";
  }

  return null;
}

function metricActualValue(metric: KpiAdminMetricResult) {
  return safeNumber(metric.actual_value);
}

function sumFallbackMetricValue(row: KpiAdminRankingRow, key: OperationalKey) {
  return (row.metrics || []).reduce((sum, metric) => {
    if (getFallbackOperationalKey(metric) !== key) return sum;
    return sum + metricActualValue(metric);
  }, 0);
}

function formatCurrencyShort(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)} tr`;
  if (Math.abs(value) >= 1_000) return `${formatNumber(value / 1_000, 1)} nghìn`;
  return formatNumber(value, 0);
}

function formatCurrencyFull(value: number) {
  return `${formatNumber(value, 0)} VNĐ`;
}

function getMaxValue<T>(items: T[], getter: (item: T) => number) {
  return Math.max(1, ...items.map(getter));
}

function getRate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function compactLabel(value: string, maxLength = 15) {
  const cleanValue = String(value || "-").trim();
  if (cleanValue.length <= maxLength) return cleanValue;
  return `${cleanValue.slice(0, maxLength - 1)}…`;
}

function getChartValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countFormatter(value: unknown) {
  return formatNumber(getChartValue(value));
}

function percentFormatter(value: unknown) {
  return `${formatNumber(getChartValue(value), 1)}%`;
}

function currencyFormatter(value: unknown) {
  return formatCurrencyShort(getChartValue(value));
}

function currencyFullFormatter(value: unknown) {
  return formatCurrencyFull(getChartValue(value));
}

function hasChartData<T>(rows: T[], getter: (row: T) => number) {
  return rows.some((row) => getter(row) > 0);
}

function toEmployeeChartRows(rows: EmployeeKpiRow[]): EmployeeChartRow[] {
  return rows.map((row) => ({
    name: compactLabel(row.employeeName, 14),
    employeeName: row.employeeName,
    branchName: row.branchName,
    calls: row.calls,
    activated: row.activated,
    fee: row.fee,
    value: row.value,
    activationRate: row.activationRate,
    feePerCall: row.feePerCall,
    valuePerCall: row.valuePerCall,
  }));
}

function toBranchChartRows(rows: BranchKpiRow[]): BranchChartRow[] {
  return rows.map((row) => ({
    name: compactLabel(row.branchName, 14),
    branchName: row.branchName,
    calls: row.calls,
    activated: row.activated,
    fee: row.fee,
    value: row.value,
    activationRate: row.activationRate,
    feePerCall: row.feePerCall,
    valuePerCall: row.valuePerCall,
    employeeCount: row.employeeCount,
  }));
}

function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
          <div className="mt-1 text-xs font-medium text-slate-400">{unit}</div>
        </div>
        <div className="rounded-md bg-emerald-50 p-2 text-[#059669]">{icon}</div>
      </div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function TopList({
  title,
  icon,
  rows,
  valueKey,
  valueFormatter,
}: {
  title: string;
  icon: ReactNode;
  rows: EmployeeKpiRow[];
  valueKey: OperationalKey;
  valueFormatter: (value: number) => string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center gap-2 border-b bg-white px-4">
        <div className="text-[#059669]">{icon}</div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu.</div>
        ) : (
          rows.map((row, index) => {
            const value = row[valueKey];

            return (
              <div key={`${valueKey}-${row.userId}`} className="px-4 py-3 hover:bg-[#f8fafc]">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-bold text-slate-400">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{row.employeeName}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <span className="truncate">{row.branchName}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {row.roleType}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold text-slate-800">{valueFormatter(value)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 text-[#059669]">{icon}</div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="h-[300px]">{children}</div>
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-[#f8fafc] text-sm text-slate-500">
      Chưa có dữ liệu biểu đồ.
    </div>
  );
}

function EmployeeCallActivationChart({ rows }: { rows: EmployeeKpiRow[] }) {
  const data = toEmployeeChartRows(rows);

  return (
    <ChartCard
      title="Cuộc gọi và TK kích hoạt theo nhân viên"
      description="So sánh khối lượng gọi với kết quả kích hoạt để nhìn được cả lượng và chất."
      icon={<BarChart3 size={16} />}
    >
      {!hasChartData(data, (row) => row.calls + row.activated) ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={countFormatter} labelFormatter={(label) => `Nhân viên: ${label}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="calls" name="Cuộc gọi" fill="#0097cf" radius={[4, 4, 0, 0]} />
            <Bar dataKey="activated" name="TK kích hoạt" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function EmployeeFeeRankingChart({ rows }: { rows: EmployeeKpiRow[] }) {
  const data = toEmployeeChartRows(rows);

  return (
    <ChartCard
      title="Top phí giao dịch theo nhân viên"
      description="Biểu đồ thanh ngang có trục đo, phù hợp để đọc thứ hạng doanh thu phí."
      icon={<CircleDollarSign size={16} />}
    >
      {!hasChartData(data, (row) => row.fee) ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, left: 42, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={currencyFormatter} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={82} />
            <Tooltip formatter={currencyFullFormatter} labelFormatter={(label) => `Nhân viên: ${label}`} />
            <Bar dataKey="fee" name="Phí GD" fill="#0097cf" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function EmployeeConversionChart({ rows }: { rows: EmployeeKpiRow[] }) {
  const data = toEmployeeChartRows(rows.filter((row) => row.calls > 0));

  return (
    <ChartCard
      title="Tỷ lệ kích hoạt theo nhân viên"
      description="Dùng cột để so sánh hiệu quả chuyển đổi giữa các nhân viên."
      icon={<Target size={16} />}
    >
      {!hasChartData(data, (row) => row.activationRate) ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={percentFormatter} labelFormatter={(label) => `Nhân viên: ${label}`} />
            <Bar dataKey="activationRate" name="Tỷ lệ kích hoạt" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function EmployeeCallFeeScatter({ rows }: { rows: EmployeeKpiRow[] }) {
  const data = toEmployeeChartRows(rows.filter((row) => row.calls > 0 || row.fee > 0));

  return (
    <ChartCard
      title="Cuộc gọi so với phí giao dịch"
      description="Biểu đồ phân tán giúp nhận biết gọi nhiều có tạo ra phí tương ứng hay không."
      icon={<Activity size={16} />}
    >
      {!hasChartData(data, (row) => row.calls + row.fee) ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, left: -18, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="calls"
              name="Cuộc gọi"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <YAxis type="number" dataKey="fee" name="Phí GD" tick={{ fontSize: 11 }} tickFormatter={currencyFormatter} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value, name) => (name === "Phí GD" ? currencyFullFormatter(value) : countFormatter(value))}
              labelFormatter={() => ""}
            />
            <Scatter name="Nhân viên" data={data} fill="#0097cf" />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function BranchCallActivationChart({ rows }: { rows: BranchKpiRow[] }) {
  const data = toBranchChartRows(rows);

  return (
    <ChartCard
      title="Cuộc gọi và TK kích hoạt theo chi nhánh"
      description="So sánh lượng chăm sóc và kết quả kích hoạt giữa các chi nhánh."
      icon={<Building2 size={16} />}
    >
      {!hasChartData(data, (row) => row.calls + row.activated) ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={countFormatter} labelFormatter={(label) => `Chi nhánh: ${label}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="calls" name="Cuộc gọi" fill="#0097cf" radius={[4, 4, 0, 0]} />
            <Bar dataKey="activated" name="TK kích hoạt" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function BranchRevenueChart({ rows }: { rows: BranchKpiRow[] }) {
  const data = toBranchChartRows(rows);

  return (
    <ChartCard
      title="Phí GD và Giá trị GD theo chi nhánh"
      description="Nhìn nhanh chi nhánh nào tạo doanh thu phí và quy mô giao dịch lớn."
      icon={<TrendingUp size={16} />}
    >
      {!hasChartData(data, (row) => row.fee + row.value) ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={currencyFormatter} />
            <Tooltip formatter={currencyFullFormatter} labelFormatter={(label) => `Chi nhánh: ${label}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="fee" name="Phí GD" fill="#0097cf" radius={[4, 4, 0, 0]} />
            <Bar dataKey="value" name="Giá trị GD" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function BranchFeeSharePie({ rows }: { rows: BranchKpiRow[] }) {
  const data = toBranchChartRows(rows)
    .filter((row) => row.fee > 0)
    .map((row) => ({ name: row.name, branchName: row.branchName, fee: row.fee }));

  return (
    <ChartCard
      title="Cơ cấu phí GD theo chi nhánh"
      description="Biểu đồ tròn chỉ dùng cho tỷ trọng đóng góp trên tổng phí."
      icon={<CircleDollarSign size={16} />}
    >
      {data.length === 0 ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="fee" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={`fee-share-${entry.name}`} fill={chartPalette[index % chartPalette.length]} />
              ))}
            </Pie>
            <Tooltip formatter={currencyFullFormatter} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function BranchConversionChart({ rows }: { rows: BranchKpiRow[] }) {
  const data = toBranchChartRows(rows.filter((row) => row.calls > 0));

  return (
    <ChartCard
      title="Tỷ lệ kích hoạt theo chi nhánh"
      description="So sánh chất lượng chuyển đổi, không chỉ nhìn số lượng cuộc gọi."
      icon={<Target size={16} />}
    >
      {!hasChartData(data, (row) => row.activationRate) ? (
        <NoChartData />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={percentFormatter} labelFormatter={(label) => `Chi nhánh: ${label}`} />
            <Bar dataKey="activationRate" name="Tỷ lệ kích hoạt" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function RatioCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-[#f8fafc] px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{description}</div>
    </div>
  );
}

function mapOperationalEmployee(row: KpiAdminOperationalEmployeeRow, index: number): EmployeeKpiRow {
  return {
    rank: index + 1,
    userId: row.user.id,
    employeeName: getEmployeeName(row.user),
    branchId: row.branch_id,
    branchName: row.branch_name || row.user.branch_name || "Chưa có chi nhánh",
    roleType: row.user.role_type || "SA",
    calls: safeNumber(row.call_count),
    activated: safeNumber(row.activated_account_count),
    fee: safeNumber(row.transaction_fee),
    value: safeNumber(row.transaction_value),
    activationRate: safeNumber(row.activation_rate),
    feePerCall: safeNumber(row.fee_per_call),
    valuePerCall: safeNumber(row.value_per_call),
  };
}

function mapFallbackEmployee(row: KpiAdminRankingRow, index: number): EmployeeKpiRow {
  const calls = sumFallbackMetricValue(row, "calls");
  const activated = sumFallbackMetricValue(row, "activated");
  const fee = sumFallbackMetricValue(row, "fee");
  const value = sumFallbackMetricValue(row, "value");

  return {
    rank: row.rank || index + 1,
    source: row,
    userId: row.user.id,
    employeeName: getEmployeeName(row.user),
    branchId: row.user.branch_id,
    branchName: row.user.branch_name || "Chưa có chi nhánh",
    roleType: row.user.role_type || "SA",
    calls,
    activated,
    fee,
    value,
    activationRate: getRate(activated, calls),
    feePerCall: calls > 0 ? fee / calls : 0,
    valuePerCall: calls > 0 ? value / calls : 0,
  };
}

function mapOperationalBranch(row: KpiAdminOperationalBranchRow): BranchKpiRow {
  return {
    branchId: row.branch_id,
    branchName: row.branch_name || "Chưa có chi nhánh",
    employeeCount: safeNumber(row.employee_count),
    calls: safeNumber(row.call_count),
    activated: safeNumber(row.activated_account_count),
    fee: safeNumber(row.transaction_fee),
    value: safeNumber(row.transaction_value),
    activationRate: safeNumber(row.activation_rate),
    feePerCall: safeNumber(row.fee_per_call),
    valuePerCall: safeNumber(row.value_per_call),
  };
}

export function KpiAdminReportTab({ admin }: { admin: KpiAdminController }) {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>("employee");
  const [topLimit, setTopLimit] = useState(5);

  const employeeRows = useMemo<EmployeeKpiRow[]>(() => {
    const operationalEmployees = admin.report?.operational?.employees;

    if (operationalEmployees) {
      return operationalEmployees.map(mapOperationalEmployee);
    }

    return (admin.ranking?.results || []).map(mapFallbackEmployee);
  }, [admin.ranking?.results, admin.report?.operational?.employees]);

  const branchRows = useMemo<BranchKpiRow[]>(() => {
    const operationalBranches = admin.report?.operational?.branches;

    if (operationalBranches) {
      return operationalBranches.map(mapOperationalBranch);
    }

    const map = new Map<string, BranchKpiRow>();

    employeeRows.forEach((row) => {
      const key = String(row.branchId ?? row.branchName);
      const current = map.get(key) || {
        branchId: row.branchId,
        branchName: row.branchName,
        employeeCount: 0,
        calls: 0,
        activated: 0,
        fee: 0,
        value: 0,
        activationRate: 0,
        feePerCall: 0,
        valuePerCall: 0,
      };

      current.employeeCount += 1;
      current.calls += row.calls;
      current.activated += row.activated;
      current.fee += row.fee;
      current.value += row.value;
      current.activationRate = getRate(current.activated, current.calls);
      current.feePerCall = current.calls > 0 ? current.fee / current.calls : 0;
      current.valuePerCall = current.calls > 0 ? current.value / current.calls : 0;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.calls - a.calls || b.fee - a.fee);
  }, [admin.report?.operational?.branches, employeeRows]);

  const overview = useMemo(() => {
    const operationalOverview = admin.report?.operational?.overview;

    if (operationalOverview) {
      return {
        calls: safeNumber(operationalOverview.call_count),
        activated: safeNumber(operationalOverview.activated_account_count),
        fee: safeNumber(operationalOverview.transaction_fee),
        value: safeNumber(operationalOverview.transaction_value),
        activationRate: safeNumber(operationalOverview.activation_rate),
        feePerCall: safeNumber(operationalOverview.fee_per_call),
        valuePerCall: safeNumber(operationalOverview.value_per_call),
      };
    }

    return employeeRows.reduce(
      (total, row) => {
        const calls = total.calls + row.calls;
        const activated = total.activated + row.activated;
        const fee = total.fee + row.fee;
        const value = total.value + row.value;

        return {
          calls,
          activated,
          fee,
          value,
          activationRate: getRate(activated, calls),
          feePerCall: calls > 0 ? fee / calls : 0,
          valuePerCall: calls > 0 ? value / calls : 0,
        };
      },
      { calls: 0, activated: 0, fee: 0, value: 0, activationRate: 0, feePerCall: 0, valuePerCall: 0 }
    );
  }, [admin.report?.operational?.overview, employeeRows]);

  const topCalls = useMemo(
    () => [...employeeRows].sort((a, b) => b.calls - a.calls).slice(0, topLimit),
    [employeeRows, topLimit]
  );
  const topActivated = useMemo(
    () => [...employeeRows].sort((a, b) => b.activated - a.activated).slice(0, topLimit),
    [employeeRows, topLimit]
  );
  const topFeeValue = useMemo(
    () => [...employeeRows].sort((a, b) => b.fee - a.fee || b.value - a.value).slice(0, topLimit),
    [employeeRows, topLimit]
  );
  const topActivationRate = useMemo(
    () => [...employeeRows].filter((row) => row.calls > 0).sort((a, b) => b.activationRate - a.activationRate).slice(0, topLimit),
    [employeeRows, topLimit]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex rounded-md border border-slate-200 bg-[#f8fafc] p-0.5">
          <button
            type="button"
            onClick={() => setActiveReportTab("employee")}
            className={[
              "h-8 rounded px-3 text-sm font-bold transition",
              activeReportTab === "employee"
                ? "bg-white text-[#059669] shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            KPI theo nhân viên
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab("branch")}
            className={[
              "h-8 rounded px-3 text-sm font-bold transition",
              activeReportTab === "branch"
                ? "bg-white text-[#059669] shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            KPI theo chi nhánh
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Hiển thị</span>
          <select
            value={topLimit}
            onChange={(event) => setTopLimit(Number(event.target.value))}
            className="h-8 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400"
          >
            {topLimitOptions.map((value) => (
              <option key={value} value={value}>
                Top {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeReportTab === "employee" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tổng cuộc gọi"
              value={formatNumber(overview.calls)}
              unit="Lượt gọi/record SA"
              hint="Đếm trực tiếp từ SA Record trong kỳ KPI."
              icon={<Phone size={20} />}
            />
            <StatCard
              label="TK kích hoạt"
              value={formatNumber(overview.activated)}
              unit="Tài khoản"
              hint={`Tỷ lệ kích hoạt: ${formatNumber(overview.activationRate, 1)}%`}
              icon={<RefreshCw size={20} />}
            />
            <StatCard
              label="Phí GD"
              value={formatCurrencyShort(overview.fee)}
              unit="VNĐ"
              hint={`TB/cuộc gọi: ${formatCurrencyShort(overview.feePerCall)}`}
              icon={<CircleDollarSign size={20} />}
            />
            <StatCard
              label="Giá trị GD"
              value={formatCurrencyShort(overview.value)}
              unit="VNĐ"
              hint={`TB/cuộc gọi: ${formatCurrencyShort(overview.valuePerCall)}`}
              icon={<TrendingUp size={20} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <TopList
              title="Top NV gọi nhiều KH nhất"
              icon={<Phone size={16} />}
              rows={topCalls}
              valueKey="calls"
              valueFormatter={(value) => formatNumber(value)}
            />
            <TopList
              title="Top NV có TK kích hoạt"
              icon={<RefreshCw size={16} />}
              rows={topActivated}
              valueKey="activated"
              valueFormatter={(value) => formatNumber(value)}
            />
            <TopList
              title="Top NV theo Phí/Giá trị GD"
              icon={<CircleDollarSign size={16} />}
              rows={topFeeValue}
              valueKey="fee"
              valueFormatter={(value) => formatCurrencyShort(value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <EmployeeCallActivationChart rows={topCalls} />
            <EmployeeFeeRankingChart rows={topFeeValue} />
            <EmployeeConversionChart rows={topActivationRate} />
            <EmployeeCallFeeScatter rows={employeeRows} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <RatioCard
              label="Tỷ lệ kích hoạt chung"
              value={`${formatNumber(overview.activationRate, 1)}%`}
              description="TK kích hoạt / tổng cuộc gọi"
            />
            <RatioCard
              label="Phí GD / cuộc gọi"
              value={formatCurrencyShort(overview.feePerCall)}
              description="Đánh giá hiệu quả doanh thu phí"
            />
            <RatioCard
              label="Giá trị GD / cuộc gọi"
              value={formatCurrencyShort(overview.valuePerCall)}
              description="Đánh giá hiệu quả giá trị giao dịch"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <BranchCallActivationChart rows={branchRows} />
            <BranchRevenueChart rows={branchRows} />
            <BranchFeeSharePie rows={branchRows} />
            <BranchConversionChart rows={branchRows} />
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 items-center gap-2 border-b bg-white px-4">
              <Building2 size={16} className="text-[#059669]" />
              <h3 className="text-sm font-bold text-slate-800">Theo chi nhánh</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
                <thead>
                  <tr className="h-10 border-b bg-[#f8fafc] text-slate-700">
                    <th className="w-[240px] px-4 font-bold">Chi nhánh</th>
                    <th className="w-[130px] px-4 text-right font-bold">Cuộc gọi</th>
                    <th className="w-[140px] px-4 text-right font-bold">TK kích hoạt</th>
                    <th className="w-[130px] px-4 text-right font-bold">Tỷ lệ KH</th>
                    <th className="w-[170px] px-4 text-right font-bold">Tổng Phí GD</th>
                    <th className="w-[190px] px-4 text-right font-bold">Tổng Giá trị GD</th>
                    <th className="w-[150px] px-4 text-right font-bold">Phí/cuộc gọi</th>
                    <th className="w-[100px] px-4 text-right font-bold">NV</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                        Chưa có dữ liệu chi nhánh.
                      </td>
                    </tr>
                  ) : (
                    branchRows.map((row, index) => (
                      <tr key={row.branchId ?? row.branchName} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="border-b px-4 py-3 font-semibold text-slate-800">{row.branchName}</td>
                        <td className="border-b px-4 py-3 text-right font-semibold text-slate-700">{formatNumber(row.calls)}</td>
                        <td className="border-b px-4 py-3 text-right font-semibold text-slate-700">{formatNumber(row.activated)}</td>
                        <td className="border-b px-4 py-3 text-right font-semibold text-slate-700">{formatNumber(row.activationRate, 1)}%</td>
                        <td className="border-b px-4 py-3 text-right font-semibold text-slate-700" title={formatCurrencyFull(row.fee)}>
                          {formatCurrencyShort(row.fee)}
                        </td>
                        <td className="border-b px-4 py-3 text-right font-semibold text-slate-700" title={formatCurrencyFull(row.value)}>
                          {formatCurrencyShort(row.value)}
                        </td>
                        <td className="border-b px-4 py-3 text-right font-semibold text-slate-700" title={formatCurrencyFull(row.feePerCall)}>
                          {formatCurrencyShort(row.feePerCall)}
                        </td>
                        <td className="border-b px-4 py-3 text-right text-slate-500">{formatNumber(row.employeeCount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {branchRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t bg-slate-50 text-sm font-bold text-slate-800">
                      <td className="px-4 py-3">Tổng</td>
                      <td className="px-4 py-3 text-right">{formatNumber(overview.calls)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(overview.activated)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(overview.activationRate, 1)}%</td>
                      <td className="px-4 py-3 text-right" title={formatCurrencyFull(overview.fee)}>{formatCurrencyShort(overview.fee)}</td>
                      <td className="px-4 py-3 text-right" title={formatCurrencyFull(overview.value)}>{formatCurrencyShort(overview.value)}</td>
                      <td className="px-4 py-3 text-right" title={formatCurrencyFull(overview.feePerCall)}>{formatCurrencyShort(overview.feePerCall)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(employeeRows.length)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
