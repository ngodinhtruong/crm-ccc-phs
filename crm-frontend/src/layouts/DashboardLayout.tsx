"use client";

import Link from "next/link";
import { useState } from "react";
import { Settings } from "lucide-react";

import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";
import { BreadcrumbItem } from "@/types/common.type";

export function DashboardLayout({
  children,
  breadcrumbs,
  rightAction,
}: {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  rightAction?: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#eef2f5] text-slate-800">
      <MainNavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <DashboardTopbar onMenuClick={() => setMenuOpen(true)} />

      <DashboardSidebar
        open={settingsSidebarOpen}
        onClose={() => setSettingsSidebarOpen(false)}
      />

      <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-56px)] w-10 bg-[#263747]">
        <button
          type="button"
          onClick={() => setSettingsSidebarOpen(true)}
          className="flex h-10 w-full items-center justify-center bg-[#1d2c39] text-white hover:bg-orange-500"
          title="Mở cài đặt"
        >
          <Settings size={22} />
        </button>
      </aside>

      <section className="min-h-screen pl-10 pt-14">
        <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
          <Breadcrumbs items={breadcrumbs || []} />

          {rightAction && <div className="flex items-center">{rightAction}</div>}
        </div>

        <div className="space-y-4 p-4">{children}</div>
      </section>
    </main>
  );
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) {
    return <div />;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-slate-600">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="font-medium text-slate-700 hover:text-orange-500"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "font-semibold text-slate-800"
                    : "font-medium text-slate-700"
                }
              >
                {item.label}
              </span>
            )}

            {!isLast && <span>&gt;</span>}
          </div>
        );
      })}
    </div>
  );
}