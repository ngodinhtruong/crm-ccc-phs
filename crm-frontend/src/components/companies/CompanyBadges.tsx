export function CompanyStatusBadge({ value }: { value?: string | null }) {
  if (value === "ACTIVE" || value === "Đang hoạt động") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Đang hoạt động
      </span>
    );
  }

  if (value === "INACTIVE" || value === "Ngừng hoạt động") {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Ngừng hoạt động
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {value || "-"}
    </span>
  );
}