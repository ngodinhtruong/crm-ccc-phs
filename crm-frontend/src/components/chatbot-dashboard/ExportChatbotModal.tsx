"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import {
  Download,
  FileSpreadsheet,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  Check,
  Database,
  FileText,
  Calendar,
} from "lucide-react";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { chatbotDashboardApi } from "@/apis/chatbot-dashboard.api";
import type { ChatbotExportParams } from "@/types/chatbot-dashboard.type";

export type ColumnChoiceOption = {
  value: string;
  label: string;
};

export type ColumnItemConfig = {
  key: string;
  label: string;
  filterKey?: "channel" | "outcome" | "category" | "status";
  options?: ColumnChoiceOption[];
};

const CHANNEL_OPTIONS: ColumnChoiceOption[] = [
  { value: "web", label: "Web Portals (WEB)" },
  { value: "app", label: "Mobile App (APP)" },
  { value: "zalo", label: "Zalo OA (ZALO)" },
  { value: "facebook", label: "Facebook Fanpage" },
  { value: "xpro", label: "XPro Platform" },
  { value: "chatbot", label: "Chatbot chung" },
];

const OUTCOME_OPTIONS: ColumnChoiceOption[] = [
  { value: "BOT_DONE", label: "Chatbot tự xử lý (BOT_DONE)" },
  { value: "CCC", label: "Chuyển CCC xử lý (CCC)" },
  { value: "PENDING", label: "Chờ thông tin KH (PENDING)" },
  { value: "RESEARCH", label: "Phân tích / Khuyến nghị (RESEARCH)" },
  { value: "SPAM", label: "Câu hỏi rác (SPAM)" },
  { value: "UNCLASSIFIED", label: "Chưa xác định loại (UNCLASSIFIED)" },
];

const CATEGORY_OPTIONS: ColumnChoiceOption[] = [
  { value: "Mở tài khoản", label: "Mở tài khoản" },
  { value: "Thẻ & Tiền", label: "Thẻ & Tiền" },
  { value: "Giao dịch chứng khoán", label: "Giao dịch chứng khoán" },
  { value: "Thay đổi thông tin", label: "Thay đổi thông tin" },
  { value: "Quên mật khẩu", label: "Quên mật khẩu / Đăng nhập" },
  { value: "Hỗ trợ kỹ thuật", label: "Hỗ trợ kỹ thuật / App" },
  { value: "Tra cứu phí", label: "Tra cứu biểu phí & lãi suất" },
  { value: "Chưa phân loại", label: "Chưa phân loại" },
];

const STATUS_OPTIONS: ColumnChoiceOption[] = [
  { value: "CREATED", label: "Đã khởi tạo (CREATED)" },
  { value: "PROCESSING", label: "Đang xử lý (PROCESSING)" },
  { value: "CLOSED", label: "Đã hoàn thành (CLOSED)" },
  { value: "CANCELLED", label: "Đã hủy (CANCELLED)" },
];

// Cột chuẩn định dạng tiếng Việt
const FORMATTED_EXPORT_COLUMNS: ColumnItemConfig[] = [
  { key: "session_id", label: "Mã phiên (Session ID)" },
  { key: "ticket_code", label: "Mã Ticket CRM" },
  {
    key: "ticket_status",
    label: "Trạng thái Ticket",
    filterKey: "status",
    options: STATUS_OPTIONS,
  },
  {
    key: "channel",
    label: "Kênh giao tiếp",
    filterKey: "channel",
    options: CHANNEL_OPTIONS,
  },
  {
    key: "outcome_type",
    label: "Kết quả xử lý",
    filterKey: "outcome",
    options: OUTCOME_OPTIONS,
  },
  {
    key: "dashboard_category",
    label: "Chủ đề (Category)",
    filterKey: "category",
    options: CATEGORY_OPTIONS,
  },
  { key: "contact_info", label: "Thông tin liên hệ" },
  { key: "reason", label: "Lý do / Mô tả" },
  { key: "last_question", label: "Câu hỏi gần nhất" },
  { key: "msg_count_total", label: "Số tin nhắn" },
  { key: "started_at", label: "Thời gian bắt đầu" },
  { key: "ended_at", label: "Thời gian kết thúc" },
];

// Cột thô y hệt tên trường trong CSDL (Raw DB)
const RAW_DB_EXPORT_COLUMNS: ColumnItemConfig[] = [
  { key: "id", label: "id (Primary Key)" },
  { key: "session_id", label: "session_id" },
  { key: "user_id", label: "user_id" },
  {
    key: "channel",
    label: "channel",
    filterKey: "channel",
    options: CHANNEL_OPTIONS,
  },
  {
    key: "dashboard_category",
    label: "dashboard_category",
    filterKey: "category",
    options: CATEGORY_OPTIONS,
  },
  {
    key: "outcome_type",
    label: "outcome_type",
    filterKey: "outcome",
    options: OUTCOME_OPTIONS,
  },
  { key: "msg_count_total", label: "msg_count_total" },
  { key: "msg_count_bot_done", label: "msg_count_bot_done" },
  { key: "msg_count_ccc", label: "msg_count_ccc" },
  { key: "msg_count_spam", label: "msg_count_spam" },
  { key: "msg_count_pending", label: "msg_count_pending" },
  { key: "msg_count_research", label: "msg_count_research" },
  { key: "msg_count_unclassified", label: "msg_count_unclassified" },
  { key: "has_cskh_state", label: "has_cskh_state" },
  { key: "has_cskh_request", label: "has_cskh_request" },
  { key: "state_step", label: "state_step" },
  { key: "contact_info", label: "contact_info" },
  { key: "contact_type", label: "contact_type" },
  { key: "reason", label: "reason" },
  { key: "first_question", label: "first_question" },
  { key: "last_question", label: "last_question" },
  { key: "full_conversation", label: "full_conversation" },
  { key: "ticket_id", label: "ticket_id" },
  { key: "started_at", label: "started_at" },
  { key: "ended_at", label: "ended_at" },
  { key: "created_at", label: "created_at" },
  { key: "updated_at", label: "updated_at" },
];

export type ExportChatbotModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: ChatbotExportParams;
};

export const ExportChatbotModal = memo(function ExportChatbotModal({
  isOpen,
  onClose,
  currentFilters = {},
}: ExportChatbotModalProps) {
  // Mode xuất: formatted (Báo cáo chuẩn) vs raw_db (Xuất dữ liệu thô)
  const [dataMode, setDataMode] = useState<"formatted" | "raw_db">("formatted");

  // Hàng 1: Định dạng file
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("excel");

  // Hàng 2: Thời gian
  const [startDate, setStartDate] = useState<string>(currentFilters.start_date || "");
  const [endDate, setEndDate] = useState<string>(currentFilters.end_date || "");

  // Danh sách cột hiện tại theo mode
  const activeColumnsList = dataMode === "raw_db" ? RAW_DB_EXPORT_COLUMNS : FORMATTED_EXPORT_COLUMNS;

  // Hàng 3: Chọn cột xuất
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
    FORMATTED_EXPORT_COLUMNS.map((c) => c.key)
  );

  // Khi đổi dataMode thì reset danh sách cột được chọn tương ứng
  useEffect(() => {
    const cols = dataMode === "raw_db" ? RAW_DB_EXPORT_COLUMNS : FORMATTED_EXPORT_COLUMNS;
    setSelectedColumns(cols.map((c) => c.key));
  }, [dataMode]);

  // Lọc đa chọn cho các cột có loại
  const [selectedChannels, setSelectedChannels] = useState<string[]>(() =>
    CHANNEL_OPTIONS.map((c) => c.value)
  );
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>(() =>
    OUTCOME_OPTIONS.map((o) => o.value)
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    CATEGORY_OPTIONS.map((c) => c.value)
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() =>
    STATUS_OPTIONS.map((s) => s.value)
  );

  // Dropdown mở popover nào & vị trí float fixed của nó
  const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdownKey(null);
        setDropdownPos(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleDropdown = useCallback(
    (key: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (activeDropdownKey === key) {
        setActiveDropdownKey(null);
        setDropdownPos(null);
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
        setActiveDropdownKey(key);
      }
    },
    [activeDropdownKey]
  );

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chọn/Bỏ tất cả các cột
  const isAllColumnsSelected = selectedColumns.length === activeColumnsList.length;

  const toggleSelectAllColumns = useCallback(() => {
    setSelectedColumns((prev) =>
      prev.length === activeColumnsList.length ? [] : activeColumnsList.map((c) => c.key)
    );
  }, [activeColumnsList]);

  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  // Helper lấy/gán danh sách đang chọn cho từng filterKey
  const getSelectedVals = useCallback(
    (filterKey: string) => {
      if (filterKey === "channel") return selectedChannels;
      if (filterKey === "outcome") return selectedOutcomes;
      if (filterKey === "category") return selectedCategories;
      if (filterKey === "status") return selectedStatuses;
      return [];
    },
    [selectedChannels, selectedOutcomes, selectedCategories, selectedStatuses]
  );

  const toggleFilterItem = useCallback((filterKey: string, val: string) => {
    if (filterKey === "channel") {
      setSelectedChannels((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    } else if (filterKey === "outcome") {
      setSelectedOutcomes((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    } else if (filterKey === "category") {
      setSelectedCategories((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    } else if (filterKey === "status") {
      setSelectedStatuses((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    }
  }, []);

  const toggleSelectAllFilter = useCallback(
    (filterKey: string, options: ColumnChoiceOption[]) => {
      const allVals = options.map((o) => o.value);
      if (filterKey === "channel") {
        setSelectedChannels((prev) => (prev.length === allVals.length ? [] : allVals));
      } else if (filterKey === "outcome") {
        setSelectedOutcomes((prev) => (prev.length === allVals.length ? [] : allVals));
      } else if (filterKey === "category") {
        setSelectedCategories((prev) => (prev.length === allVals.length ? [] : allVals));
      } else if (filterKey === "status") {
        setSelectedStatuses((prev) => (prev.length === allVals.length ? [] : allVals));
      }
    },
    []
  );

  const handleExport = useCallback(async () => {
    if (selectedColumns.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 cột để xuất.");
      return;
    }

    try {
      setIsExporting(true);
      setErrorMsg(null);

      await chatbotDashboardApi.exportData({
        ...currentFilters,
        start_date: startDate,
        end_date: endDate,
        export_format: exportFormat,
        export_mode: dataMode === "raw_db" ? "raw_db" : "formatted",
        group_by: "none",
        channels:
          selectedChannels.length === CHANNEL_OPTIONS.length
            ? "all"
            : selectedChannels.join(","),
        outcomes:
          selectedOutcomes.length === OUTCOME_OPTIONS.length
            ? "all"
            : selectedOutcomes.join(","),
        categories:
          selectedCategories.length === CATEGORY_OPTIONS.length
            ? "all"
            : selectedCategories.join(","),
        ticket_statuses:
          selectedStatuses.length === STATUS_OPTIONS.length
            ? "all"
            : selectedStatuses.join(","),
        columns: selectedColumns.length === activeColumnsList.length ? "all" : selectedColumns.join(","),
      });

      onClose();
    } catch (err: any) {
      console.error("Export Chatbot error:", err);
      setErrorMsg(
        err?.response?.data?.detail || "Không thể xuất file. Vui lòng thử lại!"
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedColumns,
    currentFilters,
    startDate,
    endDate,
    exportFormat,
    dataMode,
    selectedChannels,
    selectedOutcomes,
    selectedCategories,
    selectedStatuses,
    activeColumnsList,
    onClose,
  ]);

  if (!isOpen) return null;

  const activeColConfig = activeColumnsList.find((c) => c.key === activeDropdownKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-6">
      <div
        ref={containerRef}
        className="relative flex flex-col w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xuất Báo Cáo Chatbot AI
              </h3>
              <p className="text-xs text-slate-500">
                Tùy chọn chế độ dữ liệu, khoảng thời gian và chọn cột xuất file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body 3 Hàng Tinh Gọn */}
        <div className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* HÀNG 1: Chế độ dữ liệu & Định dạng file */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                Chế độ dữ liệu
              </label>
              <div className="flex items-center rounded-xl bg-slate-200/80 p-1">
                <button
                  type="button"
                  onClick={() => setDataMode("formatted")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    dataMode === "formatted"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText size={14} className={dataMode === "formatted" ? "text-teal-600" : "text-slate-400"} />
                  <span>Báo cáo chuẩn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode("raw_db")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    dataMode === "raw_db"
                      ? "bg-white text-indigo-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Database size={14} className={dataMode === "raw_db" ? "text-indigo-600" : "text-slate-400"} />
                  <span>Xuất dữ liệu thô</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                Định dạng tập tin
              </label>
              <div className="flex items-center rounded-xl bg-slate-200/80 p-1">
                <button
                  type="button"
                  onClick={() => setExportFormat("excel")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    exportFormat === "excel"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileSpreadsheet size={14} className={exportFormat === "excel" ? "text-emerald-600" : "text-slate-400"} />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    exportFormat === "csv"
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText size={14} className={exportFormat === "csv" ? "text-teal-600" : "text-slate-400"} />
                  <span>CSV (.csv)</span>
                </button>
              </div>
            </div>
          </div>

          {/* HÀNG 2: Khoảng thời gian */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-teal-600" />
              Khoảng thời gian báo cáo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold shrink-0 text-xs">Từ ngày:</span>
                <DatePickerInput
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Chọn ngày bắt đầu"
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold shrink-0 text-xs">Đến ngày:</span>
                <DatePickerInput
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Chọn ngày kết thúc"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* HÀNG 3: Danh sách cột (Dàn ngang Lưới 2 Cột) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Danh sách cột xuất ({selectedColumns.length}/{activeColumnsList.length} cột)
              </span>
              <button
                type="button"
                onClick={toggleSelectAllColumns}
                className="flex items-center gap-1.5 font-bold text-teal-600 hover:text-teal-800 text-xs transition-colors"
              >
                {isAllColumnsSelected ? (
                  <CheckSquare className="h-4 w-4 text-teal-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>Chọn tất cả cột</span>
              </button>
            </div>

            {/* Lưới 2 cột card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-slate-200">
              {activeColumnsList.map((col) => {
                const isColChecked = selectedColumns.includes(col.key);
                const hasOptions = !!col.options && !!col.filterKey;
                const filterKey = col.filterKey || "";
                const selectedOptionsList = hasOptions ? getSelectedVals(filterKey) : [];
                const totalOptionsCount = col.options?.length || 0;
                const isDropdownOpen = activeDropdownKey === col.key;

                return (
                  <div
                    key={col.key}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-all ${
                      isColChecked
                        ? "bg-white border-slate-300 text-slate-900 shadow-2xs"
                        : "bg-slate-100/70 border-slate-200 text-slate-400"
                    }`}
                  >
                    {/* Bên trái: Checkbox + Tên cột */}
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isColChecked}
                        onChange={() => toggleColumn(col.key)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                      />
                      <span className={`font-semibold text-xs truncate ${isColChecked ? "text-slate-800" : "text-slate-400"}`}>
                        {col.label}
                      </span>
                    </label>

                    {/* Bên phải: Dropdown chọn các loại */}
                    {hasOptions && col.options && (
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={(e) => toggleDropdown(col.key, e)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-teal-500 transition-colors"
                        >
                          <span>
                            {selectedOptionsList.length === totalOptionsCount
                              ? `Tất cả (${totalOptionsCount})`
                              : selectedOptionsList.length === 0
                              ? "Trống"
                              : `Đã chọn (${selectedOptionsList.length}/${totalOptionsCount})`}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Fixed Popover Dropdown Chọn Loại (Không bao giờ bị chìm/che bởi overflow-y-auto) */}
        {activeDropdownKey && activeColConfig?.options && activeColConfig?.filterKey && dropdownPos && (
          <div
            style={{
              position: "fixed",
              top: `${dropdownPos.top}px`,
              right: `${dropdownPos.right}px`,
              zIndex: 100,
            }}
            className="min-w-[220px] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl space-y-1"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 px-1">
              <span className="text-xs font-bold text-slate-700">Chọn loại {activeColConfig.label}</span>
              <button
                type="button"
                onClick={() => toggleSelectAllFilter(activeColConfig.filterKey!, activeColConfig.options!)}
                className="text-xs font-bold text-teal-600 hover:text-teal-800"
              >
                {getSelectedVals(activeColConfig.filterKey!).length === activeColConfig.options.length
                  ? "Bỏ tất cả"
                  : "Chọn tất cả"}
              </button>
            </div>

            <div className="space-y-0.5">
              {activeColConfig.options.map((opt) => {
                const isItemChecked = getSelectedVals(activeColConfig.filterKey!).includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilterItem(activeColConfig.filterKey!, opt.value);
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                      isItemChecked ? "bg-teal-50 font-bold text-teal-900" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isItemChecked}
                        onChange={() => {}}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 cursor-pointer"
                      />
                      <span>{opt.label}</span>
                    </div>
                    {isItemChecked && <Check className="h-3.5 w-3.5 text-teal-600" />}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <span className="text-xs text-slate-500">
            Định dạng: <span className="font-bold text-slate-700 uppercase">{exportFormat}</span> •{" "}
            <span className="font-semibold text-teal-700">
              {dataMode === "raw_db" ? "⚡ Xuất dữ liệu thô" : "📄 Báo cáo chuẩn"}
            </span>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 cursor-pointer transition-all"
            >
              {isExporting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Xuất File ({selectedColumns.length} cột)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
