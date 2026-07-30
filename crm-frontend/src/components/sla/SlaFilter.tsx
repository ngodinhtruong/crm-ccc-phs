import { Search } from "lucide-react";

export function SlaFilter({
  q,
  ticketCategory,
  processingUnit,
  onQChange,
  onTicketCategoryChange,
  onProcessingUnitChange,
  onSearch,
  onClear,
}: {
  q: string;
  ticketCategory: string;
  processingUnit: string;
  onQChange: (value: string) => void;
  onTicketCategoryChange: (value: string) => void;
  onProcessingUnitChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
      <div className="col-span-12 md:col-span-4">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Từ khóa
        </label>

        <input
          value={q}
          onChange={(event) => onQChange(event.target.value)}
          placeholder="Tên SLA, mã SLA, mô tả..."
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
        />
      </div>

      <div className="col-span-12 md:col-span-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Danh mục Ticket
        </label>

        <input
          value={ticketCategory}
          onChange={(event) => onTicketCategoryChange(event.target.value)}
          placeholder="Danh mục Ticket"
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
        />
      </div>

      <div className="col-span-12 md:col-span-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Phân công xử lý
        </label>

        <input
          value={processingUnit}
          onChange={(event) => onProcessingUnitChange(event.target.value)}
          placeholder="Đơn vị xử lý"
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
        />
      </div>

      <div className="col-span-12 flex items-end gap-2 md:col-span-2">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 items-center gap-1 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669]"
        >
          <Search size={14} />
          Tìm
        </button>

        <button
          type="button"
          onClick={onClear}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}