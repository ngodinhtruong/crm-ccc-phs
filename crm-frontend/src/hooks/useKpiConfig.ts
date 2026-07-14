"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PermissionCode,
  useCurrentUserPermissions,
} from "@/hooks/useCurrentUserPermissions";
import { kpiService } from "@/services/kpi.service";
import {
  KpiGateConfigPayload,
  KpiGateDefinitionItem,
  KpiGroupItem,
  KpiGroupPayload,
  KpiMetricDefinitionItem,
  KpiMetricPayload,
  KpiPeriodDetail,
  KpiPeriodGateConfigItem,
  KpiPeriodItem,
  KpiPeriodMetricItem,
  KpiRewardTierConfigItem,
  KpiRewardTierPayload,
  KpiWeightValidation,
} from "@/types/kpi.type";

export type KpiConfigTab = "groups" | "metrics" | "gates" | "rewards";

function formatApiErrorData(data: unknown): string {
  if (!data) return "";

  if (typeof data === "string") return data;

  if (Array.isArray(data)) return data.map(String).join(" ");

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const messages: string[] = [];

    if (typeof obj.detail === "string") {
      messages.push(obj.detail);
    }

    const weightValidation = obj.weight_validation as
      | { errors?: string[] }
      | undefined;

    if (weightValidation?.errors?.length) {
      messages.push(weightValidation.errors.join(" "));
    }

    Object.entries(obj).forEach(([key, value]) => {
      if (key === "detail" || key === "weight_validation") return;

      if (Array.isArray(value)) {
        messages.push(`${key}: ${value.map(String).join(" ")}`);
        return;
      }

      if (typeof value === "string") {
        messages.push(`${key}: ${value}`);
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

  if (apiMessage) {
    return `${fallback}. ${apiMessage}`;
  }

  return `${fallback}. Status: ${
    error?.response?.status || "unknown"
  } - ${error?.message || "Không rõ lỗi"}`;
}

function normalizeDecimal(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "0.00";

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return "0.00";

  return parsed.toFixed(2);
}

function getInitialPeriodId(periods: KpiPeriodItem[]) {
  const active = periods.find((item) => item.status === "ACTIVE");
  const draft = periods.find((item) => item.status === "DRAFT");

  return String(active?.id || draft?.id || periods[0]?.id || "");
}

export function useKpiConfig() {
  const authz = useCurrentUserPermissions();

  const canManage = authz.hasPermission(PermissionCode.KPI_CONFIG_MANAGE);
  const canView =
    canManage ||
    authz.hasPermission(PermissionCode.KPI_CONFIG_VIEW) ||
    authz.hasPermission(PermissionCode.SA_KPI_CONFIG);

  const [activeTab, setActiveTab] = useState<KpiConfigTab>("metrics");

  const [periods, setPeriods] = useState<KpiPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [periodDetail, setPeriodDetail] = useState<KpiPeriodDetail | null>(
    null
  );

  const [groupRows, setGroupRows] = useState<KpiGroupItem[]>([]);
  const [metricRows, setMetricRows] = useState<KpiPeriodMetricItem[]>([]);
  const [gateRows, setGateRows] = useState<KpiPeriodGateConfigItem[]>([]);
  const [rewardRows, setRewardRows] = useState<KpiRewardTierConfigItem[]>([]);

  const [metricDefinitions, setMetricDefinitions] = useState<
    KpiMetricDefinitionItem[]
  >([]);
  const [gateDefinitions, setGateDefinitions] = useState<
    KpiGateDefinitionItem[]
  >([]);

  const [weightValidation, setWeightValidation] =
    useState<KpiWeightValidation | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedPeriod = useMemo(() => {
    return periods.find((item) => String(item.id) === selectedPeriodId) || null;
  }, [periods, selectedPeriodId]);

  const syncDetailToRows = (detail: KpiPeriodDetail) => {
    setPeriodDetail(detail);
    setGroupRows(detail.groups || []);
    setMetricRows(detail.metrics || []);
    setGateRows(detail.gate_configs || []);
    setRewardRows(detail.reward_tiers || []);
  };

  const loadPeriods = useCallback(async () => {
    const data = await kpiService.getPeriods();

    setPeriods(data);

    if (!selectedPeriodId && data.length > 0) {
      setSelectedPeriodId(getInitialPeriodId(data));
    }
  }, [selectedPeriodId]);

  const loadDefinitions = useCallback(async () => {
    const [metricDefinitionData, gateDefinitionData] = await Promise.all([
      kpiService.getMetricDefinitions({ is_active: "true" }),
      kpiService.getGateDefinitions({ is_active: "true" }),
    ]);

    setMetricDefinitions(metricDefinitionData);
    setGateDefinitions(gateDefinitionData);
  }, []);

  const loadPeriodDetail = useCallback(async (periodId: string) => {
    if (!periodId) return;

    try {
      setLoadingDetail(true);
      setError("");

      const detail = await kpiService.getPeriodDetail(periodId);

      syncDetailToRows(detail);

      try {
        const validation = await kpiService.validateWeights(periodId);
        setWeightValidation(validation);
      } catch (err) {
        const validationError = err as {
          response?: {
            data?: {
              valid?: boolean;
              errors?: string[];
            };
          };
        };

        setWeightValidation({
          valid: false,
          errors: validationError.response?.data?.errors || [
            "Cấu hình trọng số chưa hợp lệ.",
          ],
        });
      }
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được cấu hình KPI"));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    try {
      setLoading(true);
    //   setError("");

      await Promise.all([loadPeriods(), loadDefinitions()]);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu KPI"));
    } finally {
      setLoading(false);
    }
  }, [loadPeriods, loadDefinitions]);

  useEffect(() => {
    if (!authz.loading && canView) {
      void reloadAll();
    }

    if (!authz.loading && !canView) {
      setLoading(false);
    }
  }, [authz.loading, canView, reloadAll]);

  useEffect(() => {
    if (selectedPeriodId) {
      void loadPeriodDetail(selectedPeriodId);
    }
  }, [selectedPeriodId, loadPeriodDetail]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const setGroupField = <K extends keyof KpiGroupItem>(
    id: number,
    key: K,
    value: KpiGroupItem[K]
  ) => {
    setGroupRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const setMetricField = <K extends keyof KpiPeriodMetricItem>(
    id: number,
    key: K,
    value: KpiPeriodMetricItem[K]
  ) => {
    setMetricRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const setGateField = <K extends keyof KpiPeriodGateConfigItem>(
    id: number,
    key: K,
    value: KpiPeriodGateConfigItem[K]
  ) => {
    setGateRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const setRewardField = <K extends keyof KpiRewardTierConfigItem>(
    id: number,
    key: K,
    value: KpiRewardTierConfigItem[K]
  ) => {
    setRewardRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const markGroupInactive = (groupId: number) => {
    const group = groupRows.find((item) => item.id === groupId);

    if (!group) return;

    setGroupRows((prev) =>
      prev.map((item) =>
        item.id === groupId
          ? { ...item, is_active: false, weight_percent: "0.00" }
          : item
      )
    );

    setMetricRows((prev) =>
      prev.map((item) =>
        item.group === groupId
          ? { ...item, is_active: false, weight_percent: "0.00" }
          : item
      )
    );

    setNotice(
      `Đã tắt tạm nhóm ${group.group_code}. Hãy chỉnh lại trọng số và bấm "Lưu trọng số".`
    );
  };

  const markMetricInactive = (metricId: number) => {
    setMetricRows((prev) =>
      prev.map((item) =>
        item.id === metricId
          ? { ...item, is_active: false, weight_percent: "0.00" }
          : item
      )
    );

    setNotice(
      'Đã tắt tạm KPI. Hãy chỉnh lại trọng số và bấm "Lưu trọng số".'
    );
  };

  const saveWeights = async () => {
    if (!periodDetail) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.saveWeightConfig(periodDetail.id, {
        groups: groupRows.map((item) => ({
          id: item.id,
          weight_percent: normalizeDecimal(item.weight_percent),
          is_active: item.is_active,
        })),
        metrics: metricRows.map((item) => ({
          id: item.id,
          weight_percent: normalizeDecimal(item.weight_percent),
          is_active: item.is_active,
        })),
      });

      setNotice(response.detail);
      setWeightValidation(response.weight_validation);
      syncDetailToRows(response.period);
      await loadPeriods();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được trọng số KPI"));
    } finally {
      setSaving(false);
    }
  };

  const saveGroup = async (item: KpiGroupItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updateGroup(item.id, {
        group_name: item.group_name,
        group_type: item.group_type,
        sort_order: item.sort_order,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period));
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được nhóm KPI"));
    } finally {
      setSaving(false);
    }
  };

  const saveMetric = async (item: KpiPeriodMetricItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updateMetric(item.id, {
        metric_name: item.metric_name,
        target_value: item.target_value || null,
        min_value: item.min_value || null,
        max_value: item.max_value || null,
        description: item.description || "",
        sort_order: item.sort_order,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period));
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được KPI"));
    } finally {
      setSaving(false);
    }
  };

  const saveGate = async (item: KpiPeriodGateConfigItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updateGateConfig(item.id, {
        gate_name: item.gate_name,
        operator: item.operator,
        threshold_value: item.threshold_value,
        is_required: item.is_required,
        is_active: item.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period));
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được gate KPI"));
    } finally {
      setSaving(false);
    }
  };

  const saveReward = async (item: KpiRewardTierConfigItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updateRewardTier(item.id, {
        tier_name: item.tier_name,
        description: item.description || "",
        rank_metric_code: item.rank_metric_code || null,
        rank_limit: item.rank_limit || null,
        min_total_score: item.min_total_score || null,
        require_all_gates_passed: item.require_all_gates_passed,
        reward_type: item.reward_type || null,
        sort_order: item.sort_order,
        is_active: item.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period));
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được bậc thưởng KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addGroup = async (
    payload: Omit<KpiGroupPayload, "period" | "weight_percent" | "is_active">
  ) => {
    if (!periodDetail) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createGroup({
        ...payload,
        period: periodDetail.id,
        weight_percent: "0.00",
        is_active: false,
      });

      setNotice(
        `${response.detail} Nhóm mới đang tắt và trọng số 0%, hãy bật bằng màn hình trọng số.`
      );

      await loadPeriodDetail(String(periodDetail.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được nhóm KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addMetric = async (
    payload: Omit<
      KpiMetricPayload,
      "period" | "weight_percent" | "is_active"
    >
  ) => {
    if (!periodDetail) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createMetric({
        ...payload,
        period: periodDetail.id,
        weight_percent: "0.00",
        is_active: false,
      });

      setNotice(
        `${response.detail} KPI mới đang tắt và trọng số 0%, hãy bật bằng màn hình trọng số.`
      );

      await loadPeriodDetail(String(periodDetail.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addGate = async (
    payload: Omit<KpiGateConfigPayload, "period">
  ) => {
    if (!periodDetail) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createGateConfig({
        ...payload,
        period: periodDetail.id,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(periodDetail.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được gate KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addReward = async (
    payload: Omit<KpiRewardTierPayload, "period">
  ) => {
    if (!periodDetail) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createRewardTier({
        ...payload,
        period: periodDetail.id,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(periodDetail.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được bậc thưởng KPI"));
    } finally {
      setSaving(false);
    }
  };

  const deleteGate = async (item: KpiPeriodGateConfigItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.deleteGateConfig(item.id);

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period));
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được gate KPI"));
    } finally {
      setSaving(false);
    }
  };

  const deleteReward = async (item: KpiRewardTierConfigItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.deleteRewardTier(item.id);

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period));
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được bậc thưởng KPI"));
    } finally {
      setSaving(false);
    }
  };

  const createMonthlyPeriod = async (
    year: number,
    month: number,
    activate: boolean
  ) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createMonthlyPeriod({
        year,
        month,
        activate,
      });

      setNotice(response.detail);
      await loadPeriods();

      setSelectedPeriodId(String(response.period.id));
      syncDetailToRows(response.period);
    } catch (err) {
      setError(getErrorMessage(err, "Không tạo được kỳ KPI"));
    } finally {
      setSaving(false);
    }
  };

  return {
    authz,

    canView,
    canManage,

    activeTab,
    setActiveTab,

    periods,
    selectedPeriodId,
    selectedPeriod,
    setSelectedPeriodId,

    periodDetail,

    groupRows,
    metricRows,
    gateRows,
    rewardRows,

    metricDefinitions,
    gateDefinitions,

    weightValidation,

    loading: authz.loading || loading,
    loadingDetail,
    saving,

    error,
    notice,

    setGroupField,
    setMetricField,
    setGateField,
    setRewardField,

    markGroupInactive,
    markMetricInactive,

    saveWeights,
    saveGroup,
    saveMetric,
    saveGate,
    saveReward,

    addGroup,
    addMetric,
    addGate,
    addReward,

    deleteGate,
    deleteReward,

    createMonthlyPeriod,

    reloadAll,
    reloadPeriodDetail: () => {
      if (selectedPeriodId) {
        void loadPeriodDetail(selectedPeriodId);
      }
    },
  };
}

export type KpiConfigController = ReturnType<typeof useKpiConfig>;