import { MasterOption } from "@/types/ticket.type";

export function getTicketOptionName(
  option: MasterOption,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = option[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback || String(option.id);
}

export function getAccountNumber(option?: {
  account_number?: string | null;
  account_no?: string | null;
}) {
  return option?.account_number || option?.account_no || "";
}

export function getContactTypeByAccount(accountNumber?: string | null) {
  return accountNumber ? "HAS_ACCOUNT" : "NO_ACCOUNT";
}

export function getContactTypeLabel(value: string) {
  if (value === "HAS_ACCOUNT") return "KH có tài khoản";
  if (value === "NO_ACCOUNT") return "KH không có tài khoản";

  return "-";
}