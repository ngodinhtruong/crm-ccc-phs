"use client";

import { useEffect, useState } from "react";

import { saleAdminService } from "@/services/sale-admin.service";
import { SaRecordAuditLogItem } from "@/types/sale-admin.type";

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

export function useSaRecordAuditLogs(recordId: string) {
  const [items, setItems] = useState<SaRecordAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAuditLogs = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      setError("");

      const data = await saleAdminService.getSaRecordAuditLogs(recordId);
      setItems(data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được lịch sử chỉnh sửa"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAuditLogs();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  return {
    items,
    loading,
    error,
    reload: loadAuditLogs,
  };
}