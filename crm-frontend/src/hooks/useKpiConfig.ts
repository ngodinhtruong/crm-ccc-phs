"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PermissionCode,
  useCurrentUserPermissions,
} from "@/hooks/useCurrentUserPermissions";
import { kpiService } from "@/services/kpi.service";
import { saleAdminApi } from "@/apis/sale-admin.api";
import { SaIcpGroup } from "@/types/sale-admin.type";
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
  KpiPeriodPayload,
  KpiProfileItem,
  KpiRewardTierConfigItem,
  KpiRewardTierPayload,
  KpiSectionItem,
  KpiSectionPayload,
  KpiWeightValidation,
} from "@/types/kpi.type";

export type KpiConfigTab = "groups" | "metrics" | "gates" | "rewards" | "icp";

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

function getInitialProfileId(profiles: KpiProfileItem[]) {
  const active = profiles.find((item) => item.is_active);
  return String(active?.id || profiles[0]?.id || "");
}

function getSafeMeasurementFormula(value?: string | null) {
  return value?.trim() || "Chưa cấu hình công thức tính";
}

function belongsToProfile(
  item: { profile?: number | null; profile_code?: string | null },
  profile: KpiProfileItem | null
) {
  if (!profile) return true;

  if (item.profile) {
    return item.profile === profile.id;
  }

  if (item.profile_code) {
    return item.profile_code === profile.profile_code;
  }

  return true;
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

  const [periodDetail, setPeriodDetail] = useState<KpiPeriodDetail | null>(null);

  const [profileRows, setProfileRows] = useState<KpiProfileItem[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const [sectionRowsAll, setSectionRowsAll] = useState<KpiSectionItem[]>([]);
  const [groupRowsAll, setGroupRowsAll] = useState<KpiGroupItem[]>([]);
  const [metricRowsAll, setMetricRowsAll] = useState<KpiPeriodMetricItem[]>([]);
  const [gateRowsAll, setGateRowsAll] = useState<KpiPeriodGateConfigItem[]>([]);
  const [rewardRowsAll, setRewardRowsAll] = useState<KpiRewardTierConfigItem[]>(
    []
  );

  /**
   * Backend mới không còn KPI master. State này giữ rỗng để các component cũ chưa refactor không bị vỡ.
   */
  const [metricDefinitions] = useState<KpiMetricDefinitionItem[]>([]);
  const [gateDefinitions, setGateDefinitions] = useState<
    KpiGateDefinitionItem[]
  >([]);

  const [weightValidation, setWeightValidation] =
    useState<KpiWeightValidation | null>(null);

  const [icpGroups, setIcpGroups] = useState<SaIcpGroup[]>([]);
  const [loadingIcp, setLoadingIcp] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedPeriod = useMemo(() => {
    return periods.find((item) => String(item.id) === selectedPeriodId) || null;
  }, [periods, selectedPeriodId]);

  const selectedProfile = useMemo(() => {
    return (
      profileRows.find((item) => String(item.id) === selectedProfileId) || null
    );
  }, [profileRows, selectedProfileId]);

  const sectionRows = useMemo(() => {
    return sectionRowsAll
      .filter((item) => belongsToProfile(item, selectedProfile))
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [sectionRowsAll, selectedProfile]);

  const groupRows = useMemo(() => {
    return groupRowsAll
      .filter((item) => belongsToProfile(item, selectedProfile))
      .sort((a, b) => {
        const sectionA = sectionRowsAll.find((section) => section.id === a.section);
        const sectionB = sectionRowsAll.find((section) => section.id === b.section);

        return (
          (sectionA?.sort_order || 0) - (sectionB?.sort_order || 0) ||
          a.sort_order - b.sort_order ||
          a.id - b.id
        );
      });
  }, [groupRowsAll, sectionRowsAll, selectedProfile]);

  const metricRows = useMemo(() => {
    return metricRowsAll
      .filter((item) => belongsToProfile(item, selectedProfile))
      .sort((a, b) => {
        const groupA = groupRowsAll.find((group) => group.id === a.group);
        const groupB = groupRowsAll.find((group) => group.id === b.group);
        const sectionA = sectionRowsAll.find(
          (section) => section.id === groupA?.section
        );
        const sectionB = sectionRowsAll.find(
          (section) => section.id === groupB?.section
        );

        return (
          (sectionA?.sort_order || 0) - (sectionB?.sort_order || 0) ||
          (groupA?.sort_order || 0) - (groupB?.sort_order || 0) ||
          a.metric_code.localeCompare(b.metric_code) ||
          a.id - b.id
        );
      });
  }, [metricRowsAll, groupRowsAll, sectionRowsAll, selectedProfile]);

  const gateRows = useMemo(() => {
    return gateRowsAll
      .filter((item) => belongsToProfile(item, selectedProfile))
      .sort((a, b) => a.gate_code.localeCompare(b.gate_code) || a.id - b.id);
  }, [gateRowsAll, selectedProfile]);

  const rewardRows = useMemo(() => {
    return rewardRowsAll
      .filter((item) => belongsToProfile(item, selectedProfile))
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [rewardRowsAll, selectedProfile]);

  const syncDetailToRows = useCallback(
    (detail: KpiPeriodDetail, preferredProfileId?: string) => {
      const profiles = detail.profiles || [];
      const nextProfileId =
        preferredProfileId && profiles.some((item) => String(item.id) === preferredProfileId)
          ? preferredProfileId
          : selectedProfileId &&
            profiles.some((item) => String(item.id) === selectedProfileId)
          ? selectedProfileId
          : getInitialProfileId(profiles);

      setPeriodDetail(detail);
      setProfileRows(profiles);
      setSelectedProfileId(nextProfileId);
      setSectionRowsAll(detail.sections || []);
      setGroupRowsAll(detail.groups || []);
      setMetricRowsAll(detail.metrics || []);
      setGateRowsAll(detail.gate_configs || []);
      setRewardRowsAll(detail.reward_tiers || []);

      return nextProfileId;
    },
    [selectedProfileId]
  );

  const loadWeightValidation = useCallback(
    async (periodId: string, profileId?: string) => {
      if (!periodId) return;

      const profile =
        profileRows.find((item) => String(item.id) === profileId) ||
        profileRows.find((item) => String(item.id) === selectedProfileId);

      try {
        const validation = await kpiService.validateWeights(periodId, {
          profile: profile?.id,
          profile_code: profile?.profile_code,
        });
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
    },
    [profileRows, selectedProfileId]
  );

  const loadPeriods = useCallback(async () => {
    const data = await kpiService.getPeriods();

    setPeriods(data);

    if (!selectedPeriodId && data.length > 0) {
      setSelectedPeriodId(getInitialPeriodId(data));
    }
  }, [selectedPeriodId]);

  const loadDefinitions = useCallback(async () => {
    const gateDefinitionData = await kpiService.getGateDefinitions({
      is_active: "true",
    });

    setGateDefinitions(gateDefinitionData);
  }, []);

  const loadPeriodDetail = useCallback(
    async (periodId: string, preferredProfileId?: string) => {
      if (!periodId) return;

      try {
        setLoadingDetail(true);
        setError("");

        const detail = await kpiService.getPeriodDetail(periodId);
        const nextProfileId = syncDetailToRows(detail, preferredProfileId);

        const nextProfile = (detail.profiles || []).find(
          (item) => String(item.id) === nextProfileId
        );

        try {
          const validation = await kpiService.validateWeights(periodId, {
            profile: nextProfile?.id,
            profile_code: nextProfile?.profile_code,
          });
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
    },
    [syncDetailToRows]
  );

  const reloadAll = useCallback(async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    if (selectedPeriodId && selectedProfileId && profileRows.length > 0) {
      void loadWeightValidation(selectedPeriodId, selectedProfileId);
    }
  }, [selectedPeriodId, selectedProfileId, profileRows.length, loadWeightValidation]);

  const fetchIcpGroups = useCallback(async () => {
    try {
      setLoadingIcp(true);
      const groups = await saleAdminApi.getIcpGroups(true);
      setIcpGroups(groups);
    } catch (err: unknown) {
      console.error("Lỗi khi tải danh sách ICP groups:", err);
    } finally {
      setLoadingIcp(false);
    }
  }, []);

  const createIcpGroup = useCallback(
    async (payload: Partial<SaIcpGroup>) => {
      try {
        setSaving(true);
        setError("");
        const created = await saleAdminApi.createIcpGroup(payload);
        setNotice(`Đã tạo phân khúc ICP: ${created.icp_code} - ${created.icp_name}`);
        await fetchIcpGroups();
        return created;
      } catch (err: unknown) {
        const errMsg = getErrorMessage(err, "Tạo phân khúc ICP thất bại");
        setError(errMsg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [fetchIcpGroups]
  );

  const updateIcpGroup = useCallback(
    async (id: number, payload: Partial<SaIcpGroup>) => {
      try {
        setSaving(true);
        setError("");
        const updated = await saleAdminApi.updateIcpGroup(id, payload);
        setNotice(`Đã cập nhật phân khúc ICP: ${updated.icp_code} - ${updated.icp_name}`);
        await fetchIcpGroups();
        return updated;
      } catch (err: unknown) {
        const errMsg = getErrorMessage(err, "Cập nhật phân khúc ICP thất bại");
        setError(errMsg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [fetchIcpGroups]
  );

  const deleteIcpGroup = useCallback(
    async (id: number) => {
      try {
        setSaving(true);
        setError("");
        await saleAdminApi.deleteIcpGroup(id);
        setNotice("Đã ngưng sử dụng phân khúc ICP thành công.");
        await fetchIcpGroups();
      } catch (err: unknown) {
        const errMsg = getErrorMessage(err, "Ngưng sử dụng phân khúc ICP thất bại");
        setError(errMsg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [fetchIcpGroups]
  );

  useEffect(() => {
    if (activeTab === "icp") {
      void fetchIcpGroups();
    }
  }, [activeTab, fetchIcpGroups]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const changeSelectedProfileId = (profileId: string) => {
    setSelectedProfileId(profileId);
    clearMessages();
  };

  const setSectionField = <K extends keyof KpiSectionItem>(
    id: number,
    key: K,
    value: KpiSectionItem[K]
  ) => {
    setSectionRowsAll((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const setGroupField = <K extends keyof KpiGroupItem>(
    id: number,
    key: K,
    value: KpiGroupItem[K]
  ) => {
    setGroupRowsAll((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const setMetricField = <K extends keyof KpiPeriodMetricItem>(
    id: number,
    key: K,
    value: KpiPeriodMetricItem[K]
  ) => {
    setMetricRowsAll((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const setGateField = <K extends keyof KpiPeriodGateConfigItem>(
    id: number,
    key: K,
    value: KpiPeriodGateConfigItem[K]
  ) => {
    setGateRowsAll((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const setRewardField = <K extends keyof KpiRewardTierConfigItem>(
    id: number,
    key: K,
    value: KpiRewardTierConfigItem[K]
  ) => {
    setRewardRowsAll((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const markSectionInactive = (sectionId: number) => {
    const section = sectionRows.find((item) => item.id === sectionId);

    if (!section) return;

    const groupIds = groupRows
      .filter((item) => item.section === sectionId)
      .map((item) => item.id);

    setSectionRowsAll((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? { ...item, is_active: false, weight_percent: "0.00" }
          : item
      )
    );

    setGroupRowsAll((prev) =>
      prev.map((item) =>
        item.section === sectionId
          ? { ...item, is_active: false, weight_percent: "0.00" }
          : item
      )
    );

    setMetricRowsAll((prev) =>
      prev.map((item) =>
        groupIds.includes(item.group)
          ? { ...item, is_active: false, weight_percent: "0.00" }
          : item
      )
    );

    setNotice(
      `Đã tắt tạm phần ${section.section_code}. Hãy chỉnh lại trọng số và bấm "Lưu trọng số".`
    );
  };

  const markGroupInactive = (groupId: number) => {
    const group = groupRows.find((item) => item.id === groupId);

    if (!group) return;

    setGroupRowsAll((prev) =>
      prev.map((item) =>
        item.id === groupId
          ? { ...item, is_active: false, weight_percent: "0.00" }
          : item
      )
    );

    setMetricRowsAll((prev) =>
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
    setMetricRowsAll((prev) =>
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
    if (!periodDetail || !selectedProfile) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.saveWeightConfig(periodDetail.id, {
        profile: selectedProfile.id,
        profile_code: selectedProfile.profile_code,
        sections: sectionRows.map((item) => ({
          id: item.id,
          weight_percent: normalizeDecimal(item.weight_percent),
          is_active: item.is_active,
        })),
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
      syncDetailToRows(response.period, String(selectedProfile.id));
      await loadPeriods();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được trọng số KPI"));
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (item: KpiProfileItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updateProfile(item.id, {
        profile_name: item.profile_name,
        target_role_code: item.target_role_code,
        total_weight: item.total_weight,
        sort_order: item.sort_order,
        is_active: item.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), String(item.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được bộ KPI"));
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async (item: KpiSectionItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updateSection(item.id, {
        section_name: item.section_name,
        weight_percent: item.weight_percent,
        sort_order: item.sort_order,
        is_active: item.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), String(item.profile));
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được phần KPI"));
    } finally {
      setSaving(false);
    }
  };

  const saveGroup = async (item: KpiGroupItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updateGroup(item.id, {
        section: item.section,
        group_name: item.group_name,
        group_type: item.group_type,
        sort_order: item.sort_order,
        is_active: item.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), String(item.profile));
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
        period: item.period,
        profile: item.profile,
        group: item.group,
        metric_code: item.metric_code,
        metric_name: item.metric_name,
        weight_percent: item.weight_percent,
        // work_description: item.work_description || "",
        measurement_formula: getSafeMeasurementFormula(item.measurement_formula),
        target_text: item.target_text || "",
        target_value: item.target_value || null,
        target_unit: item.target_unit || null,
        frequency: item.frequency || null,
        is_active: item.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), String(item.profile));
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
      await loadPeriodDetail(String(item.period), item.profile ? String(item.profile) : undefined);
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
        reward_config: item.reward_config || null,
        sort_order: item.sort_order,
        is_active: item.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), item.profile ? String(item.profile) : undefined);
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được bậc thưởng KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addProfile = async (
    payload: Omit<KpiProfileItem, "id" | "period" | "created_at" | "updated_at" | "period_code">
  ) => {
    if (!periodDetail) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createProfile({
        period: periodDetail.id,
        profile_code: payload.profile_code,
        profile_name: payload.profile_name,
        target_role_code: payload.target_role_code,
        total_weight: payload.total_weight || "100.00",
        sort_order: payload.sort_order,
        is_active: payload.is_active,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(periodDetail.id), String(response.item.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được bộ KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addSection = async (
    payload: Omit<KpiSectionPayload, "period" | "profile" | "weight_percent" | "is_active">
  ) => {
    if (!periodDetail || !selectedProfile) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createSection({
        ...payload,
        period: periodDetail.id,
        profile: selectedProfile.id,
        weight_percent: "0.00",
        is_active: false,
      });

      setNotice(
        `${response.detail} Phần mới đang tắt và trọng số 0%, hãy bật bằng màn hình trọng số.`
      );

      await loadPeriodDetail(String(periodDetail.id), String(selectedProfile.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được phần KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addGroup = async (
    payload: Omit<
      KpiGroupPayload,
      "period" | "profile" | "weight_percent" | "is_active"
    >
  ) => {
    if (!periodDetail || !selectedProfile) return;

    const fallbackSection = sectionRows.find((item) => item.is_active) || sectionRows[0];

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createGroup({
        ...payload,
        section: payload.section || fallbackSection?.id,
        period: periodDetail.id,
        profile: selectedProfile.id,
        weight_percent: "0.00",
        is_active: false,
      });

      setNotice(
        `${response.detail} Nhóm mới đang tắt và trọng số 0%, hãy bật bằng màn hình trọng số.`
      );

      await loadPeriodDetail(String(periodDetail.id), String(selectedProfile.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được nhóm KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addMetric = async (
    payload: Omit<
      KpiMetricPayload,
      "period" | "profile" | "weight_percent" | "is_active"
    >
  ) => {
    if (!periodDetail || !selectedProfile) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createMetric({
        ...payload,
        period: periodDetail.id,
        profile: selectedProfile.id,
        weight_percent: "0.00",
        measurement_formula: getSafeMeasurementFormula(payload.measurement_formula),
        is_active: false,
      });

      setNotice(
        `${response.detail} KPI mới đang tắt và trọng số 0%, hãy bật bằng màn hình trọng số.`
      );

      await loadPeriodDetail(String(periodDetail.id), String(selectedProfile.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addGate = async (payload: Omit<KpiGateConfigPayload, "period">) => {
    if (!periodDetail || !selectedProfile) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createGateConfig({
        ...payload,
        period: periodDetail.id,
        profile: selectedProfile.id,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(periodDetail.id), String(selectedProfile.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được gate KPI"));
    } finally {
      setSaving(false);
    }
  };

  const addReward = async (payload: Omit<KpiRewardTierPayload, "period">) => {
    if (!periodDetail || !selectedProfile) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.createRewardTier({
        ...payload,
        period: periodDetail.id,
        profile: selectedProfile.id,
      });

      setNotice(response.detail);
      await loadPeriodDetail(String(periodDetail.id), String(selectedProfile.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được bậc thưởng KPI"));
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (item: KpiSectionItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.deleteSection(item.id);

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), String(item.profile));
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được phần KPI"));
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (item: KpiGroupItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.deleteGroup(item.id);

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), String(item.profile));
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được nhóm KPI"));
    } finally {
      setSaving(false);
    }
  };

  const deleteMetric = async (item: KpiPeriodMetricItem) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.deleteMetric(item.id);

      setNotice(response.detail);
      await loadPeriodDetail(String(item.period), String(item.profile));
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được KPI"));
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
      await loadPeriodDetail(String(item.period), item.profile ? String(item.profile) : undefined);
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
      await loadPeriodDetail(String(item.period), item.profile ? String(item.profile) : undefined);
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

  const updatePeriod = async (
    periodId: number | string,
    payload: {
      period_name?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    }
  ) => {
    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.updatePeriod(periodId, payload as KpiPeriodPayload);

      setNotice(response.detail);
      await loadPeriods();
      await loadPeriodDetail(String(periodId), selectedProfileId);
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được kỳ KPI"));
    } finally {
      setSaving(false);
    }
  };

  const deletePeriod = async (periodId: number | string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa kỳ KPI này?")) return;

    try {
      setSaving(true);
      clearMessages();

      const response = await kpiService.deletePeriod(periodId);

      setNotice(response.detail);
      setSelectedPeriodId("");
      setPeriodDetail(null);
      setProfileRows([]);
      setSelectedProfileId("");
      setSectionRowsAll([]);
      setGroupRowsAll([]);
      setMetricRowsAll([]);
      setGateRowsAll([]);
      setRewardRowsAll([]);

      await loadPeriods();
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được kỳ KPI"));
    } finally {
      setSaving(false);
    }
  };

  const deleteSectionDraft = (sectionId: number) => {
    markSectionInactive(sectionId);
  };

  const deleteGroupDraft = (groupId: number) => {
    markGroupInactive(groupId);
  };

  const deleteMetricDraft = (metricId: number) => {
    markMetricInactive(metricId);
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

    profileRows,
    selectedProfileId,
    selectedProfile,
    setSelectedProfileId: changeSelectedProfileId,

    sectionRows,
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

    setSectionField,
    setGroupField,
    setMetricField,
    setGateField,
    setRewardField,

    markSectionInactive,
    markGroupInactive,
    markMetricInactive,

    icpGroups,
    loadingIcp,
    fetchIcpGroups,
    createIcpGroup,
    updateIcpGroup,
    deleteIcpGroup,

    saveWeights,
    saveProfile,
    saveSection,
    saveGroup,
    saveMetric,
    saveGate,
    saveReward,

    addProfile,
    addSection,
    addGroup,
    addMetric,
    addGate,
    addReward,

    deleteSection,
    deleteGroup,
    deleteMetric,
    deleteGate,
    deleteReward,

    createMonthlyPeriod,
    updatePeriod,
    deletePeriod,

    deleteSectionDraft,
    deleteGroupDraft,
    deleteMetricDraft,

    reloadAll,
    reloadPeriodDetail: () => {
      if (selectedPeriodId) {
        void loadPeriodDetail(selectedPeriodId, selectedProfileId);
      }
    },
  };
}

export type KpiConfigController = ReturnType<typeof useKpiConfig>;
