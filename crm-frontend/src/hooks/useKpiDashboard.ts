"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PermissionCode,
  useCurrentUserPermissions,
} from "@/hooks/useCurrentUserPermissions";
import { kpiDashboardService } from "@/services/kpi-dashboard.service";
import {
  KpiDashboardParams,
  KpiDashboardScope,
  KpiGateDashboardStatus,
  KpiGateStatusItem,
  KpiGroupItem,
  KpiMetricGroup,
  KpiMetricSection,
  KpiPeriodItem,
  KpiPeriodMetricItem,
  KpiProgressMetric,
  KpiProgressStatus,
  KpiProfileItem,
  KpiSectionItem,
  KpiUserGateResultItem,
  KpiUserMetricResultItem,
  KpiUserSummaryItem,
} from "@/types/kpi-dashboard.type";

const AUTO_REFRESH_MS = 60_000;
const SA_PROFILE_CODE = "SA";
const SA_SUP_PROFILE_CODE = "SA_SUP";

function formatApiErrorData(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(String).join(" ");

  if (typeof data === "object") {
    const messages: string[] = [];

    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === "string") {
        messages.push(key === "detail" ? value : `${key}: ${value}`);
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

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as {
    response?: {
      status?: number;
      data?: unknown;
    };
    message?: string;
  };

  const apiMessage = formatApiErrorData(error?.response?.data);

  if (apiMessage) return `${fallback}. ${apiMessage}`;

  return `${fallback}. Status: ${error?.response?.status || "unknown"} - ${
    error?.message || "Không rõ lỗi"
  }`;
}

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null, fallback = "-") {
  if (value === null || Number.isNaN(value)) return fallback;

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getCurrentMonthPeriodDefault(periods: KpiPeriodItem[]) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthPeriod = periods.find(
    (item) => item.year === currentYear && Number(item.month) === currentMonth
  );

  if (currentMonthPeriod) return String(currentMonthPeriod.id);

  const active = periods.find((item) => item.status === "ACTIVE");
  const draft = periods.find((item) => item.status === "DRAFT");

  return String(active?.id || draft?.id || periods[0]?.id || "");
}

function getProgressStatus(progress: number | null): KpiProgressStatus {
  if (progress === null) return "EMPTY";
  if (progress >= 100) return "GREEN";
  if (progress >= 70) return "YELLOW";
  return "RED";
}

function getRoleCodes(user: unknown) {
  const currentUser = user as {
    role_codes?: string[];
    roles?: { role_code?: string | null }[];
  } | null;

  const fromRoleCodes = currentUser?.role_codes || [];
  const fromRoles =
    currentUser?.roles?.map((role) => role.role_code).filter(Boolean) || [];

  return Array.from(new Set([...fromRoleCodes, ...fromRoles])) as string[];
}

function hasAnyRole(roleCodes: string[], candidates: string[]) {
  return candidates.some((roleCode) => roleCodes.includes(roleCode));
}

function getUserId(user: unknown) {
  const currentUser = user as { id?: number | string } | null;

  return currentUser?.id ? String(currentUser.id) : "";
}

function getDashboardQueryParams() {
  if (typeof window === "undefined") {
    return {
      periodId: "",
      userId: "",
      employeeName: "",
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    periodId: params.get("period") || "",
    userId: params.get("user") || params.get("user_id") || "",
    employeeName: params.get("employeeName") || params.get("employee_name") || "",
  };
}

function getSelfProfileCode(user: unknown) {
  const roleCodes = getRoleCodes(user);

  const isSupervisor = hasAnyRole(roleCodes, [
    "SA_SUP",
    "SA_SUPERVISOR",
    "SALE_ADMIN_SUPERVISOR",
  ]);

  if (isSupervisor) return SA_SUP_PROFILE_CODE;

  return SA_PROFILE_CODE;
}

function ensureProfileCode(
  profiles: KpiProfileItem[],
  preferredProfileCode: string
) {
  if (profiles.some((item) => item.profile_code === preferredProfileCode)) {
    return preferredProfileCode;
  }

  return profiles[0]?.profile_code || "";
}

function getResultMap(results: KpiUserMetricResultItem[]) {
  const map = new Map<number, KpiUserMetricResultItem>();

  results.forEach((item) => {
    map.set(item.metric, item);
  });

  return map;
}

function getSectionMap(sections: KpiSectionItem[]) {
  const map = new Map<number, KpiSectionItem>();

  sections.forEach((item) => {
    map.set(item.id, item);
  });

  return map;
}

function getGroupMap(groups: KpiGroupItem[]) {
  const map = new Map<number, KpiGroupItem>();

  groups.forEach((item) => {
    map.set(item.id, item);
  });

  return map;
}

function inferSourceType(metric: KpiPeriodMetricItem, group?: KpiGroupItem) {
  if (group?.group_type === "AUTO") return "AUTO";
  if (group?.group_type === "MANUAL") return "MANUAL";

  if (metric.section_code === "B") return "AUTO";
  return "MANUAL";
}

function buildProgressMetric(
  metric: KpiPeriodMetricItem,
  result: KpiUserMetricResultItem | null,
  group?: KpiGroupItem
): KpiProgressMetric {
  // const sourceType =
  //   result?.source_type === "AUTO" ? "AUTO" : inferSourceType(metric, group);
  const targetValue = toNumber(result?.target_value ?? metric.target_value);
  const actualValue = toNumber(result?.actual_value);
  const score = toNumber(result?.score);

  let progressPercent: number | null = null;

  if (targetValue && targetValue > 0 && actualValue !== null) {
    progressPercent = Math.min((actualValue / targetValue) * 100, 999);
  } else if (score !== null) {
    progressPercent = Math.min(score, 999);
  }

  const displayUnit = metric.target_unit === "PERCENT" ? "%" : metric.target_unit === "VND" ? " VND" : "";

  return {
    metric,
    result,
    actualValue: actualValue ?? score,
    targetValue: targetValue ?? (score !== null ? 100 : null),
    progressPercent,
    progressStatus: getProgressStatus(progressPercent),
    // sourceType,
    displayActual:
      actualValue !== null
        ? `${formatNumber(actualValue)}${displayUnit}`
        : score !== null
          ? `${formatNumber(score)} điểm`
          : "-",
    displayTarget:
      targetValue !== null
        ? `${formatNumber(targetValue)}${displayUnit}`
        : score !== null
          ? "100 điểm"
          : "-",
    displayUnit,
    windowStartDate: result?.window_start_date || null,
    windowEndDate: result?.window_end_date || null,
    windowLabel:
      result?.window_start_date && result?.window_end_date
        ? `${result.window_start_date} → ${result.window_end_date}`
        : null,
    denominatorValue: toNumber(result?.denominator_value),
    contributingRecordCount: result?.contributing_record_count ?? null,
  };
}

function buildMetricSections({
  sections,
  groups,
  metrics,
  results,
}: {
  sections: KpiSectionItem[];
  groups: KpiGroupItem[];
  metrics: KpiPeriodMetricItem[];
  results: KpiUserMetricResultItem[];
}): KpiMetricSection[] {
  const sectionMap = getSectionMap(sections);
  const groupMap = getGroupMap(groups);
  const resultMap = getResultMap(results);

  return sections
    .filter((section) => section.is_active)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => {
      const sectionGroups = groups
        .filter((group) => group.section === section.id && group.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((group): KpiMetricGroup => {
          const groupMetrics = metrics
            .filter((metric) => metric.group === group.id && metric.is_active)
            .slice()
            .sort((a, b) => a.metric_code.localeCompare(b.metric_code))
            .map((metric) =>
              buildProgressMetric(
                metric,
                resultMap.get(metric.id) || null,
                groupMap.get(metric.group)
              )
            );

          return {
            group,
            metrics: groupMetrics,
            activeMetricCount: groupMetrics.length,
          };
        });

      const looseMetrics = metrics
        .filter((metric) => {
          const group = groupMap.get(metric.group);
          const metricSection = group?.section ? sectionMap.get(group.section) : null;

          return !group && metricSection?.id === section.id;
        })
        .map((metric) => buildProgressMetric(metric, resultMap.get(metric.id) || null));

      const looseGroup: KpiMetricGroup[] = looseMetrics.length
        ? [
            {
              group: {
                id: -section.id,
                period: section.period,
                profile: section.profile,
                section: section.id,
                group_code: "KHAC",
                group_name: "KPI khác",
                group_type: "MIXED",
                weight_percent: "0",
                sort_order: 999,
                is_active: true,
              },
              metrics: looseMetrics,
              activeMetricCount: looseMetrics.length,
            },
          ]
        : [];

      const groupsWithMetrics = [...sectionGroups, ...looseGroup];

      return {
        section,
        groups: groupsWithMetrics,
        metricCount: groupsWithMetrics.reduce(
          (total, group) => total + group.metrics.length,
          0
        ),
      };
    });
}

function calculateGateProgress(gate: KpiUserGateResultItem) {
  const actual = toNumber(gate.actual_value);
  const threshold = toNumber(gate.threshold_value);

  if (actual === null || !threshold || threshold <= 0) return null;

  return Math.min((actual / threshold) * 100, 999);
}

function getGateStatus(gate: KpiUserGateResultItem): KpiGateDashboardStatus {
  if (gate.is_passed === true) return "PASSED";
  if (gate.is_passed === false) {
    const progress = calculateGateProgress(gate);

    if (progress !== null && progress >= 70) return "RISK";
    return "FAILED";
  }

  return "UNKNOWN";
}

function buildGateItems(gates: KpiUserGateResultItem[]): KpiGateStatusItem[] {
  return gates.map((gate) => ({
    gate,
    status: getGateStatus(gate),
    progressPercent: calculateGateProgress(gate),
  }));
}

export function useKpiDashboard() {
  const authz = useCurrentUserPermissions();
  const [initialQuery] = useState(() => getDashboardQueryParams());
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);

  const canViewSelf =
    authz.hasPermission(PermissionCode.KPI_DASHBOARD_VIEW_SELF) ||
    authz.hasPermission(PermissionCode.SA_KPI_VIEW_SELF);

  const canViewBranch =
    authz.hasPermission(PermissionCode.KPI_DASHBOARD_VIEW_BRANCH) ||
    authz.hasPermission(PermissionCode.KPI_DASHBOARD_VIEW_ALL) ||
    authz.hasPermission(PermissionCode.SA_KPI_VIEW_BRANCH);

  const canCalculateAuto = authz.hasPermission(PermissionCode.KPI_AUTO_CALCULATE);
  const canView = canViewSelf || canViewBranch;

  const [scope, setScope] = useState<KpiDashboardScope>("SELF");
  const [periods, setPeriods] = useState<KpiPeriodItem[]>([]);
  const [profiles, setProfiles] = useState<KpiProfileItem[]>([]);
  const [sections, setSections] = useState<KpiSectionItem[]>([]);
  const [groups, setGroups] = useState<KpiGroupItem[]>([]);
  const [metrics, setMetrics] = useState<KpiPeriodMetricItem[]>([]);
  const [results, setResults] = useState<KpiUserMetricResultItem[]>([]);
  const [gateResults, setGateResults] = useState<KpiUserGateResultItem[]>([]);
  const [summaries, setSummaries] = useState<KpiUserSummaryItem[]>([]);
  const [teamSummaries, setTeamSummaries] = useState<KpiUserSummaryItem[]>([]);

  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedProfileCode, setSelectedProfileCode] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedEmployeeNameOverride, setSelectedEmployeeNameOverride] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const currentUserId = useMemo(
    () => getUserId(authz.currentUser),
    [authz.currentUser]
  );

  const selfProfileCode = useMemo(
    () => getSelfProfileCode(authz.currentUser),
    [authz.currentUser]
  );

  const selectedPeriod = useMemo(
    () => periods.find((item) => String(item.id) === selectedPeriodId) || null,
    [periods, selectedPeriodId]
  );

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.profile_code === selectedProfileCode) || null,
    [profiles, selectedProfileCode]
  );

  const teamMembers = useMemo(() => {
    return teamSummaries
      .slice()
      .sort((a, b) => Number(b.total_score || 0) - Number(a.total_score || 0));
  }, [teamSummaries]);

  const effectiveUserId = useMemo(() => {
    if (scope === "BRANCH") return selectedUserId;

    return currentUserId;
  }, [currentUserId, scope, selectedUserId]);

  const activeSummary = useMemo(() => {
    if (effectiveUserId) {
      return summaries.find((item) => String(item.user) === effectiveUserId) || null;
    }

    return summaries[0] || null;
  }, [effectiveUserId, summaries]);

  const selectedEmployeeName = useMemo(() => {
    if (scope !== "BRANCH" || !selectedUserId) return "";

    if (selectedEmployeeNameOverride) return selectedEmployeeNameOverride;

    const selectedMember = teamMembers.find(
      (item) => String(item.user) === selectedUserId
    );

    return (
      selectedMember?.employee_name ||
      selectedMember?.user_username ||
      selectedMember?.user_email ||
      `User ${selectedUserId}`
    );
  }, [scope, selectedEmployeeNameOverride, selectedUserId, teamMembers]);

  const filteredResults = useMemo(() => {
    if (!effectiveUserId) return results;

    return results.filter((item) => String(item.user) === effectiveUserId);
  }, [effectiveUserId, results]);

  const filteredGateResults = useMemo(() => {
    if (!effectiveUserId) return gateResults;

    return gateResults.filter((item) => String(item.user) === effectiveUserId);
  }, [effectiveUserId, gateResults]);

  const metricSections = useMemo(() => {
    return buildMetricSections({
      sections,
      groups,
      metrics,
      results: filteredResults,
    });
  }, [sections, groups, metrics, filteredResults]);

  const manualSections = useMemo(
    () => metricSections.filter((item) => item.section.section_code === "A"),
    [metricSections]
  );

  const autoSections = useMemo(
    () => metricSections.filter((item) => item.section.section_code === "B"),
    [metricSections]
  );

  const otherSections = useMemo(
    () =>
      metricSections.filter(
        (item) => item.section.section_code !== "A" && item.section.section_code !== "B"
      ),
    [metricSections]
  );

  const gateItems = useMemo(
    () => buildGateItems(filteredGateResults),
    [filteredGateResults]
  );

  const hasDashboardData = useMemo(() => {
    return (
      sections.length > 0 ||
      groups.length > 0 ||
      metrics.length > 0 ||
      results.length > 0 ||
      gateResults.length > 0 ||
      summaries.length > 0
    );
  }, [gateResults.length, groups.length, metrics.length, results.length, sections.length, summaries.length]);

  const params = useMemo<KpiDashboardParams>(() => {
    return {
      period: selectedPeriodId,
      profile_code: selectedProfileCode,
      user: effectiveUserId,
    };
  }, [effectiveUserId, selectedPeriodId, selectedProfileCode]);

  const loadPeriods = useCallback(async () => {
    const data = await kpiDashboardService.getPeriods();

    setPeriods(data);

    setSelectedPeriodId((current) => {
      const currentStillExists = current && data.some((item) => String(item.id) === current);

      if (currentStillExists) return current;

      if (initialQuery.periodId && data.some((item) => String(item.id) === initialQuery.periodId)) {
        return initialQuery.periodId;
      }

      return getCurrentMonthPeriodDefault(data);
    });
  }, [initialQuery.periodId]);

  const loadProfiles = useCallback(
    async (periodId: string, desiredProfileCode: string) => {
      if (!periodId) return;

      const data = await kpiDashboardService.getProfiles(periodId);

      setProfiles(data);
      setSelectedProfileCode(ensureProfileCode(data, desiredProfileCode));
    },
    []
  );

  const loadDashboardData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!selectedPeriodId || !selectedProfileCode) return;

      const silent = Boolean(options?.silent);

      try {
        if (silent) {
          setBackgroundRefreshing(true);
        } else {
          setLoadingDetail(true);
        }

        setError("");

        const baseParams = {
          period: selectedPeriodId,
          profile_code: selectedProfileCode,
        };

        const resultParams = {
          ...baseParams,
          user: effectiveUserId,
        };

        const requests = [
          kpiDashboardService.getSections(baseParams),
          kpiDashboardService.getGroups(baseParams),
          kpiDashboardService.getMetrics(baseParams),
          kpiDashboardService.getResults(resultParams),
          kpiDashboardService.getGateResults(resultParams),
          kpiDashboardService.getSummaries(baseParams),
          canViewBranch
            ? kpiDashboardService.getSummaries({
                period: selectedPeriodId,
                profile_code: SA_PROFILE_CODE,
              })
            : Promise.resolve([] as KpiUserSummaryItem[]),
        ] as const;

        const [
          sectionData,
          groupData,
          metricData,
          resultData,
          gateData,
          summaryData,
          teamSummaryData,
        ] = await Promise.all(requests);

        setSections(sectionData);
        setGroups(groupData);
        setMetrics(metricData);
        setResults(resultData);
        setGateResults(gateData);
        setSummaries(summaryData);
        setTeamSummaries(teamSummaryData);
        setLastUpdatedAt(new Date().toISOString());
      } catch (err) {
        setError(getErrorMessage(err, "Không tải được dashboard KPI"));
      } finally {
        if (silent) {
          setBackgroundRefreshing(false);
        } else {
          setLoadingDetail(false);
        }
      }
    },
    [canViewBranch, effectiveUserId, selectedPeriodId, selectedProfileCode]
  );

  const reloadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await loadPeriods();
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách kỳ KPI"));
    } finally {
      setLoading(false);
    }
  }, [loadPeriods]);

  useEffect(() => {
    if (!authz.loading && canView && !initializedFromQuery) {
      if (initialQuery.userId && canViewBranch) {
        setScope("BRANCH");
        setSelectedUserId(initialQuery.userId);
        setSelectedEmployeeNameOverride(initialQuery.employeeName);
      } else {
        setScope("SELF");
        setSelectedUserId("");
        setSelectedEmployeeNameOverride("");
      }

      setInitializedFromQuery(true);
      void reloadAll();
    }

    if (!authz.loading && !canView) {
      setLoading(false);
    }
  }, [
    authz.loading,
    canView,
    canViewBranch,
    initialQuery.employeeName,
    initialQuery.userId,
    initializedFromQuery,
    reloadAll,
  ]);

  useEffect(() => {
    if (!selectedPeriodId) return;

    const desiredProfileCode =
      scope === "BRANCH" && selectedUserId ? SA_PROFILE_CODE : selfProfileCode;

    void loadProfiles(selectedPeriodId, desiredProfileCode);
  }, [loadProfiles, scope, selectedPeriodId, selectedUserId, selfProfileCode]);

  useEffect(() => {
    if (selectedPeriodId && selectedProfileCode) {
      void loadDashboardData({ silent: hasDashboardData });
    }
  }, [hasDashboardData, loadDashboardData, selectedPeriodId, selectedProfileCode]);

  useEffect(() => {
    if (!selectedPeriodId || !selectedProfileCode) return;

    const timer = window.setInterval(() => {
      void loadDashboardData({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [loadDashboardData, selectedPeriodId, selectedProfileCode]);

  const refresh = async () => {
    setNotice("");
    await loadDashboardData({ silent: hasDashboardData });
  };

  const viewSelfDashboard = () => {
    setScope("SELF");
    setSelectedUserId("");
    setSelectedEmployeeNameOverride("");
    setSelectedProfileCode(ensureProfileCode(profiles, selfProfileCode));
  };

  const viewTeamMemberDashboard = (
    userId: number | string,
    employeeName = ""
  ) => {
    setScope("BRANCH");
    setSelectedUserId(String(userId));
    setSelectedEmployeeNameOverride(employeeName);
    setSelectedProfileCode(ensureProfileCode(profiles, SA_PROFILE_CODE));
  };

  const recalculate = async () => {
    if (!selectedPeriodId || !selectedProfileCode || !canCalculateAuto) return;

    try {
      setCalculating(true);
      setError("");
      setNotice("");

      const payload = {
        period: selectedPeriodId,
        profile_code: selectedProfileCode,
        user: effectiveUserId || undefined,
      };

      await kpiDashboardService.calculateAuto(payload);
      await kpiDashboardService.calculateSummary(payload);
      await loadDashboardData({ silent: hasDashboardData });
      setNotice("Đã tính lại dữ liệu KPI tự động từ CRM.");
    } catch (err) {
      setError(getErrorMessage(err, "Không tính lại được KPI tự động"));
    } finally {
      setCalculating(false);
    }
  };

  return {
    authz,
    canView,
    canViewSelf,
    canViewBranch,
    canCalculateAuto,

    scope,
    setScope,

    periods,
    profiles,
    selectedPeriodId,
    selectedPeriod,
    setSelectedPeriodId,
    selectedProfileCode,
    selectedProfile,
    selectedUserId,
    setSelectedUserId,
    effectiveUserId,
    selfProfileCode,
    selectedEmployeeName,

    activeSummary,
    teamMembers,
    metricSections,
    manualSections,
    autoSections,
    otherSections,
    gateItems,

    params,
    loading: authz.loading || loading,
    loadingDetail,
    backgroundRefreshing,
    hasDashboardData,
    calculating,
    error: error || authz.error,
    notice,
    lastUpdatedAt,

    refresh,
    reloadAll,
    recalculate,
    viewSelfDashboard,
    viewTeamMemberDashboard,
  };
}

export type KpiDashboardController = ReturnType<typeof useKpiDashboard>;
