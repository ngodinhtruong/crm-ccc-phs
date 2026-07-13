import { BranchOption, SelectOption } from "@/types/customer.type";

export function getOptionName(
  option: SelectOption,
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

export function getBranchName(branch: BranchOption): string {
  return branch.branch_name || branch.name || `Chi nhánh ${branch.id}`;
}