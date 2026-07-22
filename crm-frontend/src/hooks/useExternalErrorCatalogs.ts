"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { externalErrorService } from "@/services/external-error.service";
import {
  ExternalErrorCode,
  ExternalErrorCodePayload,
  ExternalErrorGroup,
  ExternalErrorGroupPayload,
} from "@/types/external-error.type";
import { getErrorMessage } from "@/utils/error.util";

type ActiveTab = "groups" | "codes";

type GroupFormState = {
  id?: number;
  groupCode: string;
  groupName: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

type CodeFormState = {
  id?: number;
  group: string;
  errorCode: string;
  errorName: string;
  description: string;
  keywords: string;
  examples: string;
  sortOrder: string;
  isActive: boolean;
};

const initialGroupForm: GroupFormState = {
  groupCode: "",
  groupName: "",
  description: "",
  sortOrder: "0",
  isActive: true,
};

const initialCodeForm: CodeFormState = {
  group: "",
  errorCode: "",
  errorName: "",
  description: "",
  keywords: "",
  examples: "",
  sortOrder: "0",
  isActive: true,
};

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("vi");
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function useExternalErrorCatalogs() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("groups");
  const [groups, setGroups] = useState<ExternalErrorGroup[]>([]);
  const [codes, setCodes] = useState<ExternalErrorCode[]>([]);

  const [keyword, setKeyword] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [groupForm, setGroupForm] =
    useState<GroupFormState>(initialGroupForm);
  const [codeForm, setCodeForm] =
    useState<CodeFormState>(initialCodeForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredGroups = useMemo(() => {
    const search = normalize(keyword);

    return groups.filter((item) => {
      if (
        activeFilter &&
        String(item.is_active) !== activeFilter
      ) {
        return false;
      }

      if (!search) return true;

      return [
        item.group_code,
        item.group_name,
        item.description,
      ]
        .map(normalize)
        .some((value) => value.includes(search));
    });
  }, [activeFilter, groups, keyword]);

  const filteredCodes = useMemo(() => {
    const search = normalize(keyword);

    return codes.filter((item) => {
      if (groupFilter && String(item.group) !== groupFilter) {
        return false;
      }

      if (
        activeFilter &&
        String(item.is_active) !== activeFilter
      ) {
        return false;
      }

      if (!search) return true;

      return [
        item.error_code,
        item.error_name,
        item.group_code,
        item.group_name,
        item.description,
        ...(item.keywords || []),
        ...(item.examples || []),
      ]
        .map(normalize)
        .some((value) => value.includes(search));
    });
  }, [activeFilter, codes, groupFilter, keyword]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [groupData, codeData] = await Promise.all([
        externalErrorService.getGroups(),
        externalErrorService.getErrorCodes(),
      ]);

      setGroups(groupData);
      setCodes(codeData);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được nhóm lỗi và mã lỗi"));
    } finally {
      setLoading(false);
    }
  };

  const clearMessage = () => {
    setError("");
    setSuccess("");
  };

  const clearFilter = () => {
    setKeyword("");
    setGroupFilter("");
    setActiveFilter("");
  };

  const resetGroupForm = () => setGroupForm(initialGroupForm);
  const resetCodeForm = () => setCodeForm(initialCodeForm);

  const editGroup = (item: ExternalErrorGroup) => {
    clearMessage();
    setActiveTab("groups");
    setGroupForm({
      id: item.id,
      groupCode: item.group_code,
      groupName: item.group_name,
      description: item.description || "",
      sortOrder: String(item.sort_order ?? 0),
      isActive: item.is_active,
    });
  };

  const editCode = (item: ExternalErrorCode) => {
    clearMessage();
    setActiveTab("codes");
    setCodeForm({
      id: item.id,
      group: String(item.group),
      errorCode: item.error_code,
      errorName: item.error_name,
      description: item.description || "",
      keywords: (item.keywords || []).join("\n"),
      examples: (item.examples || []).join("\n"),
      sortOrder: String(item.sort_order ?? 0),
      isActive: item.is_active,
    });
  };

  const saveGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!groupForm.groupCode.trim()) {
      setError("Mã nhóm lỗi không được để trống.");
      return;
    }

    if (!groupForm.groupName.trim()) {
      setError("Tên nhóm lỗi không được để trống.");
      return;
    }

    const payload: ExternalErrorGroupPayload = {
      group_code: groupForm.groupCode.trim().toUpperCase(),
      group_name: groupForm.groupName.trim(),
      description: groupForm.description.trim(),
      sort_order: Number(groupForm.sortOrder || 0),
      is_active: groupForm.isActive,
    };

    try {
      setSaving(true);
      clearMessage();

      if (groupForm.id) {
        await externalErrorService.updateGroup(
          groupForm.id,
          payload
        );
        setSuccess("Đã cập nhật nhóm lỗi.");
      } else {
        await externalErrorService.createGroup(payload);
        setSuccess("Đã thêm nhóm lỗi.");
      }

      resetGroupForm();
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Lưu nhóm lỗi thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const saveCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!codeForm.group) {
      setError("Nhóm lỗi không được để trống.");
      return;
    }

    if (!codeForm.errorCode.trim()) {
      setError("Mã lỗi không được để trống.");
      return;
    }

    if (!codeForm.errorName.trim()) {
      setError("Tên lỗi không được để trống.");
      return;
    }

    const payload: ExternalErrorCodePayload = {
      group: Number(codeForm.group),
      error_code: codeForm.errorCode.trim().toUpperCase(),
      error_name: codeForm.errorName.trim(),
      description: codeForm.description.trim(),
      keywords: splitLines(codeForm.keywords),
      examples: splitLines(codeForm.examples),
      sort_order: Number(codeForm.sortOrder || 0),
      is_active: codeForm.isActive,
    };

    try {
      setSaving(true);
      clearMessage();

      if (codeForm.id) {
        await externalErrorService.updateErrorCode(
          codeForm.id,
          payload
        );
        setSuccess("Đã cập nhật mã lỗi.");
      } else {
        await externalErrorService.createErrorCode(payload);
        setSuccess("Đã thêm mã lỗi.");
      }

      resetCodeForm();
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Lưu mã lỗi thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const toggleGroupActive = async (
    item: ExternalErrorGroup
  ) => {
    try {
      setActionLoading(true);
      clearMessage();
      await externalErrorService.updateGroup(item.id, {
        is_active: !item.is_active,
      });
      setSuccess(
        item.is_active
          ? "Đã tắt nhóm lỗi."
          : "Đã bật nhóm lỗi."
      );
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Cập nhật trạng thái nhóm lỗi thất bại"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCodeActive = async (
    item: ExternalErrorCode
  ) => {
    try {
      setActionLoading(true);
      clearMessage();
      await externalErrorService.updateErrorCode(item.id, {
        is_active: !item.is_active,
      });
      setSuccess(
        item.is_active
          ? "Đã tắt mã lỗi."
          : "Đã bật mã lỗi."
      );
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Cập nhật trạng thái mã lỗi thất bại"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return {
    activeTab,
    setActiveTab,
    groups,
    codes,
    filteredGroups,
    filteredCodes,
    keyword,
    setKeyword,
    groupFilter,
    setGroupFilter,
    activeFilter,
    setActiveFilter,
    groupForm,
    setGroupForm,
    codeForm,
    setCodeForm,
    loading,
    saving,
    actionLoading,
    error,
    success,
    loadData,
    clearFilter,
    resetGroupForm,
    resetCodeForm,
    editGroup,
    editCode,
    saveGroup,
    saveCode,
    toggleGroupActive,
    toggleCodeActive,
  };
}
