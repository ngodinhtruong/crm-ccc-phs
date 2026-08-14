import { ChevronLeft, ChevronRight } from "lucide-react";

export function TablePagination({
  fromRecord,
  toRecord,
  count,
  page,
  totalPages,
  loading,
  pageSize,
  pageSizeOptions = [5, 10, 20],
  onPageSizeChange,
  onPrevious,
  onNext,
  simplified = false,
  hidePageSizeSelect = false,
  hideRecordSummary = false,
}: {
  fromRecord: number;
  toRecord: number;
  count: number;
  page: number;
  totalPages: number;
  loading?: boolean;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  simplified?: boolean;
  hidePageSizeSelect?: boolean;
  hideRecordSummary?: boolean;
}) {
  const canPrevious = page > 1 && !loading;
  const canNext = page < totalPages && !loading;
  const showSelect =
    !simplified &&
    !hidePageSizeSelect &&
    typeof pageSize === "number" &&
    typeof onPageSizeChange === "function";
  const showSummary = !simplified && !hideRecordSummary;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
      <div className="flex flex-wrap items-center gap-3">
        {showSelect && (
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
              disabled={loading}
              className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              aria-label="Số dòng hiển thị trên mỗi trang"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-slate-500">dòng</span>
          </label>
        )}

        {showSummary && (
          <span>
            {fromRecord} - {toRecord} /{" "}
            <span className="font-semibold">{count}</span>
          </span>
        )}

        <span className="text-slate-500 font-medium">
          Trang {count === 0 ? 0 : page}/{count === 0 ? 0 : totalPages}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious}
          className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang trước"
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang sau"
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
