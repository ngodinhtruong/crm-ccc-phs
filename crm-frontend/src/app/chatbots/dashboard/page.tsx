"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarRange,
  Filter,
  Layers3,
  MessageSquareWarning,
  PieChart,
  RefreshCcw,
  Search,
  Settings,
  Ticket,
  UserRoundCheck,
  X,
} from "lucide-react";

import { authService } from "@/services/auth.service";
import {
  ChartItem,
  ChatbotDashboardFilters,
  ChatbotFaqItem,
  chatbotDashboardService,
  ChatbotOverviewResponse,
  ChatbotTicketItem,
} from "@/services/chatbot-dashboard.service";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";

type ActiveTab = "overview" | "tickets" | "faqs";

type TicketOpenOptions = {
  title: string;
  status?: string;
  dashboard_category?: string;
};

const currentYear = new Date().getFullYear();

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function shortText(value?: string, max = 80) {
  if (!value) return "-";

  if (value.length <= max) return value;

  return `${value.slice(0, max)}...`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function getStartOfWeek(date: Date) {
  const cloned = new Date(date);
  const day = cloned.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  cloned.setDate(cloned.getDate() + diff);

  return cloned;
}

function normalizeFilters(raw: ChatbotDashboardFilters): ChatbotDashboardFilters {
  const result: ChatbotDashboardFilters = {};

  Object.entries(raw).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      result[key as keyof ChatbotDashboardFilters] = String(value).trim();
    }
  });

  return result;
}
export default function ChatbotDashboardPage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

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
  const [ticketPanelTitle, setTicketPanelTitle] = useState("Tất cả phiên chatbot");

  const [selectedSession, setSelectedSession] = useState<ChatbotTicketItem | null>(
    null
  );

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

  const loadTickets = async (activeFilters = normalizedFilters) => {
    const data = await chatbotDashboardService.getTickets({
      ...activeFilters,
      status: ticketStatus,
      q: ticketKeyword,
      dashboard_category: ticketCategory,
      page_size: 50,
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

  const loadData = async (overrideFilters?: ChatbotDashboardFilters) => {
    try {
      setLoading(true);
      setError("");

      const activeFilters = overrideFilters
        ? normalizeFilters(overrideFilters)
        : normalizedFilters;

      if (activeTab === "overview") {
        await loadOverview(activeFilters);
      }

      if (activeTab === "tickets") {
        await loadTickets(activeFilters);
      }

      if (activeTab === "faqs") {
        await loadFaqs(activeFilters);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message;

      setError(
        `Không tải được dữ liệu dashboard chatbot. Status: ${status} - ${detail}`
      );
    } finally {
      setLoading(false);
    }
  };

  const applyQuickPreset = (preset: "TODAY" | "THIS_WEEK" | "THIS_MONTH") => {
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
    loadData(nextFilters);
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
    loadData(nextFilters);
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

      const data = await chatbotDashboardService.getTickets({
        ...normalizedFilters,
        status,
        q: "",
        dashboard_category: category,
        page_size: 50,
      });

      setTickets(data.results || []);
      setTicketCount(data.count || 0);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message;

      setError(`Không tải được danh sách phiên chat. Status: ${status} - ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, activeTab]);

  return (
    <>
      <main className="min-h-screen bg-[#eef2f5] text-slate-800">
        <MainNavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

        <DashboardTopbar onMenuClick={() => setMenuOpen(true)} />

        <DashboardSidebar
          open={settingsSidebarOpen}
          onClose={() => setSettingsSidebarOpen(false)}
        />

        <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-56px)] w-10 bg-[#263747]">
          <button
            type="button"
            onClick={() => setSettingsSidebarOpen(true)}
            className="flex h-10 w-full items-center justify-center bg-[#1d2c39] text-white hover:bg-orange-500"
            title="Mở cài đặt"
          >
            <Settings size={22} />
          </button>
        </aside>

        <section className="min-h-screen pl-10 pt-14">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Link
                href="/"
                className="font-medium text-slate-700 hover:text-orange-500"
              >
                TRANG CHỦ
              </Link>
              <span>&gt;</span>
              <span>Báo cáo</span>
              <span>&gt;</span>
              <span className="font-semibold text-slate-800">
                Dashboard Chatbot
              </span>
            </div>

            <button
              type="button"
              onClick={() => loadData()}
              className="flex h-8 items-center gap-2 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
            >
              <RefreshCcw size={14} />
              Tải lại
            </button>
          </div>

          <div className="space-y-4 p-4">
            <DashboardToolbar
              filters={filters}
              activeTab={activeTab}
              onFilterChange={updateFilter}
              onApply={() => loadData()}
              onClear={clearFilters}
              onQuickPreset={applyQuickPreset}
            />

            <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
                Đang tải dữ liệu...
              </div>
            )}

            {!loading && !error && activeTab === "overview" && overview && (
              <OverviewTab
                overview={overview}
                onOpenTickets={openTicketsFromOverview}
              />
            )}

            {!loading && !error && activeTab === "tickets" && (
              <TicketsTab
                tickets={tickets}
                count={ticketCount}
                title={ticketPanelTitle}
                status={ticketStatus}
                keyword={ticketKeyword}
                category={ticketCategory}
                onStatusChange={setTicketStatus}
                onKeywordChange={setTicketKeyword}
                onSearch={() => loadData()}
                onClearPreset={() => {
                  setTicketCategory("");
                  setTicketPanelTitle("Tất cả phiên chatbot");
                  setTicketStatus("ALL");
                  setTicketKeyword("");
                }}
                onOpenSession={setSelectedSession}
              />
            )}

            {!loading && !error && activeTab === "faqs" && (
              <FaqTab
                faqs={faqs}
                count={faqCount}
                keyword={faqKeyword}
                onKeywordChange={setFaqKeyword}
                onSearch={() => loadData()}
              />
            )}
          </div>
        </section>
      </main>

      {selectedSession && (
        <ConversationModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </>
  );
}
function DashboardToolbar({
  filters,
  activeTab,
  onFilterChange,
  onApply,
  onClear,
  onQuickPreset,
}: {
  filters: ChatbotDashboardFilters;
  activeTab: ActiveTab;
  onFilterChange: (key: keyof ChatbotDashboardFilters, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  onQuickPreset: (preset: "TODAY" | "THIS_WEEK" | "THIS_MONTH") => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Bot size={19} className="text-sky-600" />
            Dashboard Chatbot
          </h1>

          <p className="mt-0.5 text-xs text-slate-500">
            Theo dõi phiên chatbot, chuyển CCC, câu hỏi rác và xu hướng chủ đề.
          </p>

          <div className="mt-1 text-[11px] text-slate-400">
            Đang xem:{" "}
            <span className="font-semibold text-slate-600">
              {activeTab === "overview"
                ? "Tổng quan"
                : activeTab === "tickets"
                ? "Tickets"
                : "FAQ"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <QuickPresetButton
            label="Hôm nay"
            onClick={() => onQuickPreset("TODAY")}
          />

          <QuickPresetButton
            label="Tuần này"
            onClick={() => onQuickPreset("THIS_WEEK")}
          />

          <QuickPresetButton
            label="Tháng này"
            onClick={() => onQuickPreset("THIS_MONTH")}
          />

          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
              filterOpen
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            }`}
          >
            <Filter size={14} />
            Bộ lọc
          </button>

          <button
            type="button"
            onClick={onClear}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="absolute right-4 top-[calc(100%+8px)] z-40 w-[720px] max-w-[calc(100vw-90px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Bộ lọc nâng cao
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Lọc theo năm, tháng, ngày hoặc khung giờ.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Năm"
                value={filters.year || ""}
                onChange={(value) => onFilterChange("year", value)}
                placeholder="2026"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Tháng"
                value={filters.month || ""}
                onChange={(value) => onFilterChange("month", value)}
                placeholder="1-12"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <ToolbarField
                label="Từ ngày"
                type="date"
                value={filters.start_date || ""}
                onChange={(value) => onFilterChange("start_date", value)}
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <ToolbarField
                label="Đến ngày"
                type="date"
                value={filters.end_date || ""}
                onChange={(value) => onFilterChange("end_date", value)}
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Từ giờ"
                value={filters.start_hour || ""}
                onChange={(value) => onFilterChange("start_hour", value)}
                placeholder="0"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <ToolbarField
                label="Đến giờ"
                value={filters.end_hour || ""}
                onChange={(value) => onFilterChange("end_hour", value)}
                placeholder="23"
              />
            </div>

            <div className="col-span-12 flex items-end justify-end gap-2 md:col-span-8">
              <button
                type="button"
                onClick={onClear}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>

              <button
                type="button"
                onClick={() => {
                  onApply();
                  setFilterOpen(false);
                }}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0097cf] px-5 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
              >
                <Filter size={15} />
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickPresetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
    >
      <CalendarRange size={13} />
      {label}
    </button>
  );
}

function ToolbarField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </div>
  );
}
function DashboardTabs({
  activeTab,
  onChange,
}: {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}) {
  return (
    <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      <TabButton active={activeTab === "overview"} onClick={() => onChange("overview")}>
        Tổng quan
      </TabButton>

      <TabButton active={activeTab === "tickets"} onClick={() => onChange("tickets")}>
        Tickets
      </TabButton>

      <TabButton active={activeTab === "faqs"} onClick={() => onChange("faqs")}>
        FAQ
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl px-5 text-sm font-semibold transition ${
        active
          ? "bg-[#0097cf] text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
function OverviewTab({
  overview,
  onOpenTickets,
}: {
  overview: ChatbotOverviewResponse;
  onOpenTickets: (options: TicketOpenOptions) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <KpiCard
          title="Tổng tiếp nhận"
          value={overview.summary.total_received.value}
          subtitle="Tổng phiên chatbot trong kỳ"
          hint="Xem toàn bộ session"
          icon={<Bot size={22} />}
          iconClassName="bg-sky-100 text-sky-600"
          onClick={() =>
            onOpenTickets({
              title: "Tổng tiếp nhận",
              status: "ALL",
            })
          }
        />

        <KpiCard
          title="Chatbot tự xử lý"
          value={overview.summary.bot_done.value}
          subtitle={`${overview.summary.bot_done.rate || 0}% so với tổng tiếp nhận`}
          hint="Xem các phiên chatbot xử lý"
          icon={<UserRoundCheck size={22} />}
          iconClassName="bg-emerald-100 text-emerald-600"
          onClick={() =>
            onOpenTickets({
              title: "Chatbot tự xử lý",
              status: "BOT_DONE",
            })
          }
        />

        <KpiCard
          title="Chuyển CCC xử lý"
          value={overview.summary.ccc.value}
          subtitle={`${overview.summary.ccc.rate || 0}% so với tổng tiếp nhận`}
          hint="Xem các phiên chuyển CCC"
          icon={<Ticket size={22} />}
          iconClassName="bg-amber-100 text-amber-600"
          onClick={() =>
            onOpenTickets({
              title: "Chuyển CCC xử lý",
              status: "CCC",
            })
          }
        />

        <KpiCard
          title="Câu hỏi rác / Timeout"
          value={overview.summary.spam.value}
          subtitle={`${overview.summary.spam.rate || 0}% so với tổng tiếp nhận`}
          hint="Xem các phiên rác / timeout"
          icon={<MessageSquareWarning size={22} />}
          iconClassName="bg-rose-100 text-rose-600"
          onClick={() =>
            onOpenTickets({
              title: "Câu hỏi rác / Timeout",
              status: "SPAM",
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Phân loại xử lý"
            description="So sánh Chatbot tự xử lý / Chuyển CCC / Rác"
            icon={<BarChart3 size={18} />}
          >
            <MetricBars
              data={overview.charts.process_classification || []}
              onItemClick={(item) => {
                const status =
                  item.code === "SPAM_TIMEOUT"
                    ? "SPAM"
                    : item.code === "CCC"
                    ? "CCC"
                    : item.code === "BOT_DONE"
                    ? "BOT_DONE"
                    : "ALL";

                onOpenTickets({
                  title: item.name,
                  status,
                });
              }}
            />
          </AnalyticsPanel>
        </div>

        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Vấn đề CCC xử lý"
            description="Phân bổ các phiên chuyển sang CCC"
            icon={<PieChart size={18} />}
          >
            <CategoryShareList
              data={overview.charts.ccc_issue_pie || []}
              onItemClick={(item) =>
                onOpenTickets({
                  title: `CCC - ${item.name}`,
                  status: "CCC",
                  dashboard_category: item.name,
                })
              }
            />
          </AnalyticsPanel>
        </div>

        <div className="xl:col-span-4">
          <AnalyticsPanel
            title="Phân loại theo chủ đề"
            description="Tổng hợp theo chủ đề toàn bộ session"
            icon={<Layers3 size={18} />}
          >
            <TopicRankingList
              data={overview.charts.topic_bar || []}
              onItemClick={(item) =>
                onOpenTickets({
                  title: `Chủ đề - ${item.name}`,
                  status: "ALL",
                  dashboard_category: item.name,
                })
              }
            />
          </AnalyticsPanel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LatestCccTable rows={overview.quick_lists.latest_ccc_tickets || []} />
        <TopFaqTable rows={overview.quick_lists.top_faqs || []} />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  hint,
  icon,
  iconClassName,
  onClick,
}: {
  title: string;
  value: number;
  subtitle: string;
  hint: string;
  icon: React.ReactNode;
  iconClassName: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </div>

          <div className="mt-3 text-3xl font-bold text-slate-800">{value}</div>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 text-sm text-slate-500">{subtitle}</div>

      {/* <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-sky-600">
        {hint}
        <ArrowRight
          size={14}
          className="transition group-hover:translate-x-0.5"
        />
      </div> */}
    </button>
  );
}

function AnalyticsPanel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

function MetricBars({
  data,
  onItemClick,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {data.length === 0 && (
        <EmptyState message="Không có dữ liệu phân loại xử lý." />
      )}

      {data.map((item) => (
        <button
          key={item.name}
          type="button"
          onClick={() => onItemClick?.(item)}
          className="block w-full rounded-xl border border-transparent p-3 text-left transition hover:border-sky-200 hover:bg-sky-50"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">{item.name}</div>

            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">{item.value}</div>
              <div className="text-[11px] text-slate-500">
                {typeof item.rate === "number" ? `${item.rate}%` : ""}
              </div>
            </div>
          </div>

          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
              style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

function CategoryShareList({
  data,
  onItemClick,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      {data.length === 0 && <EmptyState message="Không có dữ liệu CCC." />}

      {data.map((item) => {
        const percent = total ? Math.round((item.value / total) * 100) : 0;

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="w-full rounded-xl border border-transparent bg-slate-50 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  {item.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {percent}% tổng CCC
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">
                  {item.value}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 rounded-full bg-white">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                style={{ width: `${Math.max(percent, 6)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TopicRankingList({
  data,
  onItemClick,
}: {
  data: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {data.length === 0 && <EmptyState message="Không có dữ liệu chủ đề." />}

      {data.slice(0, 8).map((item, index) => (
        <button
          key={item.name}
          type="button"
          onClick={() => onItemClick?.(item)}
          className="w-full rounded-xl border border-transparent p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
        >
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {index + 1}
            </div>

            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700">
                {item.name}
              </div>
            </div>

            <div className="text-lg font-bold text-slate-800">{item.value}</div>
          </div>

          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
              style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}
function TicketsTab({
  tickets,
  count,
  title,
  status,
  keyword,
  category,
  onStatusChange,
  onKeywordChange,
  onSearch,
  onClearPreset,
  onOpenSession,
}: {
  tickets: ChatbotTicketItem[];
  count: number;
  title: string;
  status: string;
  keyword: string;
  category: string;
  onStatusChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onClearPreset: () => void;
  onOpenSession: (item: ChatbotTicketItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Một dòng tương ứng một session chatbot. Bấm vào dòng để xem lịch sử trò chuyện.
          </p>

          {category && (
            <div className="mt-2 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Chủ đề: {category}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Tổng: <span className="font-bold text-slate-800">{count}</span>
          </div>

          {(category || status !== "ALL" || keyword) && (
            <button
              type="button"
              onClick={onClearPreset}
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b border-slate-100 bg-[#f8fafc] px-4 py-3">
        <div className="col-span-12 md:col-span-3">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Trạng thái
          </label>

          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
          >
            <option value="ALL">Tất cả</option>
            <option value="BOT_DONE">Đã đóng — Chatbot</option>
            <option value="CCC">Đang xử lý — CCC</option>
            <option value="SPAM">Câu hỏi rác / Timeout</option>
            <option value="WAITING_INFO">Đang chờ thông tin</option>
            <option value="COLLECTED">Đã thu thập thông tin</option>
          </select>
        </div>

        <div className="col-span-12 md:col-span-6">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Tìm kiếm
          </label>

          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="Mã ticket, session_id, câu hỏi, thông tin KH..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 flex items-end md:col-span-3">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#0097cf] px-4 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
          >
            <Search size={14} />
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-11 border-b bg-white text-slate-700">
              <th className="w-[150px] px-3 font-semibold">Mã ticket</th>
              <th className="w-[180px] px-3 font-semibold">Session ID</th>
              <th className="w-[150px] px-3 font-semibold">Thời gian</th>
              <th className="w-[100px] px-3 font-semibold">Kênh</th>
              <th className="w-[160px] px-3 font-semibold">Chủ đề</th>
              <th className="w-[140px] px-3 font-semibold">Category</th>
              <th className="w-[160px] px-3 font-semibold">Trạng thái</th>
              <th className="w-[120px] px-3 font-semibold">Linked</th>
              <th className="w-[160px] px-3 font-semibold">Thông tin KH</th>
              <th className="w-[260px] px-3 font-semibold">Câu hỏi cuối</th>
              <th className="w-[260px] px-3 font-semibold">Lý do chuyển CCC</th>
            </tr>
          </thead>

          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={11} className="h-24 text-center text-slate-500">
                  Không có dữ liệu.
                </td>
              </tr>
            )}

            {tickets.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => onOpenSession(item)}
                className={`h-14 cursor-pointer border-b border-slate-100 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                } transition hover:bg-sky-50`}
              >
                <td className="px-3">
                  {item.ticket_code ? (
                    <span className="font-semibold text-sky-600">
                      {item.ticket_code}
                    </span>
                  ) : (
                    <span className="text-slate-400">Không tạo ticket</span>
                  )}
                </td>

                <td className="px-3 font-medium text-slate-700">
                  {item.session_id}
                </td>

                <td className="px-3">{formatDateTime(item.started_at)}</td>
                <td className="px-3">{item.channel || "-"}</td>
                <td className="px-3">{item.dashboard_category || "-"}</td>
                <td className="px-3">{item.main_category || "-"}</td>

                <td className="px-3">
                  <StatusPill value={item.outcome_type} label={item.outcome_label} />
                </td>

                <td className="px-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      item.linked_status === "LINKED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.linked_status || "UNLINKED"}
                  </span>
                </td>

                <td className="px-3">{item.contact_info || "-"}</td>
                <td className="px-3">{shortText(item.last_question, 120)}</td>
                <td className="px-3">{shortText(item.reason, 120)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ value, label }: { value?: string; label?: string }) {
  const display = label || value || "-";

  if (value === "CCC") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">
        {display}
      </span>
    );
  }

  if (value === "BOT_DONE") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
        {display}
      </span>
    );
  }

  if (value === "SPAM" || value === "TIMEOUT") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">
        {display}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
      {display}
    </span>
  );
}
function FaqTab({
  faqs,
  count,
  keyword,
  onKeywordChange,
  onSearch,
}: {
  faqs: ChatbotFaqItem[];
  count: number;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            FAQ được hỏi nhiều nhất
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Tính từ chatbot logs có category = FAQ. Đây là màn báo cáo, không phải màn quản lý FAQ cấu hình.
          </p>
        </div>

        <div className="text-xs text-slate-500">
          Tổng: <span className="font-bold text-slate-800">{count}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b border-slate-100 bg-[#f8fafc] px-4 py-3">
        <div className="col-span-12 md:col-span-8">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Tìm kiếm câu hỏi
          </label>

          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="Nhập câu hỏi hoặc câu trả lời..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 flex items-end md:col-span-4">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#0097cf] px-4 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
          >
            <Search size={14} />
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-11 border-b bg-white text-slate-700">
              <th className="w-[70px] px-3 font-semibold">STT</th>
              <th className="w-[120px] px-3 font-semibold">Danh mục</th>
              <th className="w-[360px] px-3 font-semibold">Câu hỏi</th>
              <th className="w-[360px] px-3 font-semibold">Câu trả lời rút gọn</th>
              <th className="w-[120px] px-3 font-semibold">Số lần hỏi</th>
              <th className="w-[160px] px-3 font-semibold">Lần hỏi gần nhất</th>
            </tr>
          </thead>

          <tbody>
            {faqs.length === 0 && (
              <tr>
                <td colSpan={6} className="h-24 text-center text-slate-500">
                  Không có dữ liệu FAQ.
                </td>
              </tr>
            )}

            {faqs.map((item, index) => (
              <tr
                key={`${item.question}-${index}`}
                className={`h-14 border-b border-slate-100 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                } hover:bg-sky-50`}
              >
                <td className="px-3">{index + 1}</td>
                <td className="px-3">{item.category || "FAQ"}</td>

                <td className="px-3 font-medium text-slate-700">
                  {shortText(item.question, 150)}
                </td>

                <td className="px-3 text-slate-600">
                  {shortText(item.answer, 160)}
                </td>

                <td className="px-3">
                  <span className="rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-700">
                    {item.hit_count}
                  </span>
                </td>

                <td className="px-3">{formatDateTime(item.latest_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LatestCccTable({ rows }: { rows: ChatbotTicketItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <h3 className="text-sm font-bold text-slate-800">
          Vấn đề cần CCC xử lý
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Các phiên mới nhất được chuyển sang CCC.
        </p>
      </div>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-slate-50 text-slate-600">
            <th className="px-3">Mã ticket</th>
            <th className="px-3">Session</th>
            <th className="px-3">Lý do</th>
            <th className="px-3">Thời gian</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="h-20 text-center text-slate-500">
                Không có dữ liệu.
              </td>
            </tr>
          )}

          {rows.map((item) => (
            <tr key={item.id} className="h-12 border-b border-slate-100">
              <td className="px-3 font-semibold text-sky-600">
                {item.ticket_code || "-"}
              </td>
              <td className="px-3">{item.session_id}</td>
              <td className="px-3">
                {shortText(item.reason || item.last_question, 60)}
              </td>
              <td className="px-3">{formatDateTime(item.started_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopFaqTable({ rows }: { rows: ChatbotFaqItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <h3 className="text-sm font-bold text-slate-800">
          FAQ được hỏi nhiều nhất
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Câu hỏi FAQ có tần suất cao nhất.
        </p>
      </div>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-slate-50 text-slate-600">
            <th className="px-3">Câu hỏi</th>
            <th className="px-3">Số lần hỏi</th>
            <th className="px-3">Lần gần nhất</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="h-20 text-center text-slate-500">
                Không có dữ liệu.
              </td>
            </tr>
          )}

          {rows.map((item, index) => (
            <tr
              key={`${item.question}-${index}`}
              className="h-12 border-b border-slate-100"
            >
              <td className="px-3">{shortText(item.question, 80)}</td>
              <td className="px-3 font-semibold text-sky-600">
                {item.hit_count}
              </td>
              <td className="px-3">{formatDateTime(item.latest_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ConversationModal({
  session,
  onClose,
}: {
  session: ChatbotTicketItem;
  onClose: () => void;
}) {
  const conversation =
    session.full_conversation ||
    [
      session.first_question ? `Khách hàng: ${session.first_question}` : "",
      session.last_question && session.last_question !== session.first_question
        ? `Câu cuối: ${session.last_question}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Lịch sử trò chuyện
            </h2>

            <div className="mt-1 text-xs text-slate-500">
              Session:{" "}
              <span className="font-semibold text-slate-700">
                {session.session_id}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs md:grid-cols-4">
          <InfoItem
            label="Trạng thái"
            value={session.outcome_label || session.outcome_type}
          />
          <InfoItem label="Chủ đề" value={session.dashboard_category || "-"} />
          <InfoItem
            label="Thời gian bắt đầu"
            value={formatDateTime(session.started_at)}
          />
          <InfoItem
            label="Mã ticket"
            value={session.ticket_code || "Không tạo ticket"}
          />
        </div>

        <div className="overflow-y-auto p-5">
          {conversation ? (
            <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              {conversation}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Phiên này chưa có nội dung hội thoại.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-medium text-slate-700">{value}</div>
    </div>
  );
}