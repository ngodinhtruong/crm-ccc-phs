"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import { GeneralDashboard } from "@/types/dashboard.type";
import { getErrorMessage } from "@/utils/error.util";

function getCurrentPeriod() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function padMonth(month: number) {
  return String(month).padStart(2, "0");
}

function getMonthRange(year: number, month: number) {
  const dateFrom = `${year}-${padMonth(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${year}-${padMonth(month)}-${String(lastDay).padStart(2, "0")}`;

  return {
    dateFrom,
    dateTo,
  };
}

const DEFAULT_GENERAL_DASHBOARD: GeneralDashboard = {
  filters: {
    branch: "all",
    date_from: "",
    date_to: "",
    branch_options: [
      {
        id: "all",
        name: "Tất cả Chi nhánh",
      },
    ],
  },
  overview: {
    total_customers: 0,
    active_customers: 0,
    total_tickets: 0,
    unlinked_tickets: 0,
    total_transactions: 0,
    matched_value: 0,
  },
  portfolio_health: {
    icp_score: 0,
    grouped_customers: 0,
    total_customers_health: 0,
    avg_ltv: 0,
    avg_ltv_fees: 0,
    active_customers_ltv: 0,
    aar: 0,
    reactivated_with_trades: 0,
    total_reactivated_records: 0,
    churn: 0,
    churn_count: 0,
    referral: 0,
    referral_count: 0,
  },
  charts: {
    vip_tier_distribution: [],
    branch_distribution: [],
    customer_type_distribution: [],
    ticket_status_distribution: [],
    ticket_category_distribution: [],
    ticket_source_distribution: [],
    ticket_priority_distribution: [],
    ticket_classification_distribution: [],
    customer_group_distribution: [],
    call_result_distribution: [],
    interest_level_distribution: [],
    pic_distribution: [],
    campaign_distribution: [],
    product_type_distribution: [],
    channel_distribution: [],
    order_status_distribution: [],
    buy_sell_distribution: [],
    top_tickers_distribution: [],
  },
};

function normalizeGeneralDashboard(data: GeneralDashboard): GeneralDashboard {
  const filters = {
    ...DEFAULT_GENERAL_DASHBOARD.filters,
    ...(data?.filters || {}),
  };

  return {
    filters: {
      ...filters,
      branch_options: filters.branch_options?.length
        ? filters.branch_options
        : DEFAULT_GENERAL_DASHBOARD.filters.branch_options,
    },
    overview: {
      ...DEFAULT_GENERAL_DASHBOARD.overview,
      ...(data?.overview || {}),
    },
    portfolio_health: {
      ...DEFAULT_GENERAL_DASHBOARD.portfolio_health,
      ...(data?.portfolio_health || {}),
    },
    charts: {
      ...DEFAULT_GENERAL_DASHBOARD.charts,
      ...(data?.charts || {}),
    },
  };
}

export function useGeneralDashboard() {
  const router = useRouter();

  const [selectedBranch, setSelectedBranch] = useState("all");
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod);
  const [dashboard, setDashboard] = useState<GeneralDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const monthRange = useMemo(
    () => getMonthRange(currentPeriod.year, currentPeriod.month),
    [currentPeriod.month, currentPeriod.year]
  );

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await dashboardService.getGeneral({
        branch: selectedBranch,
        date_from: monthRange.dateFrom,
        date_to: monthRange.dateTo,
      });

      setDashboard(normalizeGeneralDashboard(data));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được Dashboard tổng hợp từ DB."));
    } finally {
      setLoading(false);
    }
  }, [monthRange.dateFrom, monthRange.dateTo, selectedBranch]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadDashboard();
  }, [loadDashboard, router]);

  const handlePrevMonth = () => {
    setCurrentPeriod((prev) => {
      if (prev.month === 1) {
        return {
          year: prev.year - 1,
          month: 12,
        };
      }

      return {
        ...prev,
        month: prev.month - 1,
      };
    });
  };

  const handleNextMonth = () => {
    setCurrentPeriod((prev) => {
      if (prev.month === 12) {
        return {
          year: prev.year + 1,
          month: 1,
        };
      }

      return {
        ...prev,
        month: prev.month + 1,
      };
    });
  };

  return {
    selectedBranch,
    setSelectedBranch,

    currentPeriod,
    handlePrevMonth,
    handleNextMonth,

    periodLabel: `Tháng ${currentPeriod.month}/${currentPeriod.year}`,

    dashboard,

    loading,
    error,

    reload: loadDashboard,
  };
}
