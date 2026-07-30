import { Search } from "lucide-react";

export function CompanyFilter({
  q,
  status,
  onQChange,
  onStatusChange,
  onSearch,
  onClear,
}: {
  q: string;
  status: string;
  onQChange: (value: string) => void;
  onStatusChange: (value: string) => void;
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
          placeholder="Tên công ty, email, mã số thuế, số tài khoản..."
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
        />
      </div>

      <div className="col-span-12 md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Tình trạng
        </label>

        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
        >
          <option value="">Tất cả</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>
      </div>

      <div className="col-span-12 flex items-end gap-2 md:col-span-6">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 items-center gap-1 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669]"
        >
          <Search size={14} />
          Tìm kiếm
        </button>

        <button
          type="button"
          onClick={onClear}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Xóa lọc
        </button>
      </div>
    </div>
  );
}