"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { Settings } from "lucide-react";

import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";
import { BreadcrumbItem } from "@/types/common.type";
import { useWorkspaceGuard } from "@/hooks/useWorkspaceGuard";
import { WORKSPACE_LABEL } from "@/constants/workspace-navigation.constant";

export function DashboardLayout({
    children,
    breadcrumbs,
    rightAction,
    defaultSettingsSidebarOpen = false,
    sidebarDefaultExpandedGroupKey,
    sidebarDefaultActiveChildKey,
    sidebarShowCloseButton = true,
    contentClassName = "pl-10",
}: {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    rightAction?: ReactNode;
    defaultSettingsSidebarOpen?: boolean;
    sidebarDefaultExpandedGroupKey?: string;
    sidebarDefaultActiveChildKey?: string;
    sidebarShowCloseButton?: boolean;
    contentClassName?: string;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(
        defaultSettingsSidebarOpen
    );

    const { currentUser, activeWorkspace, loading, error } = useWorkspaceGuard();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
                Loading...
            </div>
        );
    }

    if (error || !activeWorkspace) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
                    <h1 className="text-base font-bold text-slate-800">
                        Không vào được phân hệ
                    </h1>

                    <p className="mt-2 text-sm text-slate-600">
                        {error ||
                            "Tài khoản của bạn chưa được gán phân hệ nào. Liên hệ quản trị viên để được cấp quyền."}
                    </p>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-4 h-9 rounded-lg bg-[#0097cf] px-4 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#eef2f5] text-slate-800">
            <MainNavigationDrawer
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                activeWorkspace={activeWorkspace}
                currentUser={currentUser}
            />

            <DashboardTopbar onMenuClick={() => setMenuOpen(true)} />

            <DashboardSidebar
                open={settingsSidebarOpen}
                onClose={() => setSettingsSidebarOpen(false)}
                defaultExpandedGroupKey={sidebarDefaultExpandedGroupKey}
                defaultActiveChildKey={sidebarDefaultActiveChildKey}
                showCloseButton={sidebarShowCloseButton}
            />

            <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-56px)] w-10 bg-[#263747]">
                {/* <button
                    type="button"
                    onClick={() => setSettingsSidebarOpen(true)}
                    className={`flex h-10 w-full items-center justify-center text-white ${settingsSidebarOpen
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-[#1d2c39] hover:bg-orange-500"
                        }`}
                    title="Mở cài đặt"
                >
                    <Settings size={22} />
                </button> */}
            </aside>

            <section className={`min-h-screen pt-14 ${contentClassName}`}>
                <div className="sticky top-[56px] z-20 flex h-11 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm shadow-xs">
                    <div className="flex items-center gap-3">
                        <Breadcrumbs items={breadcrumbs || []} />

                        <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {WORKSPACE_LABEL[activeWorkspace]}
                        </span>
                    </div>

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
                                className="font-medium text-slate-700 hover:text-orange-500 hover:underline"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span
                                aria-current={isLast ? "page" : undefined}
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