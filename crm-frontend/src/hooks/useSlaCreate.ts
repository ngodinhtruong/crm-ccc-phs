"use client";
import { getErrorMessage } from "@/utils/error.util";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { masterDataService } from "@/services/master-data.service";
import { slaService } from "@/services/sla.service";
import { useUserAssignees } from "@/hooks/useUserAssignees";
import {
  SlaCreateFormState,
  SlaSelectOption,
  SlaTimeUnit,
} from "@/types/sla.type";

const initialForm: SlaCreateFormState = {
  policyName: "",
  ticketCategory: "",
  targetTimeValue: "",
  targetTimeUnit: "MINUTE",
  processingUnit: "",
  assignedTo: "",
  assignedToLabel: "",
  description: "",
};

function convertToMinutes(value: string, unit: SlaTimeUnit) {
  const numberValue = Number(value);

  if (unit === "HOUR") {
    return numberValue * 60;
  }

  if (unit === "DAY") {
    return numberValue * 24 * 60;
  }

  return numberValue;
}

export function useSlaCreate() {
  const router = useRouter();

  const assignees = useUserAssignees();

  const [form, setForm] = useState<SlaCreateFormState>(initialForm);

  const [ticketCategories, setTicketCategories] = useState<SlaSelectOption[]>([]);
  const [processingUnits, setProcessingUnits] = useState<SlaSelectOption[]>([]);

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = <K extends keyof SlaCreateFormState>(
    key: K,
    value: SlaCreateFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadInitialData = async () => {
    try {
      setLoadingDropdowns(true);
      setError("");

      const [categoryData, processingUnitData] = await Promise.all([
        masterDataService.getTicketCategories(),
        masterDataService.getProcessingUnits(),
      ]);

      setTicketCategories(categoryData || []);
      setProcessingUnits(processingUnitData || []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu SLA"));
    } finally {
      setLoadingDropdowns(false);
    }
  };

  useEffect(() => {
    const defaultAssignee = assignees.defaultAssignee;
    if (!defaultAssignee) return;

    setForm((prev) => {
      if (prev.assignedTo) return prev;

      return {
        ...prev,
        assignedTo: defaultAssignee.id,
        assignedToLabel: defaultAssignee.label,
      };
    });
  }, [assignees.defaultAssignee]);

  const validateForm = () => {
    if (!form.policyName.trim()) {
      return "Tên SLA không được để trống.";
    }

    if (!form.ticketCategory) {
      return "Danh mục Ticket không được để trống.";
    }

    if (!form.targetTimeValue.trim()) {
      return "Thời gian xử lý tiêu chuẩn không được để trống.";
    }

    if (Number(form.targetTimeValue) <= 0) {
      return "Thời gian xử lý tiêu chuẩn phải lớn hơn 0.";
    }

    if (!form.processingUnit) {
      return "Phân công xử lý không được để trống.";
    }

    if (!form.assignedTo) {
      return "Giao cho không được để trống.";
    }

    return "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const message = validateForm();

      if (message) {
        setError(message);
        return;
      }

      await slaService.createSlaPolicy({
        sla_name: form.policyName.trim(),
        support_category: Number(form.ticketCategory),
        processing_unit: Number(form.processingUnit),
        resolution_time_minutes: convertToMinutes(
          form.targetTimeValue,
          form.targetTimeUnit
        ),
        assigned_to_user: Number(form.assignedTo),
        description: form.description.trim() || undefined,
        status: "ACTIVE",
        is_active: true,
      });

      router.push("/sla");
    } catch (err) {
      setError(getErrorMessage(err, "Lưu SLA thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    router.push("/sla");
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadInitialData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    form,
    setField,

    ticketCategories,
    processingUnits,

    loadingDropdowns: loadingDropdowns || assignees.loading,
    saving,
    error,

    submit,
    cancel,

    users: assignees.users,
    assigneeLoading: assignees.loading,
    assigneeError: assignees.error,
  };
}

export type UseSlaCreateReturn = ReturnType<typeof useSlaCreate>;