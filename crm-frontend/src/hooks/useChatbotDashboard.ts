"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CHATBOT_TICKET_STATUS_OPTIONS } from "@/constants/chatbot-dashboard.constant";
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
import { normalizeFilters } from "@/utils/chatbot-filter.util";
import { formatDateInput, getStartOfWeek } from "@/utils/date.util";
import { getErrorMessage } from "@/utils/error.util";

export type QuickPreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

const PAGE_SIZE = 50;
const DEFAULT_PANEL_TITLE = "Tất cả phiên chatbot";
const DEFAULT_CCC_PANEL_TITLE = "Chuyển CCC xử lý";

/** Nhóm mặc định của tab Ticket: nhóm cần người xử lý. */
const DEFAULT_TICKET_STATUS: OutcomeCode = "CCC";

/** Chu kỳ tự làm mới dashboard: 2 phút. */
const AUTO_REFRESH_MS = 120_000;

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
  const [ticketStatus, setTicketStatus] =
    useState<OutcomeCode>(DEFAULT_TICKET_STATUS);
  const [ticketKeyword, setTicketKeyword] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPanelTitle, setTicketPanelTitle] =
    useState(DEFAULT_CCC_PANEL_TITLE);

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

  /**
   * Số thứ tự của request mới nhất.
   *
   * Bấm nhanh nhiều ô KPI (hoặc auto-refresh chen vào giữa) làm nhiều
   * request cùng bay; response về không đúng thứ tự gửi. Chỉ response của
   * request mới nhất mới được ghi vào state, nếu không bảng sẽ hiển thị
   * dữ liệu cũ trong khi tiêu đề đã là bộ lọc mới.
   */
  const requestIdRef = useRef(0);

  const nextRequestId = () => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  };

  const isLatest = (id: number) => id === requestIdRef.current;

  const loadOverview = async (
    activeFilters: ChatbotDashboardFilters,
    requestId: number
  ) => {
    const data = await chatbotDashboardService.getOverview(activeFilters);

    if (isLatest(requestId)) setOverview(data);
  };

  const loadTickets = async (
    activeFilters: ChatbotDashboardFilters,
    overrides: Partial<TicketListParams> = {},
    requestId = nextRequestId()
  ) => {
    const data = await chatbotDashboardService.getTickets({
      ...activeFilters,
      status: overrides.status ?? ticketStatus,
      q: overrides.q ?? ticketKeyword,
      dashboard_category: overrides.dashboard_category ?? ticketCategory,
      page_size: PAGE_SIZE,
    });

    if (!isLatest(requestId)) return;

    setTickets(data.results || []);
    setTicketCount(data.count || 0);
  };

  const loadFaqs = async (
    activeFilters: ChatbotDashboardFilters,
    requestId: number
  ) => {
    const data = await chatbotDashboardService.getFaqs({
      ...activeFilters,
      q: faqKeyword,
      page_size: PAGE_SIZE,
    });

    if (!isLatest(requestId)) return;

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

    const requestId = nextRequestId();

    try {
      setLoading(true);
      setError("");

      // KPI và hàng chờ chỉ nằm ở tab Tổng quan nên các tab khác không
      // cần gọi overview — tránh một request thừa mỗi lần đổi tab.
      if (tab === "overview") {
        await loadOverview(activeFilters, requestId);
      } else if (tab === "tickets") {
        await loadTickets(activeFilters, {}, requestId);
      } else if (tab === "faqs") {
        await loadFaqs(activeFilters, requestId);
      }
    } catch (err) {
      if (isLatest(requestId)) {
        setError(
          getErrorMessage(err, "Không tải được dữ liệu dashboard chatbot")
        );
      }
    } finally {
      // Chỉ request mới nhất được tắt loading, tránh request cũ về sau
      // làm mất trạng thái đang tải của request đang chạy.
      if (isLatest(requestId)) setLoading(false);
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

  /**
   * Tải lại danh sách phiên với bộ lọc chỉ định.
   *
   * Luôn truyền tường minh qua overrides thay vì để loadTickets đọc state:
   * các setState phía trên là async nên state lúc này vẫn là giá trị của
   * render trước (stale closure).
   */
  const runTicketQuery = async (overrides: Partial<TicketListParams>) => {
    const requestId = nextRequestId();

    try {
      setLoading(true);
      setError("");

      await loadTickets(normalizedFilters, overrides, requestId);
    } catch (err) {
      if (isLatest(requestId)) {
        setError(getErrorMessage(err, "Không tải được danh sách phiên chat"));
      }
    } finally {
      if (isLatest(requestId)) setLoading(false);
    }
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

    await runTicketQuery({ status, q: "", dashboard_category: category });
  };

  /**
   * Đổi nhóm xử lý ở dropdown -> lọc lại ngay.
   *
   * Xóa luôn dashboard_category: chủ đề chỉ được đặt khi bấm từ biểu đồ.
   * Giữ lại sẽ lọc chồng chéo và thường ra 0 kết quả, khiến người dùng
   * tưởng nhóm đó không có dữ liệu.
   */
  const changeTicketStatus = async (status: OutcomeCode) => {
    setTicketStatus(status);
    setTicketCategory("");
    setTicketPanelTitle(
      CHATBOT_TICKET_STATUS_OPTIONS.find((item) => item.value === status)
        ?.label || DEFAULT_PANEL_TITLE
    );

    await runTicketQuery({ status, dashboard_category: "" });
  };

  /** Về lại trạng thái mặc định của tab Ticket, không phải "Tất cả". */
  const clearTicketFilters = async () => {
    setTicketStatus(DEFAULT_TICKET_STATUS);
    setTicketKeyword("");
    setTicketCategory("");
    setTicketPanelTitle(DEFAULT_CCC_PANEL_TITLE);

    await runTicketQuery({
      status: DEFAULT_TICKET_STATUS,
      q: "",
      dashboard_category: "",
    });
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

  // Ref được cập nhật mỗi render để setInterval bên dưới luôn gọi bản
  // mới nhất của refreshData, thay vì bản đóng băng lúc tạo interval.
  const refreshDataRef = useRef(refreshData);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refreshDataRef.current();
    }, AUTO_REFRESH_MS);

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
    // Không export setTicketStatus thô: gọi nó chỉ đổi state mà không
    // tải lại dữ liệu. Luôn dùng changeTicketStatus.
    changeTicketStatus,
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
