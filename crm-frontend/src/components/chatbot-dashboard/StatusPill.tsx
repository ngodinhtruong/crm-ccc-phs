export function StatusPill({
  value,
  label,
}: {
  value?: string | null;
  label?: string | null;
}) {
  const display = label || value || "-";

  if (value === "CCC") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">
        {display}
      </span>
    );
  }

  if (value === "BOT_DONE") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
        {display}
      </span>
    );
  }

  if (value === "SPAM" || value === "TIMEOUT") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">
        {display}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
      {display}
    </span>
  );
}