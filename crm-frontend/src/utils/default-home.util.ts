import { CurrentUser } from "@/types/account.type";
import { getDefaultPathByWorkspace, WorkspaceCode } from "@/utils/workspace.util";

const SA_OR_SUP_ROLE_CODES = new Set([
  "SA",
  "SA_STAFF",
  "SALE_ADMIN_STAFF",
  "SA_SUP",
  "SA_SUPERVISOR",
  "SALE_ADMIN_SUPERVISOR",
]);

const SA_OR_SUP_PERMISSION_CODES = new Set([
  "SA_KPI_VIEW_SELF",
  "SA_KPI_VIEW_BRANCH",
  "KPI_DASHBOARD_VIEW_SELF",
  "KPI_DASHBOARD_VIEW_BRANCH",
]);

const GLOBAL_ADMIN_ROLE_CODES = new Set([
  "SYSTEM_ADMIN",
  "ADMIN",
  "SA_ADMIN",
  "BOM",
]);

function getRoleCodes(user?: CurrentUser | null): string[] {
  if (!user) return [];

  const fromRoleCodes = user.role_codes || [];
  const fromRoles = user.roles?.map((role) => role.role_code).filter(Boolean) || [];

  return Array.from(new Set([...fromRoleCodes, ...fromRoles]));
}

function getPermissionCodes(user?: CurrentUser | null): string[] {
  if (!user) return [];

  const fromPermissionCodes = user.permission_codes || [];
  const fromPermissions =
    user.permissions?.map((permission) => permission.permission_code).filter(Boolean) || [];

  return Array.from(new Set([...fromPermissionCodes, ...fromPermissions]));
}

export function isSystemOrGlobalAdmin(user?: CurrentUser | null): boolean {
  if (!user) return false;

  const roleCodes = getRoleCodes(user);

  return Boolean(
    user.is_superuser ||
      user.is_global_admin ||
      roleCodes.some((roleCode) => GLOBAL_ADMIN_ROLE_CODES.has(roleCode))
  );
}

export function isSaleAdminKpiHomeUser(user?: CurrentUser | null): boolean {
  if (!user || isSystemOrGlobalAdmin(user)) return false;

  const groups = user.accessible_groups || [];
  const roleCodes = getRoleCodes(user);
  const permissionCodes = getPermissionCodes(user);

  const hasSaOrSupRole = roleCodes.some((roleCode) => SA_OR_SUP_ROLE_CODES.has(roleCode));
  const hasSaOrSupKpiPermission = permissionCodes.some((permissionCode) =>
    SA_OR_SUP_PERMISSION_CODES.has(permissionCode)
  );

  return groups.includes("SALE_ADMIN") && (hasSaOrSupRole || hasSaOrSupKpiPermission);
}

export function getDefaultHomePath(user?: CurrentUser | null): string {
  if (!user) return "/login";

  if (isSystemOrGlobalAdmin(user)) {
    return "/ccc/dashboard";
  }

  if (isSaleAdminKpiHomeUser(user)) {
    return "/sale-admin/kpis/personal";
  }

  const groups = user.accessible_groups || [];

  if (groups.includes("CCC")) {
    return "/ccc/dashboard";
  }

  if (groups.includes("SALE_ADMIN")) {
    return getDefaultPathByWorkspace("SALE_ADMIN");
  }

  return "/ccc/dashboard";
}

export function getDefaultWorkspaceByUser(user?: CurrentUser | null): WorkspaceCode {
  const defaultHomePath = getDefaultHomePath(user);

  if (defaultHomePath.startsWith("/sale-admin")) {
    return "SALE_ADMIN";
  }

  return "CCC";
}

export function getDefaultPathForWorkspaceByUser(
  workspace: WorkspaceCode,
  user?: CurrentUser | null
): string {
  if (workspace === "SALE_ADMIN" && isSaleAdminKpiHomeUser(user)) {
    return "/sale-admin/kpis/personal";
  }

  return getDefaultPathByWorkspace(workspace);
}
