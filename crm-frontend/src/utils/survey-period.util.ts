import type { SurveyGranularity } from "@/types/survey.type";

/**
 * Các kỳ để chọn trên dashboard khảo sát.
 *
 * Sinh từ ngày hiện tại chứ không hỏi backend: danh sách kỳ là lịch, không
 * phải dữ liệu, gọi thêm một API chỉ để biết tháng 6 đứng trước tháng 7 là
 * thừa.
 */
export const GRANULARITY_OPTIONS: Array<{
  value: SurveyGranularity;
  label: string;
}> = [
  { value: "month", label: "Tháng" },
  { value: "quarter", label: "Quý" },
  { value: "year", label: "Năm" },
];

const HOW_MANY: Record<SurveyGranularity, number> = {
  month: 24,
  quarter: 12,
  year: 5,
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

const VIETNAM_NOW = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
});

/**
 * Năm và tháng hiện tại **theo giờ Việt Nam**.
 *
 * Không dùng `new Date().getMonth()`: hàm đó lấy múi giờ của máy đang chạy,
 * mà trang này render cả ở server (UTC). Nửa đêm 01/09 giờ Việt Nam vẫn là
 * 17:30 ngày 31/08 giờ UTC, nên "tháng hiện tại" sẽ ra tháng 8 trong khi
 * lịch của người dùng đã sang tháng 9.
 */
function vietnamNow() {
  const parts: Record<string, string> = {};

  for (const part of VIETNAM_NOW.formatToParts(new Date())) {
    parts[part.type] = part.value;
  }

  return { year: Number(parts.year), month: Number(parts.month) };
}

export type PeriodOption = { code: string; label: string };

export function currentPeriodCode(granularity: SurveyGranularity): string {
  const { year, month } = vietnamNow();

  if (granularity === "year") return String(year);

  if (granularity === "quarter") {
    return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
  }

  return `${year}-${pad2(month)}`;
}

/** Danh sách kỳ, mới nhất đứng đầu. */
export function periodOptions(
  granularity: SurveyGranularity
): PeriodOption[] {
  const { year, month } = vietnamNow();
  const options: PeriodOption[] = [];

  for (let step = 0; step < HOW_MANY[granularity]; step += 1) {
    if (granularity === "year") {
      const value = year - step;
      options.push({ code: String(value), label: `Năm ${value}` });
      continue;
    }

    if (granularity === "quarter") {
      const index = year * 4 + Math.floor((month - 1) / 3) - step;
      const q = (index % 4) + 1;
      const y = Math.floor(index / 4);
      options.push({ code: `${y}-Q${q}`, label: `Quý ${q}/${y}` });
      continue;
    }

    const index = year * 12 + (month - 1) - step;
    const m = (index % 12) + 1;
    const y = Math.floor(index / 12);
    options.push({ code: `${y}-${pad2(m)}`, label: `Tháng ${pad2(m)}/${y}` });
  }

  return options;
}

/** Bộ lọc thời gian của màn khảo sát, cùng hình dạng với dashboard chatbot. */
export type SurveyFilters = {
  granularity: SurveyGranularity;
  /** Mã kỳ: `2026-06` | `2026-Q2` | `2026`. */
  period: string;
  /** Khoảng tự chọn — có đủ hai đầu thì thắng kỳ preset. */
  startDate: string;
  endDate: string;
};

/**
 * Bộ lọc mặc định: kỳ hiện tại theo mốc đang chọn.
 *
 * Là hàm chứ không phải hằng số — hằng số được tính đúng một lần lúc nạp
 * module, nên tab mở qua đêm giao tháng sẽ đứng lại ở tháng cũ, và bản render
 * ở server (UTC) có thể ra tháng khác bản chạy ở trình duyệt.
 */
export function defaultSurveyFilters(
  granularity: SurveyGranularity = "month"
): SurveyFilters {
  return {
    granularity,
    period: currentPeriodCode(granularity),
    startDate: "",
    endDate: "",
  };
}

/** Không giới hạn thời gian — màn danh sách mặc định hiện mọi khảo sát. */
export const ALL_TIME_FILTERS: SurveyFilters = {
  granularity: "month",
  period: "",
  startDate: "",
  endDate: "",
};

export function hasCustomRange(filters: SurveyFilters) {
  return Boolean(filters.startDate && filters.endDate);
}

export function hasTimeFilter(filters: SurveyFilters) {
  return hasCustomRange(filters) || Boolean(filters.period);
}

/**
 * Khoảng ngày cụ thể của bộ lọc, để lọc danh sách khảo sát.
 *
 * Dashboard vẫn nhận `granularity` + `period` chứ không nhận khoảng ngày
 * này: kỳ so sánh phải là "tháng liền trước" theo lịch, mà suy từ khoảng
 * ngày thì tháng 6 (30 ngày) sẽ so với 30 ngày trước đó tức 02-31/05, lệch
 * một ngày so với tháng 5 thật.
 */
export function windowOf(filters: SurveyFilters): {
  startDate: string;
  endDate: string;
} {
  if (hasCustomRange(filters)) {
    return { startDate: filters.startDate, endDate: filters.endDate };
  }

  const { granularity, period } = filters;

  // Không chọn kỳ nào thì không kèm mốc ngày — danh sách trả về toàn bộ.
  if (!period) {
    return { startDate: "", endDate: "" };
  }

  if (granularity === "year") {
    return { startDate: `${period}-01-01`, endDate: `${period}-12-31` };
  }

  if (granularity === "quarter") {
    const [year, quarter] = period.split("-Q").map(Number);
    const firstMonth = 3 * (quarter - 1) + 1;

    return {
      startDate: `${year}-${pad2(firstMonth)}-01`,
      endDate: lastDayOf(year, firstMonth + 2),
    };
  }

  const [year, month] = period.split("-").map(Number);

  return {
    startDate: `${year}-${pad2(month)}-01`,
    endDate: lastDayOf(year, month),
  };
}

function lastDayOf(year: number, month: number) {
  // Ngày 0 của tháng sau chính là ngày cuối tháng này — khỏi phải nhớ tháng
  // nào 30 hay 31 ngày và năm nhuận.
  const day = new Date(year, month, 0).getDate();

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Lùi/tiến một kỳ — hai nút ‹ › cạnh ô chọn kỳ. */
export function shiftPeriod(
  granularity: SurveyGranularity,
  code: string,
  step: number
): string {
  if (granularity === "year") {
    return String(Number(code) + step);
  }

  if (granularity === "quarter") {
    const [year, quarter] = code.split("-Q").map(Number);
    const index = year * 4 + (quarter - 1) + step;

    return `${Math.floor(index / 4)}-Q${(index % 4) + 1}`;
  }

  const [year, month] = code.split("-").map(Number);
  const index = year * 12 + (month - 1) + step;

  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** `2026-06-01` -> `01/06/2026`. */
export function formatIsoDate(value: string) {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}
