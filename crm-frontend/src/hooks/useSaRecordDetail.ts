"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useState } from "react";

import { saleAdminService } from "@/services/sale-admin.service";
import { SaRecordItem } from "@/types/sale-admin.type";

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