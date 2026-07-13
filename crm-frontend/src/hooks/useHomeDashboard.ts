"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import {
  HomeDashboard,
  HomeTabKey,
} from "@/types/dashboard.type";

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