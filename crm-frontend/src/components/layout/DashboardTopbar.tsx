"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    CalendarDays,
    ChartNoAxesColumnIncreasing,
    ChevronDown,
    CircleHelp,
    LogOut,
    Megaphone,
    MessageCircle,
    PlusCircle,
    Search,
    Settings,
    ShieldQuestion,
    UserRound,
} from "lucide-react";

import { authService } from "@/services/auth.service";
import { accountService, CurrentUser } from "@/services/account.service";

type DashboardTopbarProps = {
    onMenuClick?: () => void;
    isPinned?: boolean;
};

export function DashboardTopbar({ onMenuClick, isPinned = false }: DashboardTopbarProps) {
    const router = useRouter();
    const [me, setMe] = useState<CurrentUser | null>(null);

    useEffect(() => {
        const loadMe = async () => {
            try {
                const data = await accountService.getMe();
                setMe(data);
            } catch {
                setMe(null);
            }
        };

        if (authService.isAuthenticated()) {
            loadMe();
        }
    }, []);

    const handleLogout = () => {
        authService.logout();
        router.push("/login");
    };

    const displayName =
        me?.employee?.full_name || me?.full_name || me?.username || "User";

    const displayUnit =
        me?.employee?.department ||
        me?.employee?.branch?.branch_name ||
        me?.roles?.[0]?.role_name ||
        "";

    return (
        <header
            className={`fixed right-0 top-0 z-40 h-14 border-b border-[#10b981] bg-white shadow-sm transition-all duration-300 ${
                isPinned ? "left-0 lg:left-[300px]" : "left-0"
            }`}
        >
            <div className="flex h-full items-center justify-between">
                <div className="flex h-full items-center">
                    {/* icon sidebar width */}
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="flex h-full w-10 items-center justify-center bg-[#10b981] hover:bg-[#059669]"
                        aria-label="Open main menu"
                    >
                        <div className="space-y-1">
                            <span className="block h-0.5 w-5 bg-white" />
                            <span className="block h-0.5 w-5 bg-white" />
                            <span className="block h-0.5 w-5 bg-white" />
                        </div>
                    </button>

                    {/* logo area width */}
                    <div className="flex h-full w-[220px] items-center border-r px-5">
                        <Image
                            src="/images/logo-PHS-nbg.png"
                            alt="PHS Logo"
                            width={110}
                            height={40}
                            className="h-auto w-[100px] object-contain"
                            priority
                        />
                    </div>

                    {/* search */}
                    <div className="ml-8 flex h-9 w-[420px] items-center rounded-md border border-slate-300 bg-white px-3">
                        <Search size={16} className="text-slate-400" />
                        <input
                            placeholder="Nhập để tìm kiếm"
                            className="ml-2 flex-1 text-sm text-slate-700 outline-none"
                        />
                        <ChevronDown size={16} className="text-slate-400" />
                    </div>
                </div>

                <div className="flex h-full items-center gap-4 pr-5 text-slate-600">
                    <ShieldQuestion size={17} />
                    <Megaphone size={17} />
                    <PlusCircle size={17} />
                    <Bell size={17} />
                    <MessageCircle size={17} />
                    <CalendarDays size={17} />
                    <ChartNoAxesColumnIncreasing size={17} />

                    <div className="hidden items-center gap-1 text-sm font-medium xl:flex">
                        <span className="text-slate-700">{displayName}</span>
                        {displayUnit && (
                            <span className="text-slate-400">({displayUnit})</span>
                        )}
                    </div>

                    <UserRound size={18} />
                    <CircleHelp size={18} />
                    <Settings size={18} />

                    <button
                        onClick={handleLogout}
                        className="rounded-md p-1.5 hover:bg-slate-100"
                        title="Đăng xuất"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}