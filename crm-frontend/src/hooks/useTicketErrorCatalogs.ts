"use client";
import { getErrorMessage } from "@/utils/error.util";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { ticketService } from "@/services/ticket.service";
import { TicketErrorGroupOption, TicketErrorTypeOption } from "@/types/ticket.type";

type ActiveTab = "groups" | "types";

type GroupFormState = {
  id?: number;
  groupCode: string;
  groupName: string;
  description: string;
  isActive: boolean;
};

type TypeFormState = {
  id?: number;
  group: string;
  typeCode: string;
  typeName: string;
  description: string;
  isActive: boolean;
};

const initialGroupForm: GroupFormState = {
  groupCode: "",
  groupName: "",
  description: "",
  isActive: true,
};

const initialTypeForm: TypeFormState = {
  group: "",
  typeCode: "",
  typeName: "",
  description: "",
  isActive: true,
};

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function useTicketErrorCatalogs() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("groups");
  const [groups, setGroups] = useState<TicketErrorGroupOption[]>([]);
  const [types, setTypes] = useState<TicketErrorTypeOption[]>([]);

  const [keyword, setKeyword] = useState("");
  const [groupFilter, setGroupFilter] = useState("");

  const [groupForm, setGroupForm] = useState<GroupFormState>(initialGroupForm);
  const [typeForm, setTypeForm] = useState<TypeFormState>(initialTypeForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredGroups = useMemo(() => {
    const search = normalize(keyword);
    if (!search) return groups;

    return groups.filter((item) =>
      [item.group_code, item.group_name, item.description]
        .map(normalize)
        .some((text) => text.includes(search))
    );
  }, [groups, keyword]);

  const filteredTypes = useMemo(() => {
    const search = normalize(keyword);

    return types.filter((item) => {
      if (groupFilter && String(item.group) !== groupFilter) return false;
      if (!search) return true;

      return [item.type_code, item.type_name, item.description, item.group_name]
        .map(normalize)
        .some((text) => text.includes(search));
    });
  }, [types, groupFilter, keyword]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [groupData, typeData] = await Promise.all([
        ticketService.getErrorGroups(),
        ticketService.getErrorTypes(),
      ]);

      setGroups(groupData || []);
      setTypes(typeData || []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh mục lỗi"));
    } finally {
      setLoading(false);
    }
  };

  const clearMessage = () => {
    setError("");
    setSuccess("");
  };

  const resetGroupForm = () => setGroupForm(initialGroupForm);
  const resetTypeForm = () => setTypeForm(initialTypeForm);

  const editGroup = (item: TicketErrorGroupOption) => {
    clearMessage();
    setActiveTab("groups");
    setGroupForm({
      id: item.id,
      groupCode: item.group_code || "",
      groupName: item.group_name || "",
      description: item.description || "",
      isActive: Boolean(item.is_active),
    });
  };

  const editType = (item: TicketErrorTypeOption) => {
    clearMessage();
    setActiveTab("types");
    setTypeForm({
      id: item.id,
      group: String(item.group || ""),
      typeCode: item.type_code || "",
      typeName: item.type_name || "",
      description: item.description || "",
      isActive: Boolean(item.is_active),
    });
  };

  const saveGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      clearMessage();

      if (!groupForm.groupCode.trim()) throw new Error("Mã nhóm lỗi không được để trống.");
      if (!groupForm.groupName.trim()) throw new Error("Tên nhóm lỗi không được để trống.");

      const payload = {
        group_code: groupForm.groupCode.trim(),
        group_name: groupForm.groupName.trim(),
        description: groupForm.description.trim(),
        is_active: groupForm.isActive,
      };

      if (groupForm.id) {
        await ticketService.updateErrorGroup(groupForm.id, payload);
        setSuccess("Đã cập nhật nhóm lỗi.");
      } else {
        await ticketService.createErrorGroup(payload);
        setSuccess("Đã tạo nhóm lỗi.");
      }

      resetGroupForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : getErrorMessage(err, "Lưu nhóm lỗi thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const saveType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      clearMessage();

      if (!typeForm.group) throw new Error("Nhóm lỗi không được để trống.");
      if (!typeForm.typeCode.trim()) throw new Error("Mã loại lỗi không được để trống.");
      if (!typeForm.typeName.trim()) throw new Error("Tên loại lỗi không được để trống.");

      const payload = {
        group: Number(typeForm.group),
        type_code: typeForm.typeCode.trim(),
        type_name: typeForm.typeName.trim(),
        description: typeForm.description.trim(),
        is_active: typeForm.isActive,
      };

      if (typeForm.id) {
        await ticketService.updateErrorType(typeForm.id, payload);
        setSuccess("Đã cập nhật loại lỗi.");
      } else {
        await ticketService.createErrorType(payload);
        setSuccess("Đã tạo loại lỗi.");
      }

      resetTypeForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : getErrorMessage(err, "Lưu loại lỗi thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const toggleGroupActive = async (item: TicketErrorGroupOption) => {
    try {
      clearMessage();
      await ticketService.updateErrorGroup(item.id, { is_active: !item.is_active });
      setSuccess(item.is_active ? "Đã tắt nhóm lỗi." : "Đã bật nhóm lỗi.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Cập nhật trạng thái nhóm lỗi thất bại"));
    }
  };

  const toggleTypeActive = async (item: TicketErrorTypeOption) => {
    try {
      clearMessage();
      await ticketService.updateErrorType(item.id, { is_active: !item.is_active });
      setSuccess(item.is_active ? "Đã tắt loại lỗi." : "Đã bật loại lỗi.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Cập nhật trạng thái loại lỗi thất bại"));
    }
  };

  const clearFilter = () => {
    setKeyword("");
    setGroupFilter("");
  };

  const goBack = () => router.push("/tickets");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    activeTab,
    setActiveTab,
    groups,
    types,
    keyword,
    setKeyword,
    groupFilter,
    setGroupFilter,
    groupForm,
    setGroupForm,
    typeForm,
    setTypeForm,
    loading,
    saving,
    error,
    success,
    filteredGroups,
    filteredTypes,
    loadData,
    clearFilter,
    saveGroup,
    saveType,
    resetGroupForm,
    resetTypeForm,
    editGroup,
    editType,
    toggleGroupActive,
    toggleTypeActive,
    goBack,
  };
}
