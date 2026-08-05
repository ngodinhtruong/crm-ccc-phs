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
  GranularityChoice,
  GranularityMode,
  OutcomeCode,
  TicketListParams,
  TicketOpenOptions,
} from "@/types/chatbot-dashboard.type";
import { normalizeFilters } from "@/utils/chatbot-filter.util";
import { formatDateInput } from "@/utils/date.util";
import { getErrorMessage } from "@/utils/error.util";

/**
 * Preset ngày còn lại duy nhất.
 *
 * Hôm nay / Tuần này / Tháng này đã bỏ: khoảng thời gian giờ đến từ nút
 * Tháng-Quý-Năm hoặc bộ lọc nâng cao, ba preset đó chỉ gây trùng vai.
 */
export type QuickPreset = "LAST_5_MONTHS";

const PAGE_SIZE = 50;
const DEFAULT_PANEL_TITLE = "Tất cả phiên chatbot";
const DEFAULT_CCC_PANEL_TITLE = "Chuyển CCC xử lý";

/** Nhóm mặc định của tab Ticket: nhóm cần người xử lý. */
const DEFAULT_TICKET_STATUS: OutcomeCode = "CCC";

/** Chu kỳ tự làm mới dashboard: 2 phút. */
const AUTO_REFRESH_MS = 120_000;

/** Khoảng của preset "5 tháng gần đây": từ đầu tháng cách đây 4 tháng tới nay. */
function getPresetFilters(): ChatbotDashboardFilters {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  const end = now;

  return {
    start_date: formatDateInput(start),
    end_date: formatDateInput(end),
  };
}

/** Bấm "Năm" thì so mấy năm gần nhất. Khớp với COMPARISON_YEARS của backend. */
const YEAR_SPAN = 2;

/** Trạng thái mặc định của trang: xem theo tháng, từ đầu năm tới hiện tại. */
const DEFAULT_GRANULARITY: GranularityMode = "month";

/**
 * Khoảng thời gian đi kèm mỗi mốc.
 *
 * Bấm "Tháng" là muốn xem các tháng trong năm nay tính tới hôm nay, bấm "Quý"
 * là các quý trong năm nay, bấm "Năm" là mấy năm gần nhất. Nút mốc vì vậy đặt
 * luôn khoảng chứ không chỉ đổi cách chia trục — nhờ đó KPI, donut, phễu,
 * bảng FAQ... cũng đổi theo, không chỉ mấy biểu đồ chuỗi thời gian.
 */
function getGranularityFilters(
  mode: GranularityMode
): ChatbotDashboardFilters {
  const now = new Date();
  const startYear = mode === "year" ? now.getFullYear() - (YEAR_SPAN - 1) : now.getFullYear();

  return {
    start_date: formatDateInput(new Date(startYear, 0, 1)),
    end_date: formatDateInput(now),
  };
}

/**
 * "auto" = không ép mốc, để backend suy từ độ dài khoảng lọc:
 * lọc trong tháng -> ngày, lọc trọn năm -> tháng, lọc nhiều năm -> năm.
 * Người dùng vẫn đổi tay được bằng bộ chọn mốc trên biểu đồ.
 */
const EMPTY_FILTERS: ChatbotDashboardFilters = {
  year: "",
  month: "",
  start_date: "",
  end_date: "",
  start_hour: "",
  end_hour: "",
  granularity: "auto",
};

/** Bộ lọc lúc mở trang và sau khi bấm "Xóa lọc": xem từ đầu năm tới hiện tại. */
function getDefaultFilters(): ChatbotDashboardFilters {
  const preset = getPresetFilters();
  let savedStart = "";
  let savedEnd = "";
  if (typeof window !== "undefined") {
    savedStart = sessionStorage.getItem("chatbot_dashboard_start_date") || "";
    savedEnd = sessionStorage.getItem("chatbot_dashboard_end_date") || "";
  }

  return {
    ...EMPTY_FILTERS,
    ...preset,
    start_date: savedStart || preset.start_date,
    end_date: savedEnd || preset.end_date,
    granularity: DEFAULT_GRANULARITY,
  };
}

export function useChatbotDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  const [filters, setFilters] = useState<ChatbotDashboardFilters>(
    getDefaultFilters()
  );

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

    router.replace(`/chatbots/dashboard?tab=${nextTab}`, {
      scroll: false,
    });

    void loadData(undefined, nextTab);
  };

  /** Preset "5 tháng gần đây": khoảng lệch ranh giới năm nên để mốc tự động. */
  const applyQuickPreset = () => {
    const nextFilters = { ...EMPTY_FILTERS, ...getPresetFilters() };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("chatbot_dashboard_start_date", nextFilters.start_date || "");
      sessionStorage.setItem("chatbot_dashboard_end_date", nextFilters.end_date || "");
    }

    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  /** Xóa lọc = quay lại mặc định: xem theo tháng, từ đầu năm tới hiện tại. */
  const clearFilters = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("chatbot_dashboard_start_date");
      sessionStorage.removeItem("chatbot_dashboard_end_date");
    }
    const nextFilters = getDefaultFilters();

    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  /**
   * Đổi mốc thời gian thủ công.
   *
   * Mốc cụ thể kéo theo khoảng của nó và xóa bộ lọc nâng cao đang có, để
   * toàn bộ dashboard nói về cùng một quãng thời gian. Riêng "Tự động" thì
   * giữ nguyên khoảng đang xem và trả quyền chọn mốc cho backend.
   */
  const changeGranularity = (mode: GranularityChoice) => {
    const nextFilters: ChatbotDashboardFilters =
      mode === "auto"
        ? { ...filters, granularity: "auto" }
        : {
            ...EMPTY_FILTERS,
            ...getGranularityFilters(mode),
            granularity: mode,
          };

    if (typeof window !== "undefined" && nextFilters.start_date && nextFilters.end_date) {
      sessionStorage.setItem("chatbot_dashboard_start_date", nextFilters.start_date);
      sessionStorage.setItem("chatbot_dashboard_end_date", nextFilters.end_date);
    }

    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  /**
   * Áp dụng bộ lọc nâng cao.
   *
   * Trả mốc về tự động: người dùng đã tự chỉ định khoảng nên mốc phải suy
   * theo khoảng đó, không giữ lại mốc của lần bấm nút trước.
   */
  const applyFilters = () => {
    const nextFilters: ChatbotDashboardFilters = {
      ...filters,
      granularity: "auto",
    };

    if (typeof window !== "undefined" && nextFilters.start_date && nextFilters.end_date) {
      sessionStorage.setItem("chatbot_dashboard_start_date", nextFilters.start_date);
      sessionStorage.setItem("chatbot_dashboard_end_date", nextFilters.end_date);
    }

    setFilters(nextFilters);
    void loadData(nextFilters);
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

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");

    const initialTab: ActiveTab =
      tabParam === "tickets"
        ? "tickets"
        : tabParam === "faqs"
          ? "faqs"
          : "overview";

    const frame = window.requestAnimationFrame(() => {
      setActiveTab(initialTab);
      void loadData(undefined, initialTab);
    });

    return () => window.cancelAnimationFrame(frame);

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
    applyFilters,
    clearFilters,
    changeGranularity,

    /**
     * Mốc backend thực sự dùng. Để undefined khi chưa có response (vd vào
     * thẳng tab Tickets) thay vì đoán "month" — nhãn sai còn tệ hơn không có.
     */
    effectiveGranularity: overview?.granularity,
    isAutoGranularity: (filters.granularity || "auto") === "auto",

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
