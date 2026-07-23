import type {
  CccDashboardParams,
  CccDashboardTicketItem,
} from "@/types/ccc-dashboard.type";

export const CCC_PENDING_TICKET_PAGE_SIZES = [5, 10, 20] as const;

export type CccPendingTicketPageSize =
  (typeof CCC_PENDING_TICKET_PAGE_SIZES)[number];

export type CccPendingTicketListParams = Omit<
  CccDashboardParams,
  "recent_limit" | "refresh"
> & {
  page?: number;
  page_size?: CccPendingTicketPageSize;
};

export type CccPendingTicketListResponse = {
  count: number;
  page: number;
  page_size: CccPendingTicketPageSize;
  total_pages: number;
  from_record: number;
  to_record: number;
  results: CccDashboardTicketItem[];
  date_from: string;
  date_to: string;
};
