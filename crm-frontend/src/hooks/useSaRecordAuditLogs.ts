"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useState } from "react";

import { saleAdminService } from "@/services/sale-admin.service";
import { SaRecordAuditLogItem } from "@/types/sale-admin.type";

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