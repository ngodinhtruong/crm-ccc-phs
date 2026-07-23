"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { TablePagination } from "@/components/common/TablePagination";
import { cccDashboardTicketService } from "@/services/ccc-dashboard-ticket.service";
import type {
  CccDashboardParams,
  CccDashboardTicketItem,
} from "@/types/ccc-dashboard.type";
import {
  CCC_PENDING_TICKET_PAGE_SIZES,
  type CccPendingTicketListResponse,
  type CccPendingTicketPageSize,
} from "@/types/ccc-dashboard-ticket-table.type";
import { getErrorMessage } from "@/utils/error.util";
import { formatDate } from "./CccDashboardUtils";

function TableCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

function MessageRow({
  colSpan,
  text,
  tone = "default",
}: {
  colSpan: number;
  text: string;
  tone?: "default" | "error";
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`h-24 text-center text-xs ${
          tone === "error" ? "text-red-600" : "text-slate-500"
        }`}
      >
        {text}
      </td>
    </tr>
  );
}

function normalizeFilters(filters?: CccDashboardParams) {
  if (!filters) {
    return {};
  }

  const {
    recent_limit: _recentLimit,
    refresh: _refresh,
    ...requestFilters
  } = filters;

  return requestFilters;
}

type TicketListTableProps = {
  title: string;
  description: string;

  /**
   * Chế độ tương thích cũ:
   * dữ liệu đã có sẵn từ dashboard cha và được phân trang ở frontend.
   */
  items?: CccDashboardTicketItem[];

  /**
   * Chế độ Dashboard CCC:
   * bảng tự gọi API phân trang riêng theo bộ lọc.
   */
  filters?: CccDashboardParams;
  refreshKey?: string | null;
};

export function TicketListTable({
  title,
  description,
  items = [],
  filters,
  refreshKey,
}: TicketListTableProps) {
  const router = useRouter();
  const requestSequenceRef = useRef(0);

  const isServerPagination = Boolean(filters);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<CccPendingTicketPageSize>(10);
  const [data, setData] = useState<CccPendingTicketListResponse | null>(null);
  const [loading, setLoading] = useState(isServerPagination);
  const [error, setError] = useState("");

  const requestFilters = useMemo(
    () => normalizeFilters(filters),
    [filters]
  );
  const filterKey = useMemo(
    () => JSON.stringify(requestFilters),
    [requestFilters]
  );

  useEffect(() => {
    setPage(1);
  }, [filterKey, items.length, isServerPagination]);

  useEffect(() => {
    if (!isServerPagination) {
      setLoading(false);
      setError("");
      setData(null);
      return;
    }

    const controller = new AbortController();
    const sequence = ++requestSequenceRef.current;

    async function loadPendingTickets() {
      setLoading(true);
      setError("");

      try {
        const response = await cccDashboardTicketService.getPendingTickets(
          {
            ...requestFilters,
            page,
            page_size: pageSize,
          },
          controller.signal
        );

        if (
          controller.signal.aborted ||
          sequence !== requestSequenceRef.current
        ) {
          return;
        }

        setData(response);

        if (response.page !== page) {
          setPage(response.page);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          sequence !== requestSequenceRef.current
        ) {
          return;
        }

        setError(
          getErrorMessage(err, "Không tải được danh sách Ticket chưa xử lý")
        );
      } finally {
        if (
          !controller.signal.aborted &&
          sequence === requestSequenceRef.current
        ) {
          setLoading(false);
        }
      }
    }

    void loadPendingTickets();

    return () => controller.abort();
  }, [
    filterKey,
    isServerPagination,
    page,
    pageSize,
    refreshKey,
    requestFilters,
  ]);

  const localCount = items.length;
  const localTotalPages =
    localCount === 0 ? 0 : Math.ceil(localCount / pageSize);

  useEffect(() => {
    if (isServerPagination || localTotalPages === 0) {
      return;
    }

    if (page > localTotalPages) {
      setPage(localTotalPages);
    }
  }, [isServerPagination, localTotalPages, page]);

  const visibleItems = useMemo(() => {
    if (isServerPagination) {
      return data?.results || [];
    }

    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [data?.results, isServerPagination, items, page, pageSize]);

  const count = isServerPagination ? data?.count || 0 : localCount;
  const totalPages = isServerPagination
    ? data?.total_pages || 0
    : localTotalPages;
  const currentPage = isServerPagination ? data?.page || page : page;

  const fromRecord = isServerPagination
    ? data?.from_record || 0
    : count === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const toRecord = isServerPagination
    ? data?.to_record || 0
    : Math.min(currentPage * pageSize, count);

  const changePageSize = (value: number) => {
    if (
      !CCC_PENDING_TICKET_PAGE_SIZES.includes(
        value as CccPendingTicketPageSize
      )
    ) {
      return;
    }

    setPageSize(value as CccPendingTicketPageSize);
    setPage(1);
  };

  const showInitialLoading =
    isServerPagination && loading && !data;
  const showBlockingError =
    isServerPagination && !loading && Boolean(error) && !data;
  const showEmpty =
    !showInitialLoading &&
    !showBlockingError &&
    visibleItems.length === 0;

  return (
    <TableCard title={title} description={description}>
      <div
        className="max-h-[256px] overflow-auto overscroll-contain"
        aria-busy={loading}
      >
        <table className="w-full min-w-[1120px] table-fixed text-left text-xs">
          <thead className="sticky top-0 z-10 border-b bg-[#f8fafc] text-slate-600 shadow-sm">
            <tr className="h-9">
              <th className="w-[130px] px-3 py-2 font-semibold">Mã Ticket</th>
              <th className="w-[170px] px-3 py-2 font-semibold">Chi nhánh xử lý</th>
              <th className="w-[160px] px-3 py-2 font-semibold">Phân loại</th>
              <th className="w-[180px] px-3 py-2 font-semibold">Công ty</th>
              <th className="w-[130px] px-3 py-2 font-semibold">Tình trạng</th>
              <th className="w-[240px] px-3 py-2 font-semibold">Mô tả</th>
              <th className="w-[150px] px-3 py-2 font-semibold">Nguồn Ticket</th>
              <th className="w-[120px] px-3 py-2 font-semibold">Ngày tạo</th>
            </tr>
          </thead>

          <tbody>
            {showInitialLoading && (
              <MessageRow colSpan={8} text="Đang tải danh sách Ticket..." />
            )}

            {showBlockingError && (
              <MessageRow colSpan={8} text={error} tone="error" />
            )}

            {showEmpty && (
              <MessageRow colSpan={8} text="Chưa có ticket trong kỳ." />
            )}

            {visibleItems.map((item) => (
              <tr
                key={item.id}
                onClick={() => router.push(`/tickets/${item.id}`)}
                className="h-11 cursor-pointer border-b border-slate-100 transition-colors hover:bg-sky-50"
              >
                <td className="px-3 py-3 font-semibold text-sky-600">
                  {item.ticket_code || `#${item.id}`}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.handling_branch_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.category_name || "-"}
                </td>
                <td className="px-3 py-3 font-semibold text-slate-700">
                  {item.company_name || item.customer_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.status_name || "-"}
                </td>
                <td
                  className="max-w-[200px] truncate px-3 py-3 text-slate-600"
                  title={item.title || ""}
                >
                  {item.title || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.source_name || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatDate(item.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        {isServerPagination && error && data && (
          <p className="mb-2 text-xs text-red-600">{error}</p>
        )}

        <TablePagination
          fromRecord={fromRecord}
          toRecord={toRecord}
          count={count}
          page={currentPage}
          totalPages={totalPages}
          loading={loading}
          pageSize={pageSize}
          pageSizeOptions={CCC_PENDING_TICKET_PAGE_SIZES}
          onPageSizeChange={changePageSize}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() =>
            setPage((current) =>
              Math.min(totalPages || current, current + 1)
            )
          }
        />

        {isServerPagination && loading && data && (
          <p className="mt-2 text-[11px] text-sky-600">
            Đang cập nhật trang dữ liệu...
          </p>
        )}
      </div>
    </TableCard>
  );
}