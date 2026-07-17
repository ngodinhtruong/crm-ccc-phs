"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Save, SquareCheckBig, X } from "lucide-react";

import {
  ColumnSelectFilter,
  ColumnTextFilter,
  TablePagination,
} from "@/components/common";
import { KpiAdminController } from "@/hooks/useKpiAdmin";
import { KpiAdminTargetRow } from "@/types/kpi.type";
import {
  formatNumber,
  getEmployeeName,
  getMetricShortName,
  getRoleBadgeLabel,
} from "./KpiAdminUtils";

const PAGE_SIZE = 20;

type TargetStatusFilter = "" | "HAS_TARGET" | "MISSING_TARGET";

function RoleBadge({ roleType }: { roleType?: string | null }) {
  const isSup = roleType === "SUP";

  return (
    <span
      className={[
        "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
        isSup ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700",
      ].join(" ")}
    >
      {getRoleBadgeLabel(roleType)}
    </span>
  );
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getBranchKey(row: KpiAdminTargetRow) {
  return String(row.user.branch_id ?? row.user.branch_name ?? "");
}

function hasAssignedTarget(row: KpiAdminTargetRow, metricIds: number[]) {
  return metricIds.some((metricId) => {
    const target = row.targets[String(metricId)];
    return Boolean(target?.target_value !== null && target?.target_value !== undefined && target?.target_value !== "");
  });
}

function formatTargetValue(value?: string | number | null, unit?: string | null) {
  if (value === null || value === undefined || value === "") return "-";

  const digits = unit === "PERCENT" ? 1 : 0;
  const suffix = unit === "PERCENT" ? "%" : "";

  return `${formatNumber(value, digits)}${suffix}`;
}

function formatUnit(unit?: string | null) {
  if (!unit) return "-";
  if (unit === "COUNT") return "SL";
  if (unit === "PERCENT") return "%";
  if (unit === "VND") return "VNĐ";
  return unit;
}

export function KpiAdminTargetsTab({ admin }: { admin: KpiAdminController }) {
  const targets = admin.targets;
  const canManage = Boolean(admin.meta?.can_manage_targets && targets);
  const rows = targets?.rows || [];
  const metrics = targets?.metrics || [];
  const metricIds = useMemo(() => metrics.map((metric) => metric.id), [metrics]);
  const firstUserId = rows[0]?.user.id;
  const sourceUser = rows[0]?.user;

  const [page, setPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [employeeCodeFilter, setEmployeeCodeFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [targetStatusFilter, setTargetStatusFilter] = useState<TargetStatusFilter>("");

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      const key = getBranchKey(row);
      if (!key) return;
      map.set(key, row.user.branch_name || `Chi nhánh ${key}`);
    });

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const metricResultMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof admin.ranking>["results"][number]["metrics"][number]>();

    (admin.ranking?.results || []).forEach((row) => {
      row.metrics.forEach((metric) => {
        map.set(`${row.user.id}-${metric.metric_id}`, metric);
      });
    });

    return map;
  }, [admin.ranking]);

  const filteredRows = useMemo(() => {
    const nameKeyword = normalizeText(nameFilter);
    const codeKeyword = normalizeText(employeeCodeFilter);

    return rows.filter((row) => {
      if (branchFilter && getBranchKey(row) !== branchFilter) return false;
      if (roleFilter && row.user.role_type !== roleFilter) return false;

      if (nameKeyword) {
        const nameSource = normalizeText(
          `${getEmployeeName(row.user)} ${row.user.username || ""} ${row.user.email || ""}`
        );
        if (!nameSource.includes(nameKeyword)) return false;
      }

      if (codeKeyword) {
        const codeSource = normalizeText(
          `${row.user.employee_code || ""} ${row.user.username || ""} ${row.user.email || ""}`
        );
        if (!codeSource.includes(codeKeyword)) return false;
      }

      if (targetStatusFilter) {
        const hasTarget = hasAssignedTarget(row, metricIds);
        if (targetStatusFilter === "HAS_TARGET" && !hasTarget) return false;
        if (targetStatusFilter === "MISSING_TARGET" && hasTarget) return false;
      }

      return true;
    });
  }, [branchFilter, employeeCodeFilter, metricIds, nameFilter, roleFilter, rows, targetStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const fromRecord = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const toRecord = Math.min(safePage * PAGE_SIZE, filteredRows.length);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const visibleCopyTargetIds = pageRows
    .map((row) => row.user.id)
    .filter((id) => id !== firstUserId);

  const allVisibleSelected =
    visibleCopyTargetIds.length > 0 &&
    visibleCopyTargetIds.every((id) => admin.selectedUserIds.includes(id));

  const clearLocalFilters = () => {
    setBranchFilter("");
    setNameFilter("");
    setEmployeeCodeFilter("");
    setRoleFilter("");
    setTargetStatusFilter("");
    setPage(1);
  };

  const toggleVisibleCopySelection = () => {
    if (allVisibleSelected) {
      admin.setCopySelection(
        admin.selectedUserIds.filter((id) => !visibleCopyTargetIds.includes(id))
      );
      return;
    }

    admin.setCopySelection([...admin.selectedUserIds, ...visibleCopyTargetIds]);
  };

  useEffect(() => {
    setPage(1);
  }, [branchFilter, employeeCodeFilter, nameFilter, roleFilter, targetStatusFilter, rows.length]);

  if (!canManage) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
        Bạn không có quyền set chỉ tiêu cho bộ KPI này, hoặc bộ KPI đang chọn không có dữ liệu chỉ tiêu Phần B.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-white px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Set chỉ tiêu KPI Phần B</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Chỉ tiêu được set theo từng nhân viên và từng KPI Phần B. Ô dưới hiển thị thực tế hiện tại / chỉ tiêu đang áp dụng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={admin.copyFromPreviousPeriod}
            disabled={admin.saving || rows.length === 0}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy size={14} />
            Copy tháng trước
          </button>

          {!admin.copyFirstEmployeeMode ? (
            <button
              type="button"
              onClick={admin.startCopyFromFirstEmployee}
              disabled={admin.saving || rows.length < 2}
              className="flex h-8 items-center gap-1 rounded border border-teal-300 bg-white px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SquareCheckBig size={14} />
              Copy từ người đầu tiên
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={admin.confirmCopyFromFirstEmployee}
                disabled={admin.saving || admin.selectedUserIds.length === 0}
                className="flex h-8 items-center gap-1 rounded bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SquareCheckBig size={14} />
                Thực hiện copy
              </button>

              <button
                type="button"
                onClick={admin.cancelCopyFromFirstEmployee}
                disabled={admin.saving}
                className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={14} />
                Hủy
              </button>
            </>
          )}

          <button
            type="button"
            onClick={admin.saveTargets}
            disabled={admin.saving || rows.length === 0}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={14} />
            {admin.saving ? "Đang lưu..." : "Lưu chỉ tiêu"}
          </button>
        </div>
      </div>

      {admin.copyFirstEmployeeMode && sourceUser && (
        <div className="flex flex-col gap-3 border-b border-teal-100 bg-teal-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-xs text-teal-800">
            <span className="font-semibold">Nguồn copy:</span> {getEmployeeName(sourceUser)}
            <span className="mx-2 text-teal-400">•</span>
            Chọn nhân viên đích trong bảng bên dưới hoặc chọn toàn bộ trang đang hiển thị.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleVisibleCopySelection}
              disabled={visibleCopyTargetIds.length === 0}
              className="h-8 rounded border border-teal-300 bg-white px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {allVisibleSelected ? "Bỏ chọn trang này" : "Chọn tất cả trang này"}
            </button>

            <button
              type="button"
              onClick={() => admin.setCopySelection(rows.map((row) => row.user.id).filter((id) => id !== firstUserId))}
              className="h-8 rounded border border-teal-300 bg-white px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50"
            >
              Chọn toàn bộ nhân viên
            </button>

            <button
              type="button"
              onClick={admin.clearCopySelection}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Bỏ chọn
            </button>

            <span className="text-xs font-medium text-teal-700">
              Đã chọn {admin.selectedUserIds.filter((id) => id !== firstUserId).length} nhân viên
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-b bg-[#f8fafc] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-xs text-slate-500">
          Hiển thị <span className="font-semibold text-slate-700">{filteredRows.length}</span> / {rows.length} nhân viên
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={clearLocalFilters}
            className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Xóa lọc bảng
          </button>

          <TablePagination
            fromRecord={fromRecord}
            toRecord={toRecord}
            count={filteredRows.length}
            page={safePage}
            totalPages={totalPages}
            loading={admin.saving}
            onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1680px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-white text-slate-700">
              {admin.copyFirstEmployeeMode && (
                <th className="sticky left-0 z-30 w-[56px] bg-white px-3 text-center font-semibold">
                  Chọn
                </th>
              )}
              <th
                className="sticky z-20 w-[240px] bg-white px-3 font-semibold"
                style={{ left: admin.copyFirstEmployeeMode ? 56 : 0 }}
              >
                Nhân viên
              </th>
              <th className="w-[140px] px-3 font-semibold">Mã NV</th>
              <th className="w-[170px] px-3 font-semibold">Chi nhánh</th>
              <th className="w-[90px] px-3 font-semibold">Vai trò</th>
              <th className="w-[130px] px-3 font-semibold">Trạng thái</th>
              {metrics.map((metric) => (
                <th key={metric.id} className="w-[165px] px-3 font-semibold" title={metric.metric_name}>
                  <div className="text-[11px] text-slate-500">{metric.group_code}</div>
                  <div>{getMetricShortName(metric.metric_name)}</div>
                  <div className="mt-0.5 text-[10px] font-normal text-slate-400">
                    Đơn vị: {formatUnit(metric.target_unit)}
                  </div>
                </th>
              ))}
            </tr>

            <tr className="border-b bg-[#f8fafc] align-top">
              {admin.copyFirstEmployeeMode && <th className="sticky left-0 z-30 bg-[#f8fafc] px-2 py-2" />}
              <th
                className="sticky z-20 bg-[#f8fafc] px-2 py-2"
                style={{ left: admin.copyFirstEmployeeMode ? 56 : 0 }}
              >
                <ColumnTextFilter
                  value={nameFilter}
                  onChange={setNameFilter}
                  placeholder="Tên / username / email"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnTextFilter
                  value={employeeCodeFilter}
                  onChange={setEmployeeCodeFilter}
                  placeholder="Mã NV"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={branchFilter}
                  onChange={setBranchFilter}
                  options={branchOptions}
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { label: "SA", value: "SA" },
                    { label: "SUP", value: "SUP" },
                  ]}
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={targetStatusFilter}
                  onChange={(value) => setTargetStatusFilter(value as TargetStatusFilter)}
                  options={[
                    { label: "Có target riêng", value: "HAS_TARGET" },
                    { label: "Chưa set riêng", value: "MISSING_TARGET" },
                  ]}
                />
              </th>
              {metrics.map((metric) => (
                <th key={metric.id} className="px-2 py-2" />
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={(admin.copyFirstEmployeeMode ? 6 : 5) + metrics.length}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  Chưa có nhân viên phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => {
                const checked = admin.selectedUserIds.includes(row.user.id);
                const isFirst = row.user.id === firstUserId;
                const rowHasAssignedTarget = hasAssignedTarget(row, metricIds);

                return (
                  <tr key={row.user.id} className={index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                    {admin.copyFirstEmployeeMode && (
                      <td className="sticky left-0 z-10 border-b bg-inherit px-3 py-3 text-center">
                        {isFirst ? (
                          <span className="text-[11px] font-semibold text-teal-700">Nguồn</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => admin.toggleUserSelection(row.user.id)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        )}
                      </td>
                    )}

                    <td
                      className="sticky z-10 border-b bg-inherit px-3 py-3"
                      style={{ left: admin.copyFirstEmployeeMode ? 56 : 0 }}
                    >
                      <div className="font-semibold text-slate-800">{getEmployeeName(row.user)}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">
                        {row.user.username || row.user.email || "-"}
                      </div>
                    </td>
                    <td className="border-b px-3 py-3 text-slate-600">
                      {row.user.employee_code || "-"}
                    </td>
                    <td className="border-b px-3 py-3 text-slate-600">
                      {row.user.branch_name || "-"}
                    </td>
                    <td className="border-b px-3 py-3">
                      <RoleBadge roleType={row.user.role_type} />
                    </td>
                    <td className="border-b px-3 py-3">
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-1 text-[11px] font-semibold",
                          rowHasAssignedTarget
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {rowHasAssignedTarget ? "Đã set" : "Mặc định"}
                      </span>
                    </td>

                    {metrics.map((metric) => {
                      const userId = String(row.user.id);
                      const metricId = String(metric.id);
                      const assignedTarget = row.targets[metricId];
                      const value = admin.targetValues[userId]?.[metricId] ?? assignedTarget?.target_value ?? metric.target_value ?? "";
                      const result = metricResultMap.get(`${row.user.id}-${metric.id}`);
                      const appliedTarget = assignedTarget?.target_value ?? metric.target_value ?? "";

                      return (
                        <td key={metric.id} className="border-b px-3 py-3 align-top">
                          <input
                            type="number"
                            value={value}
                            onChange={(event) => admin.setTargetValue(row.user.id, metric.id, event.target.value)}
                            placeholder={metric.target_value ? `Mặc định ${formatTargetValue(metric.target_value, metric.target_unit)}` : "Chỉ tiêu"}
                            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-800 outline-none focus:border-sky-400"
                          />

                          <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-slate-500">
                            <div>
                              Thực tế: <span className="font-semibold text-slate-700">{formatTargetValue(result?.actual_value, metric.target_unit)}</span>
                            </div>
                            <div>
                              Áp dụng: <span className="font-semibold text-slate-700">{formatTargetValue(appliedTarget, metric.target_unit)}</span>
                            </div>
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
