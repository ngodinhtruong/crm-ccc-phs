"use client";

import { useEffect, useState } from "react";

import { saleAdminService } from "@/services/sale-admin.service";
import { SaRecordItem } from "@/types/sale-admin.type";

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as {
    response?: {
      status?: number;
      data?: unknown;
    };
    message?: string;
  };

  const status = error?.response?.status || "unknown";
  const detail = error?.response?.data
    ? JSON.stringify(error.response.data)
    : error?.message;

  return `${fallback}. Status: ${status} - ${detail}`;
}

export function useSaRecordDetail(recordId: string) {
  const [item, setItem] = useState<SaRecordItem | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "audit">("info");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDetail = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      setError("");

      const data = await saleAdminService.getSaRecord(recordId);
      setItem(data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được chi tiết SA Record"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  return {
    item,
    activeTab,
    setActiveTab,

    loading,
    error,

    reload: loadDetail,
  };
}