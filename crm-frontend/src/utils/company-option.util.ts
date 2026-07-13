import { SelectOption } from "@/types/company.type";

export function getCompanyOptionName(
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

export function getEmployeeLabel(option: SelectOption): string {
  const name = getCompanyOptionName(option, [
    "full_name",
    "employee_name",
    "name",
    "username",
  ]);

  const employeeCode = option["employee_code"];
  const branchName = option["branch_name"];

  const code =
    employeeCode !== undefined && employeeCode !== null
      ? ` - ${String(employeeCode)}`
      : "";

  const branch =
    branchName !== undefined && branchName !== null
      ? ` (${String(branchName)})`
      : "";

  return `${name}${code}${branch}`;
}

export function getEmployeeMeta(option: SelectOption): string {
  return (
    [
      option["employee_code"],
      option["branch_name"],
      option["department"],
      option["position"],
    ]
      .filter((item) => item !== undefined && item !== null && String(item) !== "")
      .map((item) => String(item))
      .join(" · ") || "Nhân viên"
  );
}