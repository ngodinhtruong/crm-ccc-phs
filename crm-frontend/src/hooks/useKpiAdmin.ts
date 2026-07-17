"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useCallback, useEffect, useMemo, useState } from "react";

import { kpiService } from "@/services/kpi.service";
import {
  KpiAdminDashboardResponse,
  KpiAdminMetaResponse,
  KpiAdminMutationResponse,
  KpiAdminQueryParams,
  KpiAdminTargetRow,
  KpiAdminTargetsResponse,
  KpiPeriodItem,
  KpiProfileCode,
} from "@/types/kpi.type";

export type KpiAdminTab = "ranking" | "report" | "targets";
export type KpiAdminRoleType = "ALL" | "SA" | "SUP";

type TargetValueMatrix = Record<string, Record<string, string>>;

type TargetNoteMatrix = Record<string, Record<string, string>>;

function formatApiErrorData(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(String).join(" ");

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const messages: string[] = [];

    if (typeof obj.detail === "string") messages.push(obj.detail);

    Object.entries(obj).forEach(([key, value]) => {
      if (key === "detail") return;
      if (typeof value === "string") {
        messages.push(`${key}: ${value}`);
        return;
      }
      if (Array.isArray(value)) {
        messages.push(`${key}: ${value.map(String).join(" ")}`);
        return;
      }
      if (value && typeof value === "object") {
        messages.push(`${key}: ${JSON.stringify(value)}`);
      }
    });

    return messages.join(" ");
  }

  return String(data);
}

function getCurrentMonthPeriodId(periods: KpiPeriodItem[]) {
  const now = new Date();
  const current = periods.find(
    (item) => item.year === now.getFullYear() && Number(item.month) === now.getMonth() + 1
  );

  if (current) return String(current.id);

  const active = periods.find((item) => item.status === "ACTIVE");
  const draft = periods.find((item) => item.status === "DRAFT");

  return String(active?.id || draft?.id || periods[0]?.id || "");
}

function buildTargetValueMatrix(targets?: KpiAdminTargetsResponse | null): TargetValueMatrix {
  const matrix: TargetValueMatrix = {};

  (targets?.rows || []).forEach((row) => {
    const userId = String(row.user.id);
    matrix[userId] = {};

    (targets?.metrics || []).forEach((metric) => {
      const target = row.targets[String(metric.id)];
      matrix[userId][String(metric.id)] = target?.target_value ?? "";
    });
  });

  return matrix;
}

function buildTargetNoteMatrix(targets?: KpiAdminTargetsResponse | null): TargetNoteMatrix {
  const matrix: TargetNoteMatrix = {};

  (targets?.rows || []).forEach((row) => {
    const userId = String(row.user.id);
    matrix[userId] = {};

    (targets?.metrics || []).forEach((metric) => {
      const target = row.targets[String(metric.id)];
      matrix[userId][String(metric.id)] = target?.note ?? "";
    });
  });

  return matrix;
}

function toSafeNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toScoreString(value: number) {
  return value.toFixed(2);
}

function weightedAverage(
  items: { value?: string | number | null; weight?: string | number | null }[]
) {
  const totalWeight = items.reduce((sum, item) => sum + toSafeNumber(item.weight), 0);
  if (totalWeight <= 0) return "0.00";

  const totalValue = items.reduce(
    (sum, item) => sum + toSafeNumber(item.value) * toSafeNumber(item.weight),
    0
  );

  return toScoreString(totalValue / totalWeight);
}

function mergeKpiAdminDashboards(
  dashboards: KpiAdminDashboardResponse[]
): KpiAdminDashboardResponse {
  const [base] = dashboards;
  if (!base) {
    throw new Error("Không có dữ liệu KPI Admin để tổng hợp.");
  }
  if (dashboards.length === 1) return base;

  const rowsByUser = new Map<number, KpiAdminDashboardResponse["ranking"]["results"][number]>();

  dashboards.forEach((dashboard) => {
    (dashboard.ranking?.results || []).forEach((row) => {
      rowsByUser.set(row.user.id, row);
    });
  });

  const mergedRows = Array.from(rowsByUser.values()).sort(
    (a, b) => toSafeNumber(b.total_score) - toSafeNumber(a.total_score)
  );

  const rankedRows = mergedRows.map((row, index) => ({
    ...row,
    rank: index + 1,
    rank_overall: index + 1,
  }));

  const metricsByCode = new Map<string, KpiAdminDashboardResponse["ranking"]["metrics"][number]>();
  dashboards.forEach((dashboard) => {
    (dashboard.ranking?.metrics || []).forEach((metric) => {
      const key = metric.metric_code || String(metric.id);
      if (!metricsByCode.has(key)) metricsByCode.set(key, metric);
    });
  });

  const reportOverviewItems = dashboards.map((dashboard) => ({
    overview: dashboard.report.overview,
    weight: dashboard.report.overview.employee_count || dashboard.ranking.count || 0,
  }));

  const branchMap = new Map<
    string,
    {
      branch_id?: number | null;
      branch_name: string;
      employee_count: number;
      total_score: number;
    }
  >();

  dashboards.forEach((dashboard) => {
    (dashboard.report.by_branch || []).forEach((row) => {
      const key = String(row.branch_id ?? row.branch_name);
      const current = branchMap.get(key) || {
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        employee_count: 0,
        total_score: 0,
      };
      const employeeCount = Number(row.employee_count || 0);
      current.employee_count += employeeCount;
      current.total_score += toSafeNumber(row.avg_total_score) * employeeCount;
      branchMap.set(key, current);
    });
  });

  const metricMap = new Map<
    string,
    {
      metric_id: number;
      metric_code: string;
      metric_name: string;
      group_code?: string | null;
      employee_count: number;
      score_sum: number;
      actual_sum: number;
      target_sum: number;
    }
  >();

  dashboards.forEach((dashboard) => {
    (dashboard.report.by_metric || []).forEach((row) => {
      const key = row.metric_code || String(row.metric_id);
      const current = metricMap.get(key) || {
        metric_id: row.metric_id,
        metric_code: row.metric_code,
        metric_name: row.metric_name,
        group_code: row.group_code,
        employee_count: 0,
        score_sum: 0,
        actual_sum: 0,
        target_sum: 0,
      };
      const employeeCount = Number(row.employee_count || 0);
      current.employee_count += employeeCount;
      current.score_sum += toSafeNumber(row.avg_score) * employeeCount;
      current.actual_sum += toSafeNumber(row.avg_actual_value) * employeeCount;
      current.target_sum += toSafeNumber(row.avg_target_value) * employeeCount;
      metricMap.set(key, current);
    });
  });

  const operationalEmployeeMap = new Map<number, NonNullable<KpiAdminDashboardResponse["report"]["operational"]>["employees"][number]>();

  dashboards.forEach((dashboard) => {
    (dashboard.report.operational?.employees || []).forEach((row) => {
      operationalEmployeeMap.set(row.user.id, row);
    });
  });

  const operationalEmployees = Array.from(operationalEmployeeMap.values());

  const operationalBranchMap = new Map<string, NonNullable<KpiAdminDashboardResponse["report"]["operational"]>["branches"][number]>();
  operationalEmployees.forEach((row) => {
    const key = String(row.branch_id ?? row.branch_name ?? "unknown");
    const current = operationalBranchMap.get(key) || {
      branch_id: row.branch_id,
      branch_name: row.branch_name || "Chưa có chi nhánh",
      employee_count: 0,
      call_count: 0,
      activated_account_count: 0,
      transaction_fee: "0",
      transaction_value: "0",
      activation_rate: "0",
      fee_per_call: "0",
      value_per_call: "0",
    };

    current.employee_count += 1;
    current.call_count += Number(row.call_count || 0);
    current.activated_account_count += Number(row.activated_account_count || 0);
    current.transaction_fee = String(toSafeNumber(current.transaction_fee) + toSafeNumber(row.transaction_fee));
    current.transaction_value = String(toSafeNumber(current.transaction_value) + toSafeNumber(row.transaction_value));
    operationalBranchMap.set(key, current);
  });

  const operationalBranches = Array.from(operationalBranchMap.values()).map((row) => {
    const calls = Number(row.call_count || 0);
    const activated = Number(row.activated_account_count || 0);
    const fee = toSafeNumber(row.transaction_fee);
    const value = toSafeNumber(row.transaction_value);

    return {
      ...row,
      activation_rate: calls > 0 ? ((activated / calls) * 100).toFixed(2) : "0.00",
      fee_per_call: calls > 0 ? (fee / calls).toFixed(2) : "0.00",
      value_per_call: calls > 0 ? (value / calls).toFixed(2) : "0.00",
    };
  });

  const operationalOverview = operationalEmployees.reduce(
    (total, row) => ({
      call_count: total.call_count + Number(row.call_count || 0),
      activated_account_count:
        total.activated_account_count + Number(row.activated_account_count || 0),
      transaction_fee: String(toSafeNumber(total.transaction_fee) + toSafeNumber(row.transaction_fee)),
      transaction_value: String(
        toSafeNumber(total.transaction_value) + toSafeNumber(row.transaction_value)
      ),
      activation_rate: "0",
      fee_per_call: "0",
      value_per_call: "0",
    }),
    {
      call_count: 0,
      activated_account_count: 0,
      transaction_fee: "0",
      transaction_value: "0",
      activation_rate: "0",
      fee_per_call: "0",
      value_per_call: "0",
    }
  );

  operationalOverview.activation_rate =
    operationalOverview.call_count > 0
      ? ((operationalOverview.activated_account_count / operationalOverview.call_count) * 100).toFixed(2)
      : "0.00";
  operationalOverview.fee_per_call =
    operationalOverview.call_count > 0
      ? (toSafeNumber(operationalOverview.transaction_fee) / operationalOverview.call_count).toFixed(2)
      : "0.00";
  operationalOverview.value_per_call =
    operationalOverview.call_count > 0
      ? (toSafeNumber(operationalOverview.transaction_value) / operationalOverview.call_count).toFixed(2)
      : "0.00";

  const syntheticProfile = {
    id: 0,
    profile_code: "ALL",
    profile_name: "Tất cả nhân viên",
    target_role_code: "ALL",
  };

  const employeeCount = rankedRows.length;

  return {
    ...base,
    meta: {
      ...base.meta,
      selected_profile: syntheticProfile,
      employee_count: employeeCount,
      can_manage_targets: false,
    },
    ranking: {
      ...base.ranking,
      profile: syntheticProfile,
      metrics: Array.from(metricsByCode.values()),
      count: rankedRows.length,
      results: rankedRows,
    },
    report: {
      ...base.report,
      profile: syntheticProfile,
      overview: {
        employee_count: employeeCount,
        summary_count: dashboards.reduce(
          (sum, dashboard) => sum + Number(dashboard.report.overview.summary_count || 0),
          0
        ),
        avg_total_score: weightedAverage(
          reportOverviewItems.map((item) => ({
            value: item.overview.avg_total_score,
            weight: item.weight,
          }))
        ),
        avg_manual_score: weightedAverage(
          reportOverviewItems.map((item) => ({
            value: item.overview.avg_manual_score,
            weight: item.weight,
          }))
        ),
        avg_auto_score: weightedAverage(
          reportOverviewItems.map((item) => ({
            value: item.overview.avg_auto_score,
            weight: item.weight,
          }))
        ),
      },
      by_branch: Array.from(branchMap.values()).map((row) => ({
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        employee_count: row.employee_count,
        avg_total_score:
          row.employee_count > 0 ? toScoreString(row.total_score / row.employee_count) : "0.00",
        total_score: toScoreString(row.total_score),
      })),
      by_metric: Array.from(metricMap.values()).map((row) => ({
        metric_id: row.metric_id,
        metric_code: row.metric_code,
        metric_name: row.metric_name,
        group_code: row.group_code,
        employee_count: row.employee_count,
        avg_score:
          row.employee_count > 0 ? toScoreString(row.score_sum / row.employee_count) : "0.00",
        avg_actual_value:
          row.employee_count > 0 ? toScoreString(row.actual_sum / row.employee_count) : "0.00",
        avg_target_value:
          row.employee_count > 0 ? toScoreString(row.target_sum / row.employee_count) : "0.00",
      })),
      operational: {
        overview: operationalOverview,
        employees: operationalEmployees,
        branches: operationalBranches,
      },
    },
    targets: null,
  };
}

export function useKpiAdmin() {
  const [activeTab, setActiveTab] = useState<KpiAdminTab>("ranking");

  const [periods, setPeriods] = useState<KpiPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedProfileCode, setSelectedProfileCode] = useState<KpiProfileCode>("SA");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [roleType, setRoleTypeState] = useState<KpiAdminRoleType>("ALL");
  const [q, setQ] = useState("");

  const [dashboard, setDashboard] = useState<KpiAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [copyFirstEmployeeMode, setCopyFirstEmployeeMode] = useState(false);
  const [targetValues, setTargetValues] = useState<TargetValueMatrix>({});
  const [targetNotes, setTargetNotes] = useState<TargetNoteMatrix>({});

  const meta: KpiAdminMetaResponse | null = dashboard?.meta || null;
  const ranking = dashboard?.ranking || null;
  const report = dashboard?.report || null;
  const targets = dashboard?.targets || null;

  const buildQueryParams = useCallback(
    (profileCode: KpiProfileCode, nextRoleType: KpiAdminRoleType = roleType) => {
      const params: KpiAdminQueryParams = {
        profile_code: profileCode,
        q,
        role_type: nextRoleType === "ALL" ? "" : nextRoleType,
      };

      if (selectedPeriodId) params.period = selectedPeriodId;
      if (selectedBranch && selectedBranch !== "all") params.branch = selectedBranch;

      return params;
    },
    [q, roleType, selectedBranch, selectedPeriodId]
  );

  const queryParams = useMemo<KpiAdminQueryParams>(() => {
    return buildQueryParams(selectedProfileCode, roleType);
  }, [buildQueryParams, roleType, selectedProfileCode]);

  const syncSelectedPeriod = useCallback((period?: KpiPeriodItem | null) => {
    if (!period) return;

    setPeriods((current) => {
      if (current.some((item) => item.id === period.id)) return current;
      return [period, ...current];
    });

    setSelectedPeriodId((current) => current || String(period.id));
  }, []);

  const loadPeriods = useCallback(async () => {
    try {
      const data = await kpiService.getKpiAdminPeriodOptions();
      setPeriods(data);

      if (!selectedPeriodId && data.length > 0) {
        setSelectedPeriodId(getCurrentMonthPeriodId(data));
      }
    } catch {
      // Không chặn toàn bộ trang KPI Admin chỉ vì dropdown kỳ KPI bị lỗi.
      // Dashboard vẫn tự lấy kỳ hiện tại từ backend khi không truyền period.
    }
  }, [selectedPeriodId]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let data: KpiAdminDashboardResponse;

      if (roleType === "ALL") {
        const saData = await kpiService.getKpiAdminDashboard(buildQueryParams("SA", "SA"));
        const dashboards: KpiAdminDashboardResponse[] = [saData];

        const canLoadSup = saData.meta?.profiles?.some(
          (profile) => profile.profile_code === "SA_SUP"
        );

        if (canLoadSup) {
          try {
            const supData = await kpiService.getKpiAdminDashboard(
              buildQueryParams("SA_SUP", "SUP")
            );
            dashboards.push(supData);
          } catch {
            // Tài khoản SUP thường không có quyền đọc bộ KPI SUP của người khác.
            // Khi đó tab "Tất cả" vẫn hiển thị phần SA trong phạm vi được cấp quyền.
          }
        }

        data = mergeKpiAdminDashboards(dashboards);
      } else {
        data = await kpiService.getKpiAdminDashboard(queryParams);
      }

      setDashboard(data);
      syncSelectedPeriod(data.meta?.period || data.ranking?.period || data.report?.period);

      if (roleType !== "ALL" && !selectedProfileCode && data.meta?.selected_profile?.profile_code) {
        setSelectedProfileCode(data.meta.selected_profile.profile_code);
      }

      setTargetValues(buildTargetValueMatrix(data.targets));
      setTargetNotes(buildTargetNoteMatrix(data.targets));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được trang KPI Admin"));
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, queryParams, roleType, selectedProfileCode, syncSelectedPeriod]);

  const reload = useCallback(async () => {
    await loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setSelectedUserIds([]);
  }, [roleType, selectedBranch, selectedPeriodId, selectedProfileCode]);

  const setRoleType = useCallback((nextRoleType: KpiAdminRoleType) => {
    setRoleTypeState(nextRoleType);
    setSelectedProfileCode(nextRoleType === "SUP" ? "SA_SUP" : "SA");
    setSelectedUserIds([]);
  }, []);

  const rows = targets?.rows || [];
  const selectedRows = useMemo(() => {
    if (!targets) return [] as KpiAdminTargetRow[];
    return rows.filter((row) => selectedUserIds.includes(row.user.id));
  }, [rows, selectedUserIds, targets]);

  const selectedOrAllUserIds = useMemo(() => {
    if (selectedUserIds.length > 0) return selectedUserIds;
    return rows.map((row) => row.user.id);
  }, [rows, selectedUserIds]);

  const allRowsSelected = rows.length > 0 && selectedUserIds.length === rows.length;

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedUserIds(allRowsSelected ? [] : rows.map((row) => row.user.id));
  };

  const setTargetValue = (userId: number, metricId: number, value: string) => {
    setTargetValues((prev) => ({
      ...prev,
      [String(userId)]: {
        ...(prev[String(userId)] || {}),
        [String(metricId)]: value,
      },
    }));
  };

  const setTargetNote = (userId: number, metricId: number, value: string) => {
    setTargetNotes((prev) => ({
      ...prev,
      [String(userId)]: {
        ...(prev[String(userId)] || {}),
        [String(metricId)]: value,
      },
    }));
  };

  const saveTargets = async () => {
    if (!targets || !meta?.can_manage_targets) return;

    const metricIds = targets.metrics.map((metric) => metric.id);
    const userIds = selectedOrAllUserIds;

    if (!userIds.length || !metricIds.length) {
      setError("Không có nhân viên hoặc chỉ tiêu để lưu.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      await kpiService.bulkUpdateKpiAdminTargets({
        period: targets.period.id,
        profile_code: targets.profile.profile_code,
        targets: userIds.flatMap((userId) =>
          metricIds.map((metricId) => ({
            user: userId,
            metric: metricId,
            target_value: targetValues[String(userId)]?.[String(metricId)] || null,
            target_unit:
              targets.metrics.find((metric) => metric.id === metricId)?.target_unit || undefined,
            note: targetNotes[String(userId)]?.[String(metricId)] || "",
          }))
        ),
      });

      setNotice("Đã lưu chỉ tiêu KPI Phần B.");
      await reload();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được chỉ tiêu KPI"));
    } finally {
      setSaving(false);
    }
  };

  const copyFromPreviousPeriod = async () => {
    if (!targets || !meta?.can_manage_targets) return;

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const response: KpiAdminMutationResponse = await kpiService.copyKpiAdminTargetsFromPreviousPeriod({
        period: targets.period.id,
        profile_code: targets.profile.profile_code,
        user_ids: selectedOrAllUserIds,
        metric_ids: targets.metrics.map((metric) => metric.id),
      });

      setNotice(`Đã copy ${response.copied_count || 0} chỉ tiêu từ tháng trước.`);
      await reload();
    } catch (err) {
      setError(getErrorMessage(err, "Không copy được chỉ tiêu từ tháng trước"));
    } finally {
      setSaving(false);
    }
  };

  const copyFromFirstEmployee = async () => {
    if (!targets || !meta?.can_manage_targets) return;

    const sourceUserId = rows[0]?.user.id;
    const targetUserIds = selectedOrAllUserIds.filter((id) => id !== sourceUserId);

    if (!sourceUserId || targetUserIds.length === 0) {
      setError("Cần có nhân viên nguồn và ít nhất một nhân viên đích để copy chỉ tiêu.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const response: KpiAdminMutationResponse = await kpiService.copyKpiAdminTargetsFromEmployee({
        period: targets.period.id,
        profile_code: targets.profile.profile_code,
        source_user: sourceUserId,
        target_user_ids: targetUserIds,
        metric_ids: targets.metrics.map((metric) => metric.id),
      });

      setNotice(`Đã copy ${response.copied_count || 0} chỉ tiêu từ nhân viên đầu tiên.`);
      await reload();
    } catch (err) {
      setError(getErrorMessage(err, "Không copy được chỉ tiêu từ nhân viên đầu tiên"));
    } finally {
      setSaving(false);
    }
  };

  const startCopyFromFirstEmployee = () => {
    setCopyFirstEmployeeMode(true);
    setSelectedUserIds([]);
  };

  const cancelCopyFromFirstEmployee = () => {
    setCopyFirstEmployeeMode(false);
    setSelectedUserIds([]);
  };

  const clearCopySelection = () => {
    setSelectedUserIds([]);
  };

  const setCopySelection = (userIds: number[]) => {
    setSelectedUserIds(userIds);
  };

  const confirmCopyFromFirstEmployee = async () => {
    await copyFromFirstEmployee();
    setCopyFirstEmployeeMode(false);
    setSelectedUserIds([]);
  };

  const setDefaultTargets = () => {
    if (!targets) return;

    setTargetValues((prev) => {
      const next = { ...prev };
      const userIds = selectedUserIds.length > 0
        ? selectedUserIds
        : targets.rows.map((row) => row.user.id);

      userIds.forEach((userId) => {
        const uIdStr = String(userId);
        next[uIdStr] = { ...(next[uIdStr] || {}) };
        targets.metrics.forEach((metric) => {
          next[uIdStr][String(metric.id)] = String(metric.target_value ?? "");
        });
      });
      return next;
    });
  };

  return {
    activeTab,
    setActiveTab,

    periods,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedProfileCode,
    setSelectedProfileCode,
    selectedBranch,
    setSelectedBranch,
    roleType,
    setRoleType,
    q,
    setQ,

    dashboard,
    meta,
    ranking,
    report,
    targets,

    loading,
    saving,
    error,
    notice,
    reload,

    selectedUserIds,
    selectedRows,
    allRowsSelected,
    toggleUserSelection,
    toggleSelectAll,

    targetValues,
    targetNotes,
    setTargetValue,
    setTargetNote,

    saveTargets,
    copyFromPreviousPeriod,
    copyFromFirstEmployee,
    setDefaultTargets,

    copyFirstEmployeeMode,
    startCopyFromFirstEmployee,
    cancelCopyFromFirstEmployee,
    clearCopySelection,
    setCopySelection,
    confirmCopyFromFirstEmployee,
  };
}

export type KpiAdminController = ReturnType<typeof useKpiAdmin>;
