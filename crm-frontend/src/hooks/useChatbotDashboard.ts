"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { chatbotDashboardService } from "@/services/chatbot-dashboard.service";
import {
  ActiveTab,
  ChatbotDashboardFilters,
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  ChatbotTicketItem,
  TicketListParams,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";
import {
  formatDateInput,
  getStartOfWeek,
} from "@/utils/date.util";
import { normalizeFilters } from "@/utils/chatbot-filter.util";

type QuickPreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

const currentYear = new Date().getFullYear();

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as {
    response?: {
      status?: number;
      data?: unknown;
    };
    message?: string;
  };

  const status = error?.response?.status;
  const detail = error?.response?.data
    ? JSON.stringify(error.response.data)
    : error?.message;

  return `${fallback}. Status: ${status} - ${detail}`;
}

export function useChatbotDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  const [filters, setFilters] = useState<ChatbotDashboardFilters>({
    year: String(currentYear),
    month: "",
    start_date: "",
    end_date: "",
    start_hour: "",
    end_hour: "",
  });

  const [overview, setOverview] = useState<ChatbotOverviewResponse | null>(null);

  const [tickets, setTickets] = useState<ChatbotTicketItem[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [ticketStatus, setTicketStatus] = useState("ALL");
  const [ticketKeyword, setTicketKeyword] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPanelTitle, setTicketPanelTitle] = useState(
    "Tất cả phiên chatbot"
  );

  const [selectedSession, setSelectedSession] =
    useState<ChatbotTicketItem | null>(null);

  const [faqs, setFaqs] = useState<ChatbotFaqItem[]>([]);
  const [faqCount, setFaqCount] = useState(0);
  const [faqKeyword, setFaqKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedFilters = useMemo(() => {
    return normalizeFilters(filters);
  }, [filters]);

  const updateFilter = (key: keyof ChatbotDashboardFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadOverview = async (activeFilters = normalizedFilters) => {
    const data = await chatbotDashboardService.getOverview(activeFilters);
    setOverview(data);
  };

  const loadTickets = async (
    activeFilters = normalizedFilters,
    overrideParams: Partial<TicketListParams> = {}
  ) => {
    const data = await chatbotDashboardService.getTickets({
      ...activeFilters,
      status: overrideParams.status ?? ticketStatus,
      q: overrideParams.q ?? ticketKeyword,
      dashboard_category:
        overrideParams.dashboard_category ?? ticketCategory,
      page_size: overrideParams.page_size ?? 50,
    });

    setTickets(data.results || []);
    setTicketCount(data.count || 0);
  };

  const loadFaqs = async (activeFilters = normalizedFilters) => {
    const data = await chatbotDashboardService.getFaqs({
      ...activeFilters,
      q: faqKeyword,
      page_size: 50,
    });

    setFaqs(data.results || []);
    setFaqCount(data.count || 0);
  };

  const loadData = async (
    overrideFilters?: ChatbotDashboardFilters,
    tabOverride?: ActiveTab
  ) => {
    try {
      setLoading(true);
      setError("");

      const tab = tabOverride || activeTab;

      const activeFilters = overrideFilters
        ? normalizeFilters(overrideFilters)
        : normalizedFilters;

      if (tab === "overview") {
        await loadOverview(activeFilters);
      }

      if (tab === "tickets") {
        await loadTickets(activeFilters);
      }

      if (tab === "faqs") {
        await loadFaqs(activeFilters);
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Không tải được dữ liệu dashboard chatbot"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const changeTab = (nextTab: ActiveTab) => {
    setActiveTab(nextTab);
    void loadData(undefined, nextTab);
  };

  const applyQuickPreset = (preset: QuickPreset) => {
    const now = new Date();

    let nextFilters: ChatbotDashboardFilters = {
      year: String(now.getFullYear()),
      month: "",
      start_date: "",
      end_date: formatDateInput(now),
      start_hour: "",
      end_hour: "",
    };

    if (preset === "TODAY") {
      nextFilters = {
        ...nextFilters,
        month: String(now.getMonth() + 1),
        start_date: formatDateInput(now),
        end_date: formatDateInput(now),
      };
    }

    if (preset === "THIS_WEEK") {
      const start = getStartOfWeek(now);

      nextFilters = {
        ...nextFilters,
        month: String(now.getMonth() + 1),
        start_date: formatDateInput(start),
        end_date: formatDateInput(now),
      };
    }

    if (preset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);

      nextFilters = {
        ...nextFilters,
        month: String(now.getMonth() + 1),
        start_date: formatDateInput(start),
        end_date: formatDateInput(now),
      };
    }

    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  const clearFilters = () => {
    const nextFilters: ChatbotDashboardFilters = {
      year: "",
      month: "",
      start_date: "",
      end_date: "",
      start_hour: "",
      end_hour: "",
    };

    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  const openTicketsFromOverview = async (options: TicketOpenOptions) => {
    try {
      setLoading(true);
      setError("");

      const status = options.status || "ALL";
      const category = options.dashboard_category || "";

      setTicketStatus(status);
      setTicketKeyword("");
      setTicketCategory(category);
      setTicketPanelTitle(options.title);
      setActiveTab("tickets");

      await loadTickets(normalizedFilters, {
        status,
        q: "",
        dashboard_category: category,
        page_size: 50,
      });
    } catch (err) {
      setError(
        getErrorMessage(err, "Không tải được danh sách phiên chat")
      );
    } finally {
      setLoading(false);
    }
  };

  const clearTicketFilters = async () => {
    try {
      setLoading(true);
      setError("");

      setTicketCategory("");
      setTicketPanelTitle("Tất cả phiên chatbot");
      setTicketStatus("ALL");
      setTicketKeyword("");

      await loadTickets(normalizedFilters, {
        status: "ALL",
        q: "",
        dashboard_category: "",
        page_size: 50,
      });
    } catch (err) {
      setError(
        getErrorMessage(err, "Không tải được danh sách phiên chat")
      );
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    void loadData();
  };

  const searchTickets = () => {
    void loadData(undefined, "tickets");
  };

  const searchFaqs = () => {
    void loadData(undefined, "faqs");
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadData(undefined, "overview");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    activeTab,
    changeTab,

    filters,
    updateFilter,
    applyQuickPreset,
    clearFilters,

    overview,

    tickets,
    ticketCount,
    ticketStatus,
    ticketKeyword,
    ticketCategory,
    ticketPanelTitle,
    setTicketStatus,
    setTicketKeyword,
    clearTicketFilters,
    openTicketsFromOverview,

    selectedSession,
    setSelectedSession,

    faqs,
    faqCount,
    faqKeyword,
    setFaqKeyword,

    loading,
    error,

    refresh,
    searchTickets,
    searchFaqs,
  };
}