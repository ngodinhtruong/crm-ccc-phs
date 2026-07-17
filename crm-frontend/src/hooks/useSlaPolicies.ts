"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { slaService } from "@/services/sla.service";
import {
  SlaListParams,
  SlaPolicyItem,
  SlaStatusTab,
} from "@/types/sla.type";

export function useSlaPolicies() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SlaStatusTab>("active");

  const [items, setItems] = useState<SlaPolicyItem[]>([]);
  const [count, setCount] = useState(0);

  const [q, setQ] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [processingUnit, setProcessingUnit] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const buildParams = (tab: SlaStatusTab = activeTab): SlaListParams => ({
    status: tab === "active" ? "ACTIVE" : "INACTIVE",
    q,
    ticket_category: ticketCategory,
    processing_unit: processingUnit,
  });

  const loadSlaPolicies = async (
    params: SlaListParams = buildParams()
  ) => {
    try {
      setLoading(true);
      setError("");

      const data = await slaService.getSlaPolicies(params);

      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách SLA"));
    } finally {
      setLoading(false);
    }
  };

  const changeTab = (tab: SlaStatusTab) => {
    setActiveTab(tab);

    void loadSlaPolicies({
      status: tab === "active" ? "ACTIVE" : "INACTIVE",
      q,
      ticket_category: ticketCategory,
      processing_unit: processingUnit,
    });
  };

  const search = () => {
    void loadSlaPolicies();
  };

  const clearFilter = () => {
    setQ("");
    setTicketCategory("");
    setProcessingUnit("");

    void loadSlaPolicies({
      status: activeTab === "active" ? "ACTIVE" : "INACTIVE",
      q: "",
      ticket_category: "",
      processing_unit: "",
    });
  };

  const goCreate = () => {
    router.push("/sla/create");
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadSlaPolicies({
      status: "ACTIVE",
      q: "",
      ticket_category: "",
      processing_unit: "",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    activeTab,
    changeTab,

    items,
    count,
    fromRecord,
    toRecord,

    q,
    setQ,
    ticketCategory,
    setTicketCategory,
    processingUnit,
    setProcessingUnit,

    loading,
    error,

    search,
    clearFilter,
    goCreate,
    reload: loadSlaPolicies,
  };
}