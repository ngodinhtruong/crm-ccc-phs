import { useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/utils/error.util";

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
  const map = new Map<string | number, KpiUserMetricResultItem>();

  results.forEach((item) => {
    if (item.metric != null) {
      map.set(item.metric, item);
      map.set(String(item.metric), item);
      map.set(Number(item.metric), item);
    }
    if (item.metric_code) {
      map.set(item.metric_code, item);
    }
  });

  return map;
}

function getSectionMap(sections: KpiSectionItem[]) {
  const map = new Map<string | number, KpiSectionItem>();

  sections.forEach((item) => {
    if (item.id != null) {
      map.set(item.id, item);
      map.set(String(item.id), item);
      map.set(Number(item.id), item);
    }
    if (item.section_code) {
      map.set(item.section_code, item);
    }
  });

  return map;
}

function getGroupMap(groups: KpiGroupItem[]) {
  const map = new Map<string | number, KpiGroupItem>();

  groups.forEach((item) => {
    if (item.id != null) {
      map.set(item.id, item);
      map.set(String(item.id), item);
      map.set(Number(item.id), item);
    }
    if (item.group_code) {
      map.set(item.group_code, item);
    }
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
  const sourceType =
    result?.source_type === "AUTO" ? "AUTO" : inferSourceType(metric, group);
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
    sourceType,
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
    .filter((section) => section.is_active !== false)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => {
      const sectionGroups = groups
        .filter(
          (group) =>
            (String(group.section) === String(section.id) ||
              (group.section_code && group.section_code === section.section_code)) &&
            group.is_active !== false
        )
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((group): KpiMetricGroup => {
          const groupMetrics = metrics
            .filter(
              (metric) =>
                (String(metric.group) === String(group.id) ||
                  (metric.group_code && metric.group_code === group.group_code)) &&
                metric.is_active !== false
            )
            .slice()
            .sort((a, b) => (a.metric_code || "").localeCompare(b.metric_code || ""))
            .map((metric) =>
              buildProgressMetric(
                metric,
                resultMap.get(metric.id) || (metric.metric_code ? resultMap.get(metric.metric_code) : null) || null,
                groupMap.get(metric.group) || group
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
          const group = groupMap.get(metric.group) || (metric.group_code ? groupMap.get(metric.group_code) : null);
          const metricSection = group?.section ? sectionMap.get(group.section) : null;

          return !group && metricSection?.id === section.id;
        })
        .map((metric) =>
          buildProgressMetric(
            metric,
            resultMap.get(metric.id) || (metric.metric_code ? resultMap.get(metric.metric_code) : null) || null
          )
        );

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
                group_type: "MANUAL",
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
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get("user") || searchParams.get("user_id") || "";
  const urlPeriodId = searchParams.get("period") || "";
  const urlEmployeeName = searchParams.get("employeeName") || searchParams.get("employee_name") || "";
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

  const filteredResults = useMemo(() => {
    if (!effectiveUserId) return results;

    return results.filter((item) => String(item.user) === effectiveUserId);
  }, [effectiveUserId, results]);

  const filteredGateResults = useMemo(() => {
    if (!effectiveUserId) return gateResults;

    return gateResults.filter((item) => String(item.user) === effectiveUserId);
  }, [effectiveUserId, gateResults]);

  const displayUserCard = useMemo(() => {
    if (activeSummary) {
      return {
        employee_name: activeSummary.employee_name || activeSummary.user_username || "—",
        user_username: activeSummary.user_username || "",
        user_email: activeSummary.user_email || "",
        employee_position: activeSummary.employee_position || null,
        branch_name: activeSummary.branch_name || null,
        role_names: activeSummary.role_names || [],
      };
    }

    const firstResult = filteredResults.find((r) => String(r.user) === effectiveUserId) || filteredResults[0];

    if (scope === "BRANCH" && selectedUserId) {
      const selectedMember = teamMembers.find(
        (item) => String(item.user) === selectedUserId
      );
      if (selectedMember) {
        return {
          employee_name:
            selectedMember.employee_name ||
            selectedMember.user_username ||
            firstResult?.employee_name ||
            firstResult?.user_username ||
            selectedEmployeeNameOverride ||
            `User ${selectedUserId}`,
          user_username: selectedMember.user_username || firstResult?.user_username || "",
          user_email: selectedMember.user_email || firstResult?.user_email || "",
          employee_position: selectedMember.employee_position || null,
          branch_name: selectedMember.branch_name || firstResult?.branch_name || null,
          role_names: selectedMember.role_names || [],
        };
      }

      if (firstResult && String(firstResult.user) === selectedUserId) {
        return {
          employee_name:
            firstResult.employee_name ||
            firstResult.user_username ||
            selectedEmployeeNameOverride ||
            `User ${selectedUserId}`,
          user_username: firstResult.user_username || "",
          user_email: firstResult.user_email || "",
          employee_position: null,
          branch_name: firstResult.branch_name || null,
          role_names: [],
        };
      }

      if (selectedEmployeeNameOverride) {
        return {
          employee_name: selectedEmployeeNameOverride,
          user_username: firstResult?.user_username || "",
          user_email: firstResult?.user_email || "",
          employee_position: null,
          branch_name: firstResult?.branch_name || null,
          role_names: [],
        };
      }
    }

    // Fallback to currently logged-in user (e.g. Admin)
    const cur = authz.currentUser;
    if (cur) {
      const emp = cur.employee;
      const roleNames = cur.roles?.map((r) => r.role_name).filter(Boolean) || [];
      if (cur.is_superuser || cur.is_global_admin) {
        roleNames.unshift("Quản trị hệ thống");
      }
      return {
        employee_name: emp?.full_name || cur.full_name || cur.username || "Admin",
        user_username: cur.username || "",
        user_email: cur.email || "",
        employee_position: emp?.position || (cur.is_superuser ? "Administrator" : null),
        branch_name: emp?.branch?.branch_name || null,
        role_names: Array.from(new Set(roleNames)),
      };
    }

    return null;
  }, [activeSummary, scope, selectedUserId, teamMembers, selectedEmployeeNameOverride, authz.currentUser, filteredResults, effectiveUserId]);

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

  const computedScores = useMemo(() => {
    let manualScore = activeSummary?.manual_score != null ? toNumber(activeSummary.manual_score) : null;
    let autoScore = activeSummary?.auto_score != null ? toNumber(activeSummary.auto_score) : null;
    let totalScore = activeSummary?.total_score != null ? toNumber(activeSummary.total_score) : null;

    if ((manualScore === null || manualScore === 0) && manualSections.length > 0) {
      let sum = 0;
      let hasValue = false;
      manualSections.forEach((sec) => {
        sec.groups.forEach((grp) => {
          grp.metrics.forEach((m) => {
            const wScore = toNumber(m.result?.weighted_score);
            if (wScore !== null) {
              sum += wScore;
              hasValue = true;
            } else if (m.result?.score != null && m.metric.weight_percent) {
              const sc = toNumber(m.result.score) || 0;
              const wp = toNumber(m.metric.weight_percent) || 0;
              sum += (sc * wp) / 100;
              hasValue = true;
            }
          });
        });
      });
      if (hasValue && sum > 0) manualScore = sum;
    }

    if ((autoScore === null || autoScore === 0) && autoSections.length > 0) {
      let sum = 0;
      let hasValue = false;
      autoSections.forEach((sec) => {
        sec.groups.forEach((grp) => {
          grp.metrics.forEach((m) => {
            const wScore = toNumber(m.result?.weighted_score);
            if (wScore !== null) {
              sum += wScore;
              hasValue = true;
            } else if (m.progressPercent !== null && m.metric.weight_percent) {
              const sc = m.progressPercent;
              const wp = toNumber(m.metric.weight_percent) || 0;
              sum += (sc * wp) / 100;
              hasValue = true;
            }
          });
        });
      });
      if (hasValue && sum > 0) autoScore = sum;
    }

    if (totalScore === null || totalScore === 0) {
      if (manualScore !== null || autoScore !== null) {
        totalScore = (manualScore || 0) + (autoScore || 0);
      }
    }

    return {
      manualScore,
      autoScore,
      totalScore,
    };
  }, [activeSummary, manualSections, autoSections]);

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

      if (urlPeriodId && data.some((item) => String(item.id) === urlPeriodId)) {
        return urlPeriodId;
      }

      return getCurrentMonthPeriodDefault(data);
    });
  }, [urlPeriodId]);

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
      if (urlUserId && canViewBranch) {
        setScope("BRANCH");
        setSelectedUserId(urlUserId);
        setSelectedEmployeeNameOverride(urlEmployeeName);
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
    urlEmployeeName,
    urlUserId,
    initializedFromQuery,
    reloadAll,
  ]);

  // Dynamically sync state when URL searchParams change (e.g. clicking employee row in ranking table)
  useEffect(() => {
    if (initializedFromQuery && canViewBranch && urlUserId && urlUserId !== selectedUserId) {
      setScope("BRANCH");
      setSelectedUserId(urlUserId);
      if (urlEmployeeName) {
        setSelectedEmployeeNameOverride(urlEmployeeName);
      }
    }
  }, [initializedFromQuery, canViewBranch, urlUserId, selectedUserId, urlEmployeeName]);

  useEffect(() => {
    if (!selectedPeriodId) return;

    const targetUserSummary =
      scope === "BRANCH" && selectedUserId
        ? summaries.find((item) => String(item.user) === selectedUserId) ||
          teamSummaries.find((item) => String(item.user) === selectedUserId)
        : null;

    const targetProfileCode = targetUserSummary?.profile_code || null;

    const desiredProfileCode =
      scope === "BRANCH" && selectedUserId
        ? targetProfileCode || SA_PROFILE_CODE
        : selfProfileCode;

    void loadProfiles(selectedPeriodId, desiredProfileCode);
  }, [loadProfiles, scope, selectedPeriodId, selectedUserId, selfProfileCode, summaries, teamSummaries]);

  // Automatically align selectedProfileCode with target user's actual profile (e.g. SA_SUP vs SA)
  useEffect(() => {
    if (scope === "BRANCH" && selectedUserId) {
      const targetUserSummary =
        summaries.find((item) => String(item.user) === selectedUserId) ||
        teamSummaries.find((item) => String(item.user) === selectedUserId);

      if (
        targetUserSummary?.profile_code &&
        targetUserSummary.profile_code !== selectedProfileCode &&
        profiles.some((p) => p.profile_code === targetUserSummary.profile_code)
      ) {
        setSelectedProfileCode(targetUserSummary.profile_code);
      }
    }
  }, [scope, selectedUserId, summaries, teamSummaries, selectedProfileCode, profiles]);

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
    displayUserCard,
    computedScores,
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
