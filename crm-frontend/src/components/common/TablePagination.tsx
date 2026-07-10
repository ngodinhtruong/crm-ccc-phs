import { ChevronLeft, ChevronRight } from "lucide-react";

export function TablePagination({
  fromRecord,
  toRecord,
  count,
  page,
  totalPages,
  loading,
  onPrevious,
  onNext,
}: {
  fromRecord: number;
  toRecord: number;
  count: number;
  page: number;
  totalPages: number;
  loading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const canPrevious = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-700">
      <span>
        {fromRecord} - {toRecord} / {" "}
        <span className="font-semibold">{count}</span>
      </span>

      <span className="text-slate-400">
        Trang {count === 0 ? 0 : page}/{count === 0 ? 0 : totalPages}
      </span>

      <button
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}