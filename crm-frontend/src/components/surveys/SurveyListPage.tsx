"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Gauge, Plus, RefreshCw } from "lucide-react";

import { surveyApi } from "@/apis/survey.api";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { useDebounce } from "@/hooks/useDebounce";
import { SurveyImportModal } from "@/components/surveys/SurveyImportModal";
import { SurveyLogsPanel } from "@/components/surveys/SurveyLogsPanel";
import { SurveyToolbar } from "@/components/surveys/SurveyToolbar";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  EMPTY_SURVEY_COLUMN_FILTERS,
  type SurveyColumnFilters,
  type SurveyEntrySource,
  type SurveyListParams,
  type SurveyLog,
  type SurveySendStatus,
} from "@/types/survey.type";
import { getErrorMessage } from "@/utils/error.util";
import { hasPermission } from "@/utils/permission.util";
import { ALL_TIME_FILTERS } from "@/utils/survey-period.util";

// Bảng đổ hết ra trang, không phân trang. 200 là trần backend cho một lượt;
// vượt qua thì panel nói rõ đang cắt bớt chứ không im lặng.
const MAX_ROWS = 200;

// Quyền nhập khảo sát, gán qua vai trò trong CSDL. Backend mới là nơi chặn
// thật; ẩn nút ở đây chỉ để người không có quyền khỏi bấm rồi nhận lỗi 403.
const SURVEY_ENTRY_PERMISSION = "SURVEY_ENTRY";

export function SurveyListPage() {
  const { currentUser } = useCurrentUserPermissions();
  const canEnterSurvey = hasPermission(currentUser, SURVEY_ENTRY_PERMISSION);

  const [rows, setRows] = useState<SurveyLog[]>([]);
  const [count, setCount] = useState(0);

  const [columnFilters, setColumnFilters] = useState<SurveyColumnFilters>(
    EMPTY_SURVEY_COLUMN_FILTERS
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const setFilter = useCallback(
    <K extends keyof SurveyColumnFilters>(
      key: K,
      value: SurveyColumnFilters[K]
    ) => setColumnFilters((current) => ({ ...current, [key]: value })),
    []
  );

  const clearFilters = useCallback(
    () => setColumnFilters(EMPTY_SURVEY_COLUMN_FILTERS),
    []
  );

  // Ô chữ gõ tới đâu gọi API tới đó thì mỗi ký tự là một lượt tải; ô chọn và
  // ô ngày thì đổi một phát nên áp dụng ngay.
  const textFilters = useMemo(
    () => ({
      customer: columnFilters.customer.trim(),
      phone: columnFilters.phone.trim(),
      ticket_code: columnFilters.ticketCode.trim(),
      created_by: columnFilters.createdBy.trim(),
    }),
    [
      columnFilters.createdBy,
      columnFilters.customer,
      columnFilters.phone,
      columnFilters.ticketCode,
    ]
  );

  const debouncedText = useDebounce(textFilters, 400);

  const filters = useMemo<SurveyListParams>(
    () => ({
      customer: debouncedText.customer || undefined,
      phone: debouncedText.phone || undefined,
      ticket_code: debouncedText.ticket_code || undefined,
      created_by: debouncedText.created_by || undefined,
      send_status: (columnFilters.sendStatus ||
        undefined) as SurveySendStatus | undefined,
      entry_source: (columnFilters.entrySource ||
        undefined) as SurveyEntrySource | undefined,
      rating: columnFilters.rating || undefined,
      start_date: columnFilters.startDate || undefined,
      end_date: columnFilters.endDate || undefined,
    }),
    [
      columnFilters.endDate,
      columnFilters.entrySource,
      columnFilters.rating,
      columnFilters.sendStatus,
      columnFilters.startDate,
      debouncedText,
    ]
  );

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const list = await surveyApi.list({
          ...filters,
          page_size: MAX_ROWS,
        });

        if (cancelled) return;

        setRows(list.results);
        setCount(list.count);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Không tải được danh sách khảo sát"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filterKey, filters, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "TRANG CHỦ", href: "/" }, { label: "Khảo sát" }]}
    >
      {/* Lọc nằm hết trên hàng lọc của bảng, giống màn ticket — thanh này chỉ
          còn tiêu đề và các nút thao tác. */}
      <SurveyToolbar
        filters={ALL_TIME_FILTERS}
        onChange={() => {}}
        showPeriodPicker={false}
        showFilterButtons={false}
        subtitle="Lịch sử gửi khảo sát. Lọc ngay trên từng cột của bảng."
        rightSlot={
          <>
            <Link
              href="/surveys/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Gauge size={13} className="text-emerald-600" />
              Dashboard CSAT
            </Link>

            <button
              type="button"
              onClick={reload}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={13} />
              Tải lại
            </button>

            {canEnterSurvey && (
              <>
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  Import Excel
                </button>

                <Link
                  href="/surveys/create"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00713d] px-3 text-xs font-bold text-white hover:bg-[#005c32]"
                >
                  <Plus size={13} />
                  Nhập khảo sát
                </Link>
              </>
            )}
          </>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <SurveyLogsPanel
        rows={rows}
        count={count}
        loading={loading}
        filters={columnFilters}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
      />

      {showImport && (
        <SurveyImportModal
          onClose={() => setShowImport(false)}
          onImported={reload}
        />
      )}
    </DashboardLayout>
  );
}
