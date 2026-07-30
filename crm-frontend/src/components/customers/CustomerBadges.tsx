export function CustomerStatusBadge({ value }: { value?: string | null }) {
  const label = value || "-";

  if (label === "Chính thức" || label === "ACTIVE") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Chính thức
      </span>
    );
  }

  if (label === "Ngừng hoạt động" || label === "INACTIVE") {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Ngừng hoạt động
      </span>
    );
  }

  if (label === "Tiềm năng" || label === "POTENTIAL") {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Tiềm năng
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {label}
    </span>
  );
}

export function CustomerVipBadge({ value }: { value?: string | null }) {
  return (
    <span className="inline-flex max-w-[130px] truncate rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      {value || "Khách thường"}
    </span>
  );
}