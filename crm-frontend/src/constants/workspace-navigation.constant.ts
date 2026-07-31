import {
  AlertTriangle,
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  ListChecks,
  Headphones,
  ShieldCheck,
  Target,
  Ticket,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";

export type WorkspaceCode = "CCC" | "SALE_ADMIN";

export type WorkspaceNavigationItem = {
  key: string;
  label: string;
  href: string;
  icon?: React.ElementType;
};

export type WorkspaceNavigationGroup = {
  key: string;
  label: string;
  items: WorkspaceNavigationItem[];
};

export const WORKSPACE_LABEL: Record<WorkspaceCode, string> = {
  CCC: "CCC",
  SALE_ADMIN: "Sale Admin",
};

export const WORKSPACE_NAVIGATION: Record<
  WorkspaceCode,
  WorkspaceNavigationGroup[]
> = {
  CCC: [
    {
      key: "ccc-main",
      label: "CCC",
      items: [
        {
          key: "ccc-dashboard-general",
          label: "Dashboard Tổng hợp",
          href: "/dashboard",
          icon: BarChart3,
        },
        {
          key: "ccc-dashboard",
          label: "Dashboard CCC",
          href: "/tickets/dashboard",
          icon: Gauge,
        },
        {
          key: "ccc-chatbot",
          label: "Chatbot",
          href: "/chatbots/dashboard",
          icon: Bot,
        },
        {
          key: "ccc-tickets",
          label: "Tickets",
          href: "/tickets",
          icon: Ticket,
        },
        {
          key: "ccc-sla",
          label: "SLA",
          href: "/sla",
          icon: ShieldCheck,
        },
      ],
    },

    {
      key: "ccc-external-errors",
      label: "Lỗi bên ngoài",
      items: [
        {
          key: "external-error-dashboard",
          label: "Dashboard lỗi",
          href: "/external-errors/dashboard",
          icon: BarChart3,
        },
        {
          key: "external-error-list",
          label: "Danh sách lỗi",
          href: "/external-errors",
          icon: ListChecks,
        },
        {
          key: "external-error-import",
          label: "Import lỗi",
          href: "/external-errors/import",
          icon: Upload,
        },
      ],
    },
    {
      key: "ccc-data",
      label: "Dữ liệu chung",
      items: [
        {
          key: "ccc-customers",
          label: "Khách hàng",
          href: "/customers",
          icon: UsersRound,
        },
        {
          key: "ccc-companies",
          label: "Công ty",
          href: "/companies",
          icon: Building2,
        },
      ],
    },
    {
      key: "ccc-system",
      label: "Hệ thống",
      items: [
        {
          key: "ccc-users",
          label: "Quản lý người dùng",
          href: "/accounts/users",
          icon: UserRound,
        },
      ],
    },
  ],

  SALE_ADMIN: [
    {
      key: "sa-main",
      label: "Sale Admin",
      items: [
        {
          key: "sa-dashboard",
          label: "Dashboard Sale Admin",
          href: "/sale-admin/dashboard",
          icon: BarChart3,
        },
        {
          key: "sa-records",
          label: "Ghi nhận cuộc gọi",
          href: "/sale-admin/records",
          icon: ClipboardList,
        },
        {
          key: "sa-customers",
          label: "Khách hàng Inactive",
          href: "/sale-admin/inactive-customers",
          icon: UsersRound,
        },
        {
          key: "sa-kpi",
          label: "KPI Sale Admin",
          href: "/sale-admin/kpis/personal",
          icon: Target,
        },
        {
          key: "sa-kpi-admin",
          label: "KPI Admin",
          href: "/sale-admin/kpis/admin",
          icon: BarChart3,
        },
        {
          key: "sa-import",
          label: "Import Excel",
          href: "/sale-admin/import",
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      key: "sa-system",
      label: "Hệ thống",
      items: [
        {
          key: "sa-users",
          label: "Quản lý người dùng",
          href: "/accounts/users",
          icon: Headphones,
        },
      ],
    },
  ],
};