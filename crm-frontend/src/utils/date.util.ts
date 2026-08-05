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
export type DateRangeValue = {
  dateFrom: string;
  dateTo: string;
};

export function getCurrentMonthDateRange(
  referenceDate = new Date()
): DateRangeValue {
  const firstDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );
  const lastDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  );

  return {
    dateFrom: formatDateInput(firstDay),
    dateTo: formatDateInput(lastDay),
  };
}

export function getYearToCurrentMonthDateRange(
  referenceDate = new Date()
): DateRangeValue {
  const firstDayOfYear = new Date(referenceDate.getFullYear(), 0, 1);
  const lastDayOfCurrentMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  );

  return {
    dateFrom: formatDateInput(firstDayOfYear),
    dateTo: formatDateInput(lastDayOfCurrentMonth),
  };
}

export function getLast5MonthsDateRange(
  referenceDate = new Date()
): DateRangeValue {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - 4,
    1
  );

  return {
    dateFrom: formatDateInput(start),
    dateTo: formatDateInput(referenceDate),
  };
}

export function getYearToCurrentDateRange(
  referenceDate = new Date()
): DateRangeValue {
  return getLast5MonthsDateRange(referenceDate);
}
