import { KpiAdminEmployee } from "@/types/kpi.type";

export function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value?: string | number | null, digits = 0) {
  const numberValue = toNumber(value);

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(numberValue);
}

export function formatPercent(value?: string | number | null) {
  return `${formatNumber(value, 1)}%`;
}

export function getProfileLabel(profileCode?: string | null) {
  if (profileCode === "ALL") return "Tất cả";
  if (profileCode === "SA") return "KPI SA";
  if (profileCode === "SA_SUP") return "KPI SUP";
  return profileCode || "-";
}

export function getEmployeeName(employee?: KpiAdminEmployee | null) {
  if (!employee) return "-";
  return employee.full_name || employee.username || employee.email || `User ${employee.id}`;
}

export function getRoleBadgeLabel(roleType?: string | null) {
  if (roleType === "SUP") return "SUP";
  return "SA";
}

function buildInitials(value: string) {
  const words = value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return "KPI";

  const initials = words
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials.slice(0, 5);
}

export function getMetricShortName(
  metricName?: string | null,
  metricCode?: string | null,
  groupCode?: string | null
) {
  const name = String(metricName || "").trim();
  const code = String(metricCode || "").trim();
  const group = String(groupCode || "").trim();
  const source = `${code} ${name}`.toLowerCase();

  if (!name && !code) return group || "KPI";

  if (source.includes("icp")) return "ICP";
  if (source.includes("aar") || source.includes("tái")) return "AAR";
  if (source.includes("ltv")) return "LTV";
  if (source.includes("referral") || source.includes("giới thiệu")) return "REF";
  if (source.includes("cskh") || source.includes("hỗ trợ")) return "CSKH";
  if (source.includes("sản phẩm") || source.includes("sp mới")) return "SP";
  if (source.includes("chuyển đổi")) return "CĐ";
  if (source.includes("liên lạc")) return "LL";
  if (source.includes("gọi") || source.includes("kh gọi")) return "CALL";
  if (code) return code.replace(/^[A-Z]\d+[_-]?/i, "").slice(0, 6).toUpperCase() || code.slice(0, 6).toUpperCase();

  return buildInitials(name);
}
