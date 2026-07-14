export function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumber(value?: string | number | null, fallback = "-") {
  const parsed = toNumber(value);
  if (parsed === null) return fallback;

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getFailedGateText(value?: string[] | string | null) {
  if (!value) return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return value || "-";
}

export function getEmployeeName(item: {
  employee_name?: string | null;
  user_username?: string | null;
  user_email?: string | null;
  user: number;
}) {
  return item.employee_name || item.user_username || item.user_email || `User ${item.user}`;
}
