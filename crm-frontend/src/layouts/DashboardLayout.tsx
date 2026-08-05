"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { Settings } from "lucide-react";

import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";
import { BreadcrumbItem } from "@/types/common.type";
import { useWorkspaceGuard } from "@/hooks/useWorkspaceGuard";
import { useNavigationBreadcrumbs } from "@/hooks/useNavigationBreadcrumbs";
import { WORKSPACE_LABEL } from "@/constants/workspace-navigation.constant";
import { getDefaultPathForWorkspaceByUser } from "@/utils/default-home.util";

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
    const [isPinned, setIsPinned] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(
        defaultSettingsSidebarOpen
    );

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("crm_nav_pinned");
            if (stored === "true") {
                setIsPinned(true);
            }
        }
    }, []);

    const handleTogglePin = () => {
        setIsPinned((prev) => {
            const next = !prev;
            if (typeof window !== "undefined") {
                localStorage.setItem("crm_nav_pinned", String(next));
            }
            return next;
        });
    };

    const { currentUser, activeWorkspace, loading, error } = useWorkspaceGuard();

    const homeHref = activeWorkspace
        ? getDefaultPathForWorkspaceByUser(activeWorkspace, currentUser)
        : "/workspace";

    const navigationBreadcrumbs = useNavigationBreadcrumbs({
        declaredItems: breadcrumbs || [],
        homeHref,
        enabled: !loading && Boolean(activeWorkspace),
    });

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
                        className="mt-4 h-9 rounded-lg bg-[#10b981] px-4 text-xs font-semibold text-white transition hover:bg-[#059669]"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#eef6f2] text-slate-800">
            <MainNavigationDrawer
                open={menuOpen || isPinned}
                onClose={() => setMenuOpen(false)}
                isPinned={isPinned}
                onTogglePin={handleTogglePin}
                activeWorkspace={activeWorkspace}
                currentUser={currentUser}
            />

            <DashboardTopbar
                onMenuClick={() => setMenuOpen((prev) => !prev)}
                isPinned={isPinned}
            />

            <DashboardSidebar
                open={settingsSidebarOpen}
                onClose={() => setSettingsSidebarOpen(false)}
                defaultExpandedGroupKey={sidebarDefaultExpandedGroupKey}
                defaultActiveChildKey={sidebarDefaultActiveChildKey}
                showCloseButton={sidebarShowCloseButton}
            />

            {!isPinned && (
                <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-56px)] w-10 bg-[#064e3b]">
                    {/* <button
                        type="button"
                        onClick={() => setSettingsSidebarOpen(true)}
                        className={`flex h-10 w-full items-center justify-center text-white ${settingsSidebarOpen
                                ? "bg-[#10b981] hover:bg-[#059669]"
                                : "bg-[#0f291e] hover:bg-[#10b981]"
                            }`}
                        title="Mở cài đặt"
                    >
                        <Settings size={22} />
                    </button> */}
                </aside>
            )}

            <section
                className={`min-h-screen pt-14 transition-all duration-300 ${
                    isPinned ? "pl-0 lg:pl-[300px]" : contentClassName
                }`}
            >
                <div className="sticky top-[56px] z-30 flex min-h-[44px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 bg-white/95 px-4 py-1.5 backdrop-blur-sm shadow-xs">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Breadcrumbs
                            items={navigationBreadcrumbs.items}
                            onNavigate={navigationBreadcrumbs.truncateAt}
                        />

                        <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-[#059669]">
                            {WORKSPACE_LABEL[activeWorkspace]}
                        </span>
                    </div>

                    {rightAction && (
                        <div className="ml-3 flex shrink-0 items-center">
                            {rightAction}
                        </div>
                    )}
                </div>

                <div className="space-y-4 p-4">{children}</div>
            </section>
        </main>
    );
}

function Breadcrumbs({
    items,
    onNavigate,
}: {
    items: BreadcrumbItem[];
    onNavigate: (index: number) => void;
}) {
    if (items.length === 0) {
        return <div />;
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className="min-w-0 flex-1 overflow-x-auto"
        >
            <div className="flex w-max items-center gap-1 whitespace-nowrap text-xs text-slate-600">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <div
                            key={`${item.href || item.label}-${index}`}
                            className="flex items-center gap-1"
                        >
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    onClick={() => onNavigate(index)}
                                    title={item.label}
                                    className="max-w-44 truncate font-medium text-slate-700 hover:text-[#10b981]"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    title={item.label}
                                    className={
                                        isLast
                                            ? "max-w-56 truncate font-semibold text-slate-800"
                                            : "max-w-44 truncate font-medium text-slate-700"
                                    }
                                >
                                    {item.label}
                                </span>
                            )}

                            {!isLast && <span aria-hidden="true">&gt;</span>}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
