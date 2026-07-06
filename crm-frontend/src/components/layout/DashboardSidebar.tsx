"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  Headphones,
  Info,
  Plug,
  Settings,
  SlidersHorizontal,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

type SidebarChildItem = {
  key: string;
  title: string;
  href?: string;
};

type SidebarGroup = {
  key: string;
  title: string;
  icon: LucideIcon;
  children?: SidebarChildItem[];
};

const PLACEHOLDER_CHILD_COUNT = 3;

const menuGroups: SidebarGroup[] = [
  {
    key: "user-management",
    title: "QUẢN LÝ NGƯỜI DÙNG",
    icon: Users,
    children: [
      {
        key: "users",
        title: "Người dùng",
        href: "/accounts/users",
      },
      {
        key: "roles",
        title: "Vai trò",
        href: "/accounts/roles",
      },
      {
        key: "permission-template-profile",
        title: "Hồ sơ phân quyền mẫu",
        href: "/accounts/permission-template-profiles",
      },
      {
        key: "sharing-permissions",
        title: "Phân quyền Chia sẻ",
        href: "/accounts/sharing-permissions",
      },
      {
        key: "groups",
        title: "Nhóm",
        href: "/accounts/groups",
      },
      {
        key: "login-history",
        title: "Lịch sử đăng nhập",
        href: "/accounts/login-history",
      },
      {
        key: "manager-config",
        title: "Cấu hình người quản lý",
        href: "/accounts/manager-config",
      },
      {
        key: "export-config",
        title: "Cấu hình xuất dữ liệu",
        href: "/accounts/export-config",
      },
    ],
  },
  {
    key: "module-management",
    title: "QUẢN LÝ MODULES",
    icon: Boxes,
  },
  {
    key: "automation",
    title: "TỰ ĐỘNG HÓA",
    icon: Workflow,
  },
  {
    key: "info-settings",
    title: "THIẾT LẬP THÔNG TIN",
    icon: Info,
  },
  {
    key: "customer-care",
    title: "CHĂM SÓC KHÁCH HÀNG",
    icon: Headphones,
  },
  {
    key: "integration",
    title: "TÍCH HỢP",
    icon: Plug,
  },
  {
    key: "applications",
    title: "CÁC ỨNG DỤNG",
    icon: Grid3X3,
  },
  {
    key: "other-settings",
    title: "CÀI ĐẶT KHÁC",
    icon: SlidersHorizontal,
  },
];

function buildPlaceholderChildren(title: string, key: string): SidebarChildItem[] {
  return Array.from({ length: PLACEHOLDER_CHILD_COUNT }, (_, index) => ({
    key: `${key}-placeholder-${index + 1}`,
    title: `${title} ${index + 1}`,
    href: "#",
  }));
}

export function DashboardSidebar({
  open,
  onClose,
}: DashboardSidebarProps) {
    const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
    const [activeChildKey, setActiveChildKey] = useState<string | null>(null);
    const [search, setSearch] = useState("");

  const normalizedGroups = useMemo(() => {
    return menuGroups.map((group) => ({
      ...group,
      resolvedChildren:
        group.children && group.children.length > 0
          ? group.children
          : buildPlaceholderChildren(group.title, group.key),
    }));
  }, []);

  const visibleGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return normalizedGroups;
    }

    return normalizedGroups
      .map((group) => {
        const groupMatches = group.title.toLowerCase().includes(keyword);

        const matchedChildren = group.resolvedChildren.filter((child) =>
          child.title.toLowerCase().includes(keyword)
        );

        if (groupMatches) {
          return group;
        }

        if (matchedChildren.length > 0) {
          return {
            ...group,
            resolvedChildren: matchedChildren,
          };
        }

        return null;
      })
      .filter(Boolean) as Array<
      SidebarGroup & { resolvedChildren: SidebarChildItem[] }
    >;
  }, [normalizedGroups, search]);

  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroupKey((prev) => (prev === groupKey ? null : groupKey));
  };

  return (
    <aside
      className={`fixed left-0 top-14 z-50 flex h-[calc(100vh-56px)] transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Icon rail */}
      <div className="flex h-full w-10 flex-col items-center bg-[#263747] text-white">
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
          title="Đóng"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main sidebar */}
      <div className="h-full w-[275px] overflow-y-auto bg-[#263747] text-white shadow-2xl">
        <div className="border-b border-white/10 px-3 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm cài đặt"
            className="h-10 w-full rounded-md bg-white px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <nav className="mt-3 px-2 pb-6">
          {visibleGroups.map((group) => {
            const Icon = group.icon;
            const isExpanded = expandedGroupKey === group.key;

            return (
              <div key={group.key} className="mb-1">
                <button
                  type="button"
                  onClick={() => handleToggleGroup(group.key)}
                  className="flex h-11 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-semibold text-white transition hover:bg-white/10"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="shrink-0 text-white/90" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-white/90" />
                  )}

                  <Icon size={16} className="shrink-0 text-white/90" />

                  <span className="truncate">{group.title}</span>
                </button>

                {isExpanded && (
                  <div className="mt-1 space-y-1 pb-2 pl-8">
                    {group.resolvedChildren.map((child) => {
                      const isActive = activeChildKey === child.key;
                      const isPlaceholder = child.href === "#";

                      return (
                        <Link
                          key={child.key}
                          href={child.href || "#"}
                          onClick={(e) => {
                            setActiveChildKey(child.key);

                            if (isPlaceholder) {
                              e.preventDefault();
                            }
                          }}
                          className={`flex min-h-10 items-center rounded px-3 text-[14px] font-semibold transition ${
                            isActive
                              ? "bg-black text-white"
                              : "text-white hover:bg-white/10"
                          }`}
                        >
                          {child.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}