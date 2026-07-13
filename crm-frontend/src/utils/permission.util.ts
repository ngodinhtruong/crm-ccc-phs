import { CurrentUser } from "@/types/account.type";

export const PermissionCode = {
  SA_RECORD_VIEW: "SA_RECORD_VIEW",
  SA_RECORD_CREATE: "SA_RECORD_CREATE",
  SA_RECORD_UPDATE: "SA_RECORD_UPDATE",
  SA_RECORD_DELETE: "SA_RECORD_DELETE",
  SA_RECORD_IMPORT: "SA_RECORD_IMPORT",
  SA_RECORD_AUDIT_VIEW: "SA_RECORD_AUDIT_VIEW",

  SA_KPI_VIEW_SELF: "SA_KPI_VIEW_SELF",
  SA_KPI_VIEW_BRANCH: "SA_KPI_VIEW_BRANCH",
  SA_KPI_CONFIG: "SA_KPI_CONFIG",
  SA_DASHBOARD_VIEW: "SA_DASHBOARD_VIEW",

  CUSTOMER_360_VIEW: "CUSTOMER_360_VIEW",
} as const;

export type PermissionCodeValue =
  (typeof PermissionCode)[keyof typeof PermissionCode];

export function getPermissionCodes(user?: CurrentUser | null): string[] {
  if (!user) return [];

  const fromPermissionCodes = user.permission_codes || [];

  const fromPermissions =
    user.permissions?.map((item) => item.permission_code).filter(Boolean) || [];

  return Array.from(new Set([...fromPermissionCodes, ...fromPermissions]));
}

export function getRoleCodes(user?: CurrentUser | null): string[] {
  if (!user) return [];

  const fromRoleCodes = user.role_codes || [];

  const fromRoles = user.roles?.map((item) => item.role_code).filter(Boolean) || [];

  return Array.from(new Set([...fromRoleCodes, ...fromRoles]));
}

export function hasPermission(
  user: CurrentUser | null | undefined,
  permissionCode: PermissionCodeValue | string
) {
  if (!user) return false;

  if (user.is_superuser || user.is_global_admin) {
    return true;
  }

  return getPermissionCodes(user).includes(permissionCode);
}

export function hasAnyPermission(
  user: CurrentUser | null | undefined,
  permissionCodes: Array<PermissionCodeValue | string>
) {
  return permissionCodes.some((code) => hasPermission(user, code));
}

export function hasRole(
  user: CurrentUser | null | undefined,
  roleCode: string
) {
  if (!user) return false;

  if (user.is_superuser || user.is_global_admin) {
    return true;
  }

  return getRoleCodes(user).includes(roleCode);
}