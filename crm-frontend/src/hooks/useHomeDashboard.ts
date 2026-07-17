"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import {
  HomeDashboard,
  HomeTabKey,
} from "@/types/dashboard.type";

export function useHomeDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<HomeTabKey>("Ticket");
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await dashboardService.getHome();

      setDashboard(data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu trang chủ từ DB"));
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    void loadDashboard();
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    activeTab,
    setActiveTab,

    dashboard,

    loading,
    error,

    refresh,
  };
}