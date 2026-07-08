export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

export function getStartOfWeek(date: Date) {
  const cloned = new Date(date);
  const day = cloned.getDay();

  // Tuần bắt đầu từ thứ 2
  const diff = day === 0 ? -6 : 1 - day;

  cloned.setDate(cloned.getDate() + diff);

  return cloned;
}