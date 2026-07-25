export type WorkspaceCode = "CCC" | "SALE_ADMIN";

const WORKSPACE_KEY = "crm_active_workspace";

export function getActiveWorkspace(): WorkspaceCode | null {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(WORKSPACE_KEY);

  if (value === "CCC" || value === "SALE_ADMIN") {
    return value;
  }

  return null;
}

export function setActiveWorkspace(value: WorkspaceCode) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(WORKSPACE_KEY, value);
}

export function clearActiveWorkspace() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(WORKSPACE_KEY);
}

export function getDefaultPathByWorkspace(workspace: WorkspaceCode) {
  if (workspace === "SALE_ADMIN") {
    return "/sale-admin/dashboard";
  }

  return "/tickets/dashboard";
}