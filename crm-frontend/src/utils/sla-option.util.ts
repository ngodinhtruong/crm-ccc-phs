import { SlaSelectOption } from "@/types/sla.type";

export function getSlaOptionName(
  option: SlaSelectOption,
  keys: string[],
  fallback = ""
): string {
  for (const key of keys) {
    const value = option[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback || String(option.id);
}