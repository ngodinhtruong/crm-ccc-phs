"use client";

import Link from "next/link";
import { useState, type ElementType } from "react";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileBarChart,
  FileCheck2,
  FileSpreadsheet,
  Folder,
  Gauge,
  Globe,
  Headphones,
  Inbox,
  Mail,
  MailCheck,
  Megaphone,
  Menu,
  MessageSquare,
  MessagesSquare,
  PhoneCall,
  Pin,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  UserCog,
  Users,
  UsersRound,
  X,
  BotMessageSquare,
} from "lucide-react";

import {
  WORKSPACE_LABEL,
  type WorkspaceCode,
} from "@/constants/workspace-navigation.constant";
import type { CurrentUser } from "@/types/account.type";
import { setActiveWorkspace } from "@/utils/workspace.util";

type MainNavigationDrawerProps = {
  open: boolean;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  activeWorkspace: WorkspaceCode;
  currentUser?: CurrentUser | null;
};

type PanelKey =
  | "customers"
  | "surveys"
  | "tickets"
  | "external_errors"
  | "ekyc"
  | "failed_ekyc"
  | "reports"
  | "utilities"
  | "settings"
  | "sa_records"
  | "sa_kpi"
  | "sa_import"
  | "sa_system";

type MainMenuItem = {
  title: string;
  href: string;
  icon: ElementType;
  panel?: PanelKey;
  adminOnly?: boolean;
  kpiUserOnly?: boolean;
  cccOrAdminOnly?: boolean;
  saOrSupOnly?: boolean;
  permissionCode?: string;
};

type PanelGroup = {
  title: string;
  items: {
    title: string;
    href: string;
    icon: ElementType;
    adminOnly?: boolean;
    kpiUserOnly?: boolean;
    cccOrAdminOnly?: boolean;
    saOrSupOnly?: boolean;
    permissionCode?: string;
  }[];
};

const WORKSPACE_ORDER: WorkspaceCode[] = ["CCC", "SALE_ADMIN"];

const mainMenuItemsByWorkspace: Record<WorkspaceCode, MainMenuItem[]> = {
  CCC: [
    // {
    //   title: "DASHBOARD TỔNG HỢP",
    //   href: "/dashboard",
    //   icon: BarChart3,
    // },
    {
      title: "DASHBOARD CCC",
      href: "/ccc/dashboard",
      icon: Gauge,
    },
    {
      title: "CHATBOTS",
      href: "/chatbots/dashboard",
      icon: BotMessageSquare,
    },

    {
      title: "CSKH",
      href: "/tickets",
      icon: Headphones,
      panel: "tickets",
    },
    {
      title: "LỖI BÊN NGOÀI",
      href: "/external-errors/dashboard",
      icon: AlertTriangle,
      panel: "external_errors",
    },
    {
      title: "KHẢO SÁT",
      href: "/surveys",
      icon: ClipboardList,
      panel: "surveys",
    },
    {
      title: "QUẢN LÝ eKYC",
      href: "/ekyc/dashboard",
      icon: ShieldCheck,
      panel: "ekyc",
    },
    {
      title: "FAILED eKYC",
      href: "/failed-ekyc/dashboard",
      icon: AlertTriangle,
      panel: "failed_ekyc",
      cccOrAdminOnly: true,
    },
    // {
    //   title: "BÁO CÁO",
    //   href: "/reports",
    //   icon: BarChart3,
    //   panel: "reports",
    // },
    // {
    //   title: "TIỆN ÍCH",
    //   href: "/utilities",
    //   icon: BriefcaseBusiness,
    //   panel: "utilities",
    // },
    // {
    //   title: "CẤU HÌNH",
    //   href: "/settings",
    //   icon: Settings,
    //   panel: "settings",
    // },
  ],

  SALE_ADMIN: [
    {
      title: "DASHBOARD SALE ADMIN",
      href: "/sale-admin/dashboard",
      icon: Gauge,
      permissionCode: "SA_DASHBOARD_VIEW",
    },
    {
      title: "KPI CÁ NHÂN",
      href: "/sale-admin/kpis/personal",
      icon: Target,
      saOrSupOnly: true,
    },
    {
      title: "SA RECORD",
      href: "/sale-admin/records",
      icon: ClipboardList,
    },
    // {
    //   title: "KPI",
    //   href: "/sale-admin/kpi",
    //   icon: Target,
    //   panel: "sa_kpi",
    // },
    {
      title: "KPI ADMIN",
      href: "/sale-admin/kpis/admin",
      icon: BarChart3,
      adminOnly: true,
    },
    {
      title: "CẤU HÌNH KPI",
      href: "/sale-admin/kpis/config",
      icon: FileCheck2,
      adminOnly: true,
    },
    // {
    //   title: "IMPORT",
    //   href: "/sale-admin/import",
    //   icon: FileSpreadsheet,
    //   panel: "sa_import",
    // },
  ],
};

const panelGroupsByWorkspace: Record<
  WorkspaceCode,
  Partial<Record<PanelKey, PanelGroup[]>>
> = {
  CCC: {
    customers: [
      {
        title: "KHÁCH HÀNG",
        items: [
          {
            title: "Khách hàng",
            href: "/customers",
            icon: Users,
          },
          {
            title: "Công ty",
            href: "/companies",
            icon: Building2,
          },
        ],
      },
    ],

    surveys: [
      {
        title: "KHẢO SÁT",
        items: [
          {
            title: "Kết quả khảo sát",
            href: "/surveys",
            icon: ClipboardList,
          },
          {
            title: "Dashboard CSAT",
            href: "/surveys/dashboard",
            icon: Gauge,
          },
        ],
      },
    ],


    tickets: [
      {
        title: "CSKH",
        items: [
          {
            title: "Dashboard CCC",
            href: "/ccc/dashboard",
            icon: Gauge,
          },
          {
            title: "Ticket",
            href: "/tickets",
            icon: FileCheck2,
          },
          // {
          //   title: "Chatbots",
          //   href: "/chatbots/dashboard",
          //   icon: BotMessageSquare,
          // },
          // {
          //   title: "Kho kiến thức",
          //   href: "/knowledge-base",
          //   icon: CircleHelp,
          // },
          // {
          //   title: "Lịch sử phản hồi",
          //   href: "/feedback-history",
          //   icon: MessagesSquare,
          // },
          {
            title: "Danh mục SLA",
            href: "/sla",
            icon: CalendarDays,
          },
          // {
          //   title: "Lịch sử cuộc gọi",
          //   href: "/calls",
          //   icon: PhoneCall,
          // },
          // {
          //   title: "Theo dõi sự cố",
          //   href: "/incidents",
          //   icon: AlertTriangle,
          // },
          // {
          //   title: "Lịch sử SMS/OTT",
          //   href: "/sms-history",
          //   icon: MessageSquare,
          // },
        ],
      },
    ],

    external_errors: [
      {
        title: "LỖI BÊN NGOÀI",
        items: [
          {
            title: "Dashboard lỗi",
            href: "/external-errors/dashboard",
            icon: BarChart3,
          },
          {
            title: "Danh sách lỗi",
            href: "/external-errors",
            icon: ClipboardList,
          },
          {
            title: "Thêm lỗi",
            href: "/external-errors/create",
            icon: FileCheck2,
            permissionCode: "EXTERNAL_ERROR_MANAGE",
          },
          {
            title: "Import Excel",
            href: "/external-errors/import",
            icon: FileSpreadsheet,
            permissionCode: "EXTERNAL_ERROR_IMPORT",
          },
          {
            title: "Nhóm lỗi - Mã lỗi",
            href: "/external-errors/error-catalogs",
            icon: Settings,
            permissionCode: "EXTERNAL_ERROR_MANAGE",
          },
        ],
      },
    ],

    ekyc: [
      {
        title: "QUẢN LÝ eKYC",
        items: [
          {
            title: "Dashboard eKYC",
            href: "/ekyc/dashboard",
            icon: BarChart3,
          },
          {
            title: "Danh sách eKYC",
            href: "/ekyc",
            icon: ClipboardList,
          },
          {
            title: "Nhập eKYC mới",
            href: "/ekyc/create",
            icon: FileCheck2,
          },
          {
            title: "Import Excel",
            href: "/ekyc/import",
            icon: FileSpreadsheet,
          },
        ],
      },
    ],

    failed_ekyc: [
      {
        title: "FAILED eKYC",
        items: [
          { title: "Dashboard Failed eKYC", href: "/failed-ekyc/dashboard", icon: BarChart3, cccOrAdminOnly: true },
          { title: "Danh sách Failed eKYC", href: "/failed-ekyc", icon: ClipboardList, cccOrAdminOnly: true },
          { title: "Nhập Failed eKYC mới", href: "/failed-ekyc/create", icon: FileCheck2, cccOrAdminOnly: true },
          { title: "Import Excel", href: "/failed-ekyc/import", icon: FileSpreadsheet, cccOrAdminOnly: true },
        ],
      },
    ],

    //   reports: [
    //     {
    //       title: "BÁO CÁO",
    //       items: [
    //         {
    //           title: "Tất cả các báo cáo",
    //           href: "/reports",
    //           icon: BarChart3,
    //         },
    //       ],
    //     },
    //     {
    //       title: "Báo cáo khảo sát",
    //       items: [
    //         {
    //           title: "TRẠNG THÁI CUỘC GỌI",
    //           href: "/reports/call-status",
    //           icon: FileBarChart,
    //         },
    //         {
    //           title: "TỶ LỆ KẾT NỐI",
    //           href: "/reports/connect-rate",
    //           icon: FileBarChart,
    //         },
    //         {
    //           title: "THỜI GIAN ĐÀM THOẠI",
    //           href: "/reports/talk-time",
    //           icon: FileBarChart,
    //         },
    //         {
    //           title: "KẾT QUẢ VÀ HIỆU SUẤT ...",
    //           href: "/reports/performance",
    //           icon: FileBarChart,
    //         },
    //         {
    //           title: "THỐNG KÊ SỐ LƯỢNG C...",
    //           href: "/reports/call-count",
    //           icon: FileBarChart,
    //         },
    //       ],
    //     },
    //     {
    //       title: "Báo cáo Ticket",
    //       items: [
    //         {
    //           title: "THỜI GIAN XỬ LÝ TICKET ...",
    //           href: "/reports/ticket-processing-time",
    //           icon: FileBarChart,
    //         },
    //         {
    //           title: "THỜI GIAN XỬ LÝ TRUNG...",
    //           href: "/reports/ticket-average-time",
    //           icon: FileBarChart,
    //         },
    //         {
    //           title: "THỜI GIAN XỬ LÝ TÁC VỤ...",
    //           href: "/reports/task-processing-time",
    //           icon: FileBarChart,
    //         },
    //         {
    //           title: "THỜI GIAN XỬ LÝ TÁC VỤ...",
    //           href: "/reports/task-average-time",
    //           icon: FileBarChart,
    //         },
    //       ],
    //     },
    //   ],

    //   utilities: [
    //     {
    //       title: "TIỆN ÍCH",
    //       items: [
    //         {
    //           title: "Lịch",
    //           href: "/utilities/calendar",
    //           icon: CalendarDays,
    //         },
    //         {
    //           title: "Tài liệu",
    //           href: "/utilities/documents",
    //           icon: Folder,
    //         },
    //         {
    //           title: "Thùng rác",
    //           href: "/utilities/trash",
    //           icon: Trash2,
    //         },
    //         {
    //           title: "Hộp mail",
    //           href: "/utilities/mailbox",
    //           icon: Inbox,
    //         },
    //         {
    //           title: "Báo cáo",
    //           href: "/utilities/reports",
    //           icon: FileBarChart,
    //         },
    //       ],
    //     },
    //   ],

    //   settings: [
    //     {
    //       title: "CẤU HÌNH",
    //       items: [
    //         {
    //           title: "Tùy chọn cá nhân",
    //           href: "/settings/profile",
    //           icon: UserCog,
    //         },
    //         {
    //           title: "Cấu hình Telesales",
    //           href: "/settings/telesales",
    //           icon: Headphones,
    //         },
    //         {
    //           title: "Tích hợp mạng xã ...",
    //           href: "/settings/social-integration",
    //           icon: Globe,
    //         },
    //         {
    //           title: "Cấu hình phân bổ ...",
    //           href: "/settings/assignment",
    //           icon: UsersRound,
    //         },
    //         {
    //           title: "Chuyển đổi Email",
    //           href: "/settings/email-convert",
    //           icon: MailCheck,
    //         },
    //       ],
    //     },
    //   ],
  },

  SALE_ADMIN: {
    // sa_records: [
    //   {
    //     title: "GHI NHẬN CUỘC GỌI",
    //     items: [
    //       {
    //         title: "Danh sách SA Records",
    //         href: "/sale-admin/records",
    //         icon: ClipboardList,
    //       },
    //       {
    //         title: "Thêm kết quả cuộc gọi",
    //         href: "/sale-admin/records/create",
    //         icon: FileCheck2,
    //       },
    //     ],
    //   },
    // ],

    // sa_kpi: [
    //   {
    //     title: "KPI SALE ADMIN",
    //     items: [
    //       {
    //         title: "Dashboard KPI",
    //         href: "/sale-admin/kpi",
    //         icon: Target,
    //         kpiUserOnly: true,
    //       },
    //       {
    //         title: "KPI cá nhân",
    //         href: "/sale-admin/kpi/personal",
    //         icon: Gauge,
    //         kpiUserOnly: true,
    //       },

    //     ],
    //   },
    // ],

    // sa_import: [
    //   {
    //     title: "IMPORT EXCEL",
    //     items: [
    //       {
    //         title: "Import SA Records",
    //         href: "/sale-admin/import",
    //         icon: FileSpreadsheet,
    //       },
    //       {
    //         title: "Lịch sử import",
    //         href: "/sale-admin/import/history",
    //         icon: FileBarChart,
    //       },
    //     ],
    //   },
    // ],

    // sa_system: [
    //   {
    //     title: "HỆ THỐNG SALE ADMIN",
    //     items: [
    //       {
    //         title: "Quản lý người dùng",
    //         href: "/accounts/users",
    //         icon: UserCog,
    //         adminOnly: true,
    //       },
    //       {
    //         title: "Phân quyền Sale Admin",
    //         href: "/accounts/roles",
    //         icon: Settings,
    //         adminOnly: true,
    //       },
    //     ],
    //   },
    // ],
  },
};

const panelTitleMap: Record<PanelKey, string> = {
  customers: "KHÁCH HÀNG",
  surveys: "KHẢO SÁT",
  tickets: "CSKH",
  external_errors: "LỖI BÊN NGOÀI",
  ekyc: "QUẢN LÝ eKYC",
  failed_ekyc: "FAILED eKYC",
  reports: "BÁO CÁO",
  utilities: "TIỆN ÍCH",
  settings: "CẤU HÌNH",

  sa_records: "SA RECORD",
  sa_kpi: "KPI SALE ADMIN",
  sa_import: "IMPORT EXCEL",
  sa_system: "HỆ THỐNG",
};

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

function getRoleCodes(user?: CurrentUser | null) {
  if (!user) return [];

  const typedUser = user as CurrentUser & {
    role_codes?: string[];
    roles?: { role_code?: string | null }[];
  };

  const fromRoleCodes = typedUser.role_codes || [];
  const fromRoles = typedUser.roles?.map((role) => role.role_code).filter(Boolean) || [];

  return Array.from(new Set([...fromRoleCodes, ...fromRoles])) as string[];
}

function getPermissionCodes(user?: CurrentUser | null) {
  if (!user) return [];

  const typedUser = user as CurrentUser & {
    permission_codes?: string[];
    permissions?: { permission_code?: string | null }[];
  };

  const fromPermissionCodes = typedUser.permission_codes || [];
  const fromPermissions =
    typedUser.permissions?.map((permission) => permission.permission_code).filter(Boolean) || [];

  return Array.from(new Set([...fromPermissionCodes, ...fromPermissions])) as string[];
}

function isGlobalAdmin(user?: CurrentUser | null) {
  if (!user) return false;

  const typedUser = user as CurrentUser & {
    is_superuser?: boolean;
    is_global_admin?: boolean;
  };

  const roleCodes = getRoleCodes(user);

  return Boolean(
    typedUser.is_superuser ||
    typedUser.is_global_admin ||
    roleCodes.some((roleCode) => GLOBAL_ADMIN_ROLE_CODES.has(roleCode))
  );
}

function isSaleAdminKpiDashboardUser(user?: CurrentUser | null) {
  if (!user || isGlobalAdmin(user)) return false;

  const roleCodes = getRoleCodes(user);
  const permissionCodes = getPermissionCodes(user);

  return (
    roleCodes.some((roleCode) => SA_OR_SUP_ROLE_CODES.has(roleCode)) ||
    permissionCodes.some((permissionCode) =>
      SA_OR_SUP_PERMISSION_CODES.has(permissionCode)
    )
  );
}

function getAvailableWorkspaces(
  user: CurrentUser | null | undefined,
  activeWorkspace: WorkspaceCode
): WorkspaceCode[] {
  if (!user) return [activeWorkspace];

  if (isGlobalAdmin(user)) return WORKSPACE_ORDER;

  const groups = user.accessible_groups || [];

  const available = WORKSPACE_ORDER.filter((workspace) => groups.includes(workspace));

  return available.length > 0 ? available : [activeWorkspace];
}

function filterMenuItems(
  items: MainMenuItem[],
  admin: boolean,
  kpiDashboardUser: boolean,
  cccOrAdmin: boolean,
  currentUser?: CurrentUser | null
) {
  const userPermissions = getPermissionCodes(currentUser);
  return items.filter((item) => {
    if (item.adminOnly && !admin) return false;
    if (item.kpiUserOnly && !kpiDashboardUser) return false;
    if (item.cccOrAdminOnly && !cccOrAdmin) return false;
    if (item.saOrSupOnly && !kpiDashboardUser) return false;
    if (item.permissionCode && !admin && !userPermissions.includes(item.permissionCode)) return false;

    return true;
  });
}

function filterPanelGroups(
  groups: PanelGroup[],
  admin: boolean,
  kpiDashboardUser: boolean,
  cccOrAdmin: boolean,
  currentUser?: CurrentUser | null
) {
  const userPermissions = getPermissionCodes(currentUser);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.adminOnly && !admin) return false;
        if (item.kpiUserOnly && !kpiDashboardUser) return false;
        if (item.cccOrAdminOnly && !cccOrAdmin) return false;
        if (item.saOrSupOnly && !kpiDashboardUser) return false;
        if (item.permissionCode && !admin && !userPermissions.includes(item.permissionCode)) return false;

        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function MainNavigationDrawer({
  open,
  onClose,
  isPinned = false,
  onTogglePin,
  activeWorkspace,
  currentUser,
}: MainNavigationDrawerProps) {
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [activePanelWorkspace, setActivePanelWorkspace] =
    useState<WorkspaceCode | null>(null);
  const [panelTop, setPanelTop] = useState(0);

  const admin = isGlobalAdmin(currentUser);
  const availableWorkspaces = getAvailableWorkspaces(currentUser, activeWorkspace);
  const canViewCccOnlyMenus = admin || availableWorkspaces.includes("CCC");
  const kpiDashboardUser = isSaleAdminKpiDashboardUser(currentUser);

  // Customer 360 gộp cả giao dịch, cuộc gọi và điểm khảo sát nên có quyền
  // riêng; ở trong workspace CCC là chưa đủ để thấy menu này.
  const canViewCustomer360 =
    canViewCccOnlyMenus &&
    (admin || getPermissionCodes(currentUser).includes("CUSTOMER_360_VIEW"));

  const openPanel = (
    panel: PanelKey,
    workspace: WorkspaceCode,
    anchor: HTMLElement
  ) => {
    const anchorRect = anchor.getBoundingClientRect();

    setPanelTop(Math.max(8, anchorRect.top));
    setActivePanel(panel);
    setActivePanelWorkspace(workspace);
  };

  const handleClose = () => {
    setActivePanel(null);
    setActivePanelWorkspace(null);
    if (!isPinned) {
      onClose();
    }
  };

  const handleNavigate = (workspace: WorkspaceCode) => {
    setActiveWorkspace(workspace);
    if (!isPinned) {
      handleClose();
    }
  };

  const activeGroups =
    activePanel && activePanelWorkspace
      ? filterPanelGroups(
        panelGroupsByWorkspace[activePanelWorkspace][activePanel] || [],
        admin,
        kpiDashboardUser,
        canViewCccOnlyMenus,
        currentUser
      )
      : [];

  return (
    <>
      {open && !isPinned && (
        <button
          type="button"
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/20"
          aria-label="Close menu overlay"
        />
      )}

      <aside
        onMouseLeave={() => {
          setActivePanel(null);
          setActivePanelWorkspace(null);
        }}
        className={`fixed left-0 top-0 z-50 h-screen w-[300px] bg-[#064e3b] text-white shadow-2xl transition-transform duration-300 ${
          open || isPinned ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-screen w-[300px] overflow-y-auto border-r border-white/10 bg-[#064e3b]">
          <div className="flex h-[56px] items-center justify-between border-b border-white/10 px-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded hover:bg-white/10"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                Menu chức năng
              </span>
              {onTogglePin && (
                <button
                  type="button"
                  onClick={onTogglePin}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                    isPinned
                      ? "bg-[#10b981] text-white shadow-xs"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  title={isPinned ? "Bỏ ghim menu" : "Ghim menu cố định"}
                >
                  <Pin
                    size={15}
                    className={`transition-transform duration-200 ${
                      isPinned ? "rotate-45 fill-current text-white" : ""
                    }`}
                  />
                  <span>{isPinned ? "Đã ghim" : "Ghim"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3">
            <div className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                Phân hệ được cấp quyền
              </div>

              <div className="mt-1 flex flex-wrap gap-1.5">
                {availableWorkspaces.map((workspace) => (
                  <span
                    key={workspace}
                    className={`rounded px-2 py-1 text-[11px] font-bold ${workspace === activeWorkspace
                      ? "bg-[#10b981] text-white"
                      : "bg-white/15 text-white/90"
                      }`}
                  >
                    {WORKSPACE_LABEL[workspace]}
                  </span>
                ))}
              </div>

              <div className="mt-1.5 text-[11px] text-emerald-100/80">
                Hiển thị theo phân quyền, không cần chọn phân hệ.
              </div>
            </div>
          </div>

          <nav className="py-3">
            <div className="border-b border-white/10 pb-3">
              <div className="px-5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                CHUNG
              </div>

              {canViewCccOnlyMenus && (
                <>
                  {canViewCustomer360 && (
                    <Link
                      href="/customers/360"
                      onMouseEnter={() => {
                        setActivePanel(null);
                        setActivePanelWorkspace(null);
                      }}
                      onClick={() => handleNavigate("CCC")}
                      className="flex h-[40px] items-center gap-4 px-5 text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      <UsersRound size={27} className="shrink-0 text-white/70" />

                      <span className="flex-1 text-[10px] font-semibold tracking-wide">
                        CUSTOMER 360
                      </span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onPointerEnter={(event) =>
                      openPanel("customers", "CCC", event.currentTarget)
                    }
                    onFocus={(event) =>
                      openPanel("customers", "CCC", event.currentTarget)
                    }
                    onClick={(event) =>
                      openPanel("customers", "CCC", event.currentTarget)
                    }
                    className={`flex h-[40px] w-full items-center gap-4 px-5 text-left transition hover:bg-white/10 ${activePanel === "customers" && activePanelWorkspace === "CCC"
                        ? "bg-white/10 text-white"
                        : "text-white/80"
                      }`}
                  >
                    <UsersRound size={27} className="shrink-0 text-white/70" />

                    <span className="flex-1 text-[10px] font-semibold tracking-wide">
                      KHÁCH HÀNG
                    </span>

                    <ChevronRight size={24} className="text-white/60" />
                  </button>
                </>
              )}

              <Link
                href="/accounts/users"
                onMouseEnter={() => {
                  setActivePanel(null);
                  setActivePanelWorkspace(null);
                }}
                onClick={() => handleNavigate(activeWorkspace)}
                className="flex h-[40px] items-center gap-4 px-5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <UserCog size={27} className="shrink-0 text-white/70" />

                <span className="flex-1 text-[10px] font-semibold tracking-wide">
                  QUẢN LÝ USER
                </span>
              </Link>
            </div>

            {availableWorkspaces.map((workspace) => {
              const menuItems = filterMenuItems(
                mainMenuItemsByWorkspace[workspace],
                admin,
                kpiDashboardUser,
                canViewCccOnlyMenus,
                currentUser
              );

              if (menuItems.length === 0) return null;

              return (
                <div key={workspace} className="pb-3">
                  <div className="px-5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                    {WORKSPACE_LABEL[workspace]}
                  </div>

                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      activePanel === item.panel && activePanelWorkspace === workspace;

                    if (item.panel) {
                      return (
                        <button
                          key={`${workspace}-${item.title}`}
                          type="button"
                          onPointerEnter={(event) =>
                            openPanel(item.panel!, workspace, event.currentTarget)
                          }
                          onFocus={(event) =>
                            openPanel(item.panel!, workspace, event.currentTarget)
                          }
                          onClick={(event) =>
                            openPanel(item.panel!, workspace, event.currentTarget)
                          }
                          className={`flex h-[40px] w-full items-center gap-4 px-5 text-left transition hover:bg-white/10 ${isActive ? "bg-white/10 text-white" : "text-white/80"
                            }`}
                        >
                          <Icon size={27} className="shrink-0 text-white/70" />

                          <span className="flex-1 text-[10px] font-semibold tracking-wide">
                            {item.title}
                          </span>

                          <ChevronRight size={24} className="text-white/60" />
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={`${workspace}-${item.title}`}
                        href={item.href}
                        onMouseEnter={() => {
                          setActivePanel(null);
                          setActivePanelWorkspace(null);
                        }}
                        onClick={() => handleNavigate(workspace)}
                        className="flex h-[40px] items-center gap-4 px-5 text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        <Icon size={27} className="shrink-0 text-white/70" />

                        <span className="flex-1 text-[10px] font-semibold tracking-wide">
                          {item.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {activePanel && activePanelWorkspace && activeGroups.length > 0 && (
          <div
            onPointerEnter={() => {
              // Giữ flyout mở khi di chuyển chuột từ menu cha sang menu con.
            }}
            className="absolute left-[300px] z-[60] w-[280px] overflow-y-auto rounded-r-lg border border-l-0 border-white/10 bg-[#065f46] p-2 shadow-2xl"
            style={{
              top: panelTop,
              maxHeight: `calc(100vh - ${panelTop + 8}px)`,
            }}
          >
            <div className="border-b border-white/10 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                {panelTitleMap[activePanel]}
              </div>
            </div>

            <div className="py-1">
              {activeGroups.flatMap((group) =>
                group.items.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={`${group.title}-${item.href}-${index}`}
                      href={item.href}
                      onClick={() => handleNavigate(activePanelWorkspace)}
                      className="group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-white/60 group-hover:bg-orange-500 group-hover:text-white">
                        <Icon size={17} />
                      </span>

                      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-5">
                        {item.title}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
