import { Search } from "lucide-react";

export function UserFilter({
  q,
  branch,
  department,
  online,
  onQChange,
  onBranchChange,
  onDepartmentChange,
  onOnlineChange,
  onSearch,
  onClear,
}: {
  q: string;
  branch: string;
  department: string;
  online: string;
  onQChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onOnlineChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
      <div className="col-span-12 md:col-span-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Từ khóa
        </label>

        <input
          value={q}
          onChange={(event) => onQChange(event.target.value)}
          placeholder="Tên, username, email, vai trò..."
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
        />
      </div>

      <div className="col-span-12 md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Chi nhánh
        </label>

        <input
          value={branch}
          onChange={(event) => onBranchChange(event.target.value)}
          placeholder="Chi nhánh"
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
        />
      </div>

      <div className="col-span-12 md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Phòng ban
        </label>

        <input
          value={department}
          onChange={(event) => onDepartmentChange(event.target.value)}
          placeholder="Phòng ban"
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
        />
      </div>

      <div className="col-span-12 md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Đang online
        </label>

        <select
          value={online}
          onChange={(event) => onOnlineChange(event.target.value)}
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
        >
          <option value="">Tất cả</option>
          <option value="yes">Có</option>
          <option value="no">Không</option>
        </select>
      </div>

      <div className="col-span-12 flex items-end gap-2 md:col-span-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 items-center gap-1 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
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