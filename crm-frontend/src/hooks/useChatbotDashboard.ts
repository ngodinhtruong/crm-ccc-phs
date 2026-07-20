"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { chatbotDashboardService } from "@/services/chatbot-dashboard.service";
import {
  ActiveTab,
  ChatbotDashboardFilters,
  ChatbotFaqItem,
  ChatbotOverviewResponse,
  ChatbotTicketItem,
  OutcomeCode,
  TicketListParams,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";
import { formatDateInput, getStartOfWeek } from "@/utils/date.util";
import { normalizeFilters } from "@/utils/chatbot-filter.util";

export type QuickPreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

const PAGE_SIZE = 50;
const DEFAULT_PANEL_TITLE = "Tất cả phiên chatbot";

/** Khoảng ngày của preset. Dùng start_date/end_date để tránh đá nhau với year/month. */
function getPresetFilters(preset: QuickPreset): ChatbotDashboardFilters {
  const now = new Date();

  const start =
    preset === "TODAY"
      ? now
      : preset === "THIS_WEEK"
      ? getStartOfWeek(now)
      : new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    start_date: formatDateInput(start),
    end_date: formatDateInput(now),
  };
}

const EMPTY_FILTERS: ChatbotDashboardFilters = {
  year: "",
  month: "",
  start_date: "",
  end_date: "",
  start_hour: "",
  end_hour: "",
};

export function useChatbotDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Mặc định xem tháng hiện tại
  const [filters, setFilters] = useState<ChatbotDashboardFilters>({
    ...EMPTY_FILTERS,
    ...getPresetFilters("THIS_MONTH"),
  });

  const [overview, setOverview] = useState<ChatbotOverviewResponse | null>(null);

  const [tickets, setTickets] = useState<ChatbotTicketItem[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [ticketStatus, setTicketStatus] = useState<OutcomeCode>("ALL");
  const [ticketKeyword, setTicketKeyword] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPanelTitle, setTicketPanelTitle] = useState(DEFAULT_PANEL_TITLE);

  const [selectedSession, setSelectedSession] =
    useState<ChatbotTicketItem | null>(null);

  const [faqs, setFaqs] = useState<ChatbotFaqItem[]>([]);
  const [faqCount, setFaqCount] = useState(0);
  const [faqKeyword, setFaqKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedFilters = useMemo(
    () => normalizeFilters(filters),
    [filters]
  );

  const updateFilter = (key: keyof ChatbotDashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const loadOverview = async (activeFilters: ChatbotDashboardFilters) => {
    setOverview(await chatbotDashboardService.getOverview(activeFilters));
  };

  const loadTickets = async (
    activeFilters: ChatbotDashboardFilters,
    overrides: Partial<TicketListParams> = {}
  ) => {
    const data = await chatbotDashboardService.getTickets({
      ...activeFilters,
      status: overrides.status ?? ticketStatus,
      q: overrides.q ?? ticketKeyword,
      dashboard_category: overrides.dashboard_category ?? ticketCategory,
      page_size: PAGE_SIZE,
    });

    setTickets(data.results || []);
    setTicketCount(data.count || 0);
  };

  const loadFaqs = async (activeFilters: ChatbotDashboardFilters) => {
    const data = await chatbotDashboardService.getFaqs({
      ...activeFilters,
      q: faqKeyword,
      page_size: PAGE_SIZE,
    });

    setFaqs(data.results || []);
    setFaqCount(data.count || 0);
  };

  const loadData = async (
    overrideFilters?: ChatbotDashboardFilters,
    tabOverride?: ActiveTab
  ) => {
    const tab = tabOverride || activeTab;

    const activeFilters = overrideFilters
      ? normalizeFilters(overrideFilters)
      : normalizedFilters;

    try {
      setLoading(true);
      setError("");

      // Overview luôn nạp: panel "Vấn đề cần CCC xử lý" nằm trên đầu và
      // hiển thị ở cả 3 tab, nên cần dữ liệu này kể cả khi đang xem tab khác.
      if (tab === "overview") {
        await loadOverview(activeFilters);
      } else if (tab === "tickets") {
        await Promise.all([
          loadOverview(activeFilters),
          loadTickets(activeFilters),
        ]);
      } else if (tab === "faqs") {
        await Promise.all([
          loadOverview(activeFilters),
          loadFaqs(activeFilters),
        ]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu dashboard chatbot"));
    } finally {
      setLoading(false);
    }
  };

  const changeTab = (nextTab: ActiveTab) => {
    setActiveTab(nextTab);
    void loadData(undefined, nextTab);
  };

  const applyQuickPreset = (preset: QuickPreset) => {
    const nextFilters = { ...EMPTY_FILTERS, ...getPresetFilters(preset) };

    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    void loadData(EMPTY_FILTERS);
  };

  /** Bấm vào một ô KPI / một cột biểu đồ -> mở danh sách phiên tương ứng. */
  const openTicketsFromOverview = async (options: TicketOpenOptions) => {
    const status = options.status || "ALL";
    const category = options.dashboard_category || "";

    setTicketStatus(status);
    setTicketKeyword("");
    setTicketCategory(category);
    setTicketPanelTitle(options.title);
    setActiveTab("tickets");

    try {
      setLoading(true);
      setError("");

      await loadTickets(normalizedFilters, {
        status,
        q: "",
        dashboard_category: category,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách phiên chat"));
    } finally {
      setLoading(false);
    }
  };

  const clearTicketFilters = async () => {
    setTicketStatus("ALL");
    setTicketKeyword("");
    setTicketCategory("");
    setTicketPanelTitle(DEFAULT_PANEL_TITLE);

    try {
      setLoading(true);
      setError("");

      await loadTickets(normalizedFilters, {
        status: "ALL",
        q: "",
        dashboard_category: "",
      });
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách phiên chat"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadData(undefined, "overview");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const refreshData = () => {
    void loadData();
  };

  const refreshDataRef = useRef(refreshData);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshDataRef.current();
    }, 120000); // 120 seconds

    return () => clearInterval(interval);
  }, []);


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

    refresh: () => void loadData(),
    searchTickets: () => void loadData(undefined, "tickets"),
    searchFaqs: () => void loadData(undefined, "faqs"),
  };
}
