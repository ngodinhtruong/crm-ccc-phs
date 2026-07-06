"use client";

import Link from "next/link";
import {
  Boxes,
  ChevronRight,
  Grid3X3,
  Headphones,
  Info,
  Plug,
  Settings,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";

const menuGroups = [
  {
    title: "QUẢN LÝ NGƯỜI DÙNG",
    icon: Users,
    href: "/accounts/users",
  },
  {
    title: "QUẢN LÝ MODULES",
    icon: Boxes,
    href: "/modules",
  },
  {
    title: "TỰ ĐỘNG HÓA",
    icon: Workflow,
    href: "/automation",
  },
  {
    title: "THIẾT LẬP THÔNG TIN",
    icon: Info,
    href: "/settings/info",
  },
  {
    title: "CHĂM SÓC KHÁCH HÀNG",
    icon: Headphones,
    href: "/tickets",
  },
  {
    title: "TÍCH HỢP",
    icon: Plug,
    href: "/integrations",
  },
  {
    title: "CÁC ỨNG DỤNG",
    icon: Grid3X3,
    href: "/apps",
  },
  {
    title: "CÀI ĐẶT KHÁC",
    icon: SlidersHorizontal,
    href: "/settings/other",
  },
];

export function DashboardSidebar() {
  return (
    <aside className="fixed left-0 top-14 z-30 flex h-[calc(100vh-56px)]">
      {/* Icon rail */}
      <div className="flex h-full w-12 flex-col items-center bg-[#263747] text-white">
        <div className="flex h-20  w-full items-center justify-center bg-orange-500">
          <Settings size={22} />
        </div>
      </div>

      {/* Main sidebar */}
      <div className="h-full w-[220px] bg-[#263747] text-white">
        <div className="border-b border-white/10 px-3 py-3">
          <input
            placeholder="Tìm kiếm cài đặt"
            className="h-9 w-full rounded-md bg-white px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <nav className="mt-3 space-y-1 px-2">
          {menuGroups.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="flex h-10 items-center gap-2 rounded-md px-2 text-[13px] font-semibold text-white transition hover:bg-white/10"
              >
                <ChevronRight size={15} className="shrink-0" />
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}