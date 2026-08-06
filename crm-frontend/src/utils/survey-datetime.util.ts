/**
 * Ngày và giờ gửi khảo sát do người nhập tự gõ.
 *
 * Ô `<input type="date">` ép đúng một định dạng và hay bắt bấm vào lịch,
 * trong khi người nhập đang chép "17/07/2026" và "08:55:06" từ file khảo sát
 * mở bên cạnh. Nhận chuỗi tự do rồi tự chuẩn hoá thì gõ nhanh hơn hẳn.
 */

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function buildDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // new Date(2026, 1, 31) tự trượt sang 03/03. Đối chiếu lại từng phần để
  // ngày không có thật như 31/02 bị loại thay vì âm thầm nhảy sang tháng sau.
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Chuỗi người nhập gõ -> `YYYY-MM-DD`, hoặc `null` nếu chưa đọc được. */
export function parseSurveyDate(text: string): string | null {
  const value = text.trim();

  if (!value) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);

  if (iso) {
    return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // dd/mm/yyyy và các biến thể dùng dấu - hoặc . để ngăn cách.
  const local = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(value);

  if (local) {
    return buildDate(Number(local[3]), Number(local[2]), Number(local[1]));
  }

  return null;
}

/** Chuỗi người nhập gõ -> `HH:MM:SS`, hoặc `null` nếu chưa đọc được. */
export function parseSurveyTime(text: string): string | null {
  const value = text.trim();

  if (!value) return null;

  const found = /^(\d{1,2})[:h](\d{1,2})(?:[:m](\d{1,2}))?$/.exec(value);

  if (!found) return null;

  const hour = Number(found[1]);
  const minute = Number(found[2]);
  const second = Number(found[3] ?? 0);

  if (hour > 23 || minute > 59 || second > 59) return null;

  return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

/** `YYYY-MM-DD` -> `YYYY-MM`, dùng làm phạm vi tìm ticket. */
export function monthOf(isoDate: string | null): string {
  return isoDate ? isoDate.slice(0, 7) : "";
}

/** `YYYY-MM-DD` -> `dd/mm/yyyy` để hiện lại cho người nhập đối chiếu. */
export function formatSurveyDate(isoDate: string | null): string {
  if (!isoDate) return "";

  const [year, month, day] = isoDate.split("-");

  return `${day}/${month}/${year}`;
}

/**
 * Giờ nghiệp vụ của khảo sát.
 *
 * Người nhập gõ giờ Việt Nam và phải đọc lại đúng giờ Việt Nam. Vẽ theo múi
 * giờ của máy (mặc định của `Date`) thì cùng một dòng khảo sát hiện ra khác
 * nhau tuỳ máy ai mở, và người nhập tưởng mình sửa giờ không ăn.
 */
const SURVEY_TIME_ZONE = "Asia/Ho_Chi_Minh";

const VN_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: SURVEY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Mốc ISO từ API -> các phần ngày/giờ theo giờ Việt Nam. */
function vietnamParts(value: string) {
  const moment = new Date(value);

  if (Number.isNaN(moment.getTime())) return null;

  const parts: Record<string, string> = {};

  for (const part of VN_PARTS.formatToParts(moment)) {
    parts[part.type] = part.value;
  }

  return parts;
}

/** Mốc `sent_at` từ API -> hai ô ngày và giờ để nạp lại vào form. */
export function splitSentAt(value?: string | null) {
  if (!value) return { date: "", time: "" };

  const parts = vietnamParts(value);

  if (!parts) return { date: "", time: "" };

  return {
    date: `${parts.day}/${parts.month}/${parts.year}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

/** Mốc `sent_at` từ API -> `dd/mm/yyyy hh:mm:ss` giờ Việt Nam để hiển thị. */
export function formatSurveyDateTime(value?: string | null) {
  if (!value) return "—";

  const parts = vietnamParts(value);

  if (!parts) return value;

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}
