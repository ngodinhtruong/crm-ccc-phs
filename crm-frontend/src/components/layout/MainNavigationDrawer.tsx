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
    Trash2,
    UserCog,
    Users,
    UsersRound,
    X,
    BotMessageSquare,
} from "lucide-react";

type MainNavigationDrawerProps = {
    open: boolean;
    onClose: () => void;
};

type PanelKey =
    | "customers"
    | "surveys"
    | "tickets"
    | "reports"
    | "utilities"
    | "settings";

type MainMenuItem = {
    title: string;
    href: string;
    icon: ElementType;
    panel?: PanelKey;
};

type PanelGroup = {
    title: string;
    items: {
        title: string;
        href: string;
        icon: ElementType;
    }[];
};

const mainMenuItems: MainMenuItem[] = [
    {
        title: "TRANG CHỦ",
        href: "/",
        icon: Gauge,
    },
    {
        title: "KHÁCH HÀNG",
        href: "/customers",
        icon: Users,
        panel: "customers",
    },
    {
        title: "KHẢO SÁT",
        href: "/surveys",
        icon: ClipboardList,
        panel: "surveys",
    },
    {
        title: "CSKH",
        href: "/tickets",
        icon: Headphones,
        panel: "tickets",
    },
    {
        title: "BÁO CÁO",
        href: "/reports",
        icon: BarChart3,
        panel: "reports",
    },
    {
        title: "TIỆN ÍCH",
        href: "/utilities",
        icon: BriefcaseBusiness,
        panel: "utilities",
    },
    {
        title: "CẤU HÌNH",
        href: "/settings",
        icon: Settings,
        panel: "settings",
    },
];

const panelGroups: Record<PanelKey, PanelGroup[]> = {
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
            title: "MARKETING",
            items: [
                {
                    title: "Mẫu Email",
                    href: "/marketing/email-templates",
                    icon: Mail,
                },
                {
                    title: "Mẫu tin nhắn",
                    href: "/marketing/message-templates",
                    icon: MessageSquare,
                },
                {
                    title: "Chiến dịch",
                    href: "/marketing/campaigns",
                    icon: Megaphone,
                },
                {
                    title: "Danh sách Khảo sát",
                    href: "/surveys",
                    icon: ClipboardList,
                },
                {
                    title: "Kết quả khảo sát",
                    href: "/surveys/results",
                    icon: FileCheck2,
                },
            ],
        },
    ],

    tickets: [
        {
            title: "CSKH",
            items: [
                {
                    title: "Ticket",
                    href: "/tickets",
                    icon: FileCheck2,
                },
                {
                    title:"Chatbots",
                    href: "/chatbots",
                    icon: BotMessageSquare,
                },
                {
                    title: "Kho kiến thức",
                    href: "/knowledge-base",
                    icon: CircleHelp,
                },
                {
                    title: "Lịch sử phản hồi",
                    href: "/feedback-history",
                    icon: MessagesSquare,
                },
                {
                    title: "Danh mục SLA",
                    href: "/sla",
                    icon: CalendarDays,
                },
                {
                    title: "Lịch sử cuộc gọi",
                    href: "/calls",
                    icon: PhoneCall,
                },
                {
                    title: "Theo dõi sự cố",
                    href: "/incidents",
                    icon: AlertTriangle,
                },
                {
                    title: "Lịch sử SMS/OTT",
                    href: "/sms-history",
                    icon: MessageSquare,
                },
            ],
        },
    ],

    reports: [
        {
            title: "BÁO CÁO",
            items: [
                {
                    title: "Tất cả các báo cáo",
                    href: "/reports",
                    icon: BarChart3,
                },
            ],
        },
        {
            title: "Báo cáo khảo sát",
            items: [
                {
                    title: "TRẠNG THÁI CUỘC GỌI",
                    href: "/reports/call-status",
                    icon: FileBarChart,
                },
                {
                    title: "TỶ LỆ KẾT NỐI",
                    href: "/reports/connect-rate",
                    icon: FileBarChart,
                },
                {
                    title: "THỜI GIAN ĐÀM THOẠI",
                    href: "/reports/talk-time",
                    icon: FileBarChart,
                },
                {
                    title: "KẾT QUẢ VÀ HIỆU SUẤT ...",
                    href: "/reports/performance",
                    icon: FileBarChart,
                },
                {
                    title: "THỐNG KÊ SỐ LƯỢNG C...",
                    href: "/reports/call-count",
                    icon: FileBarChart,
                },
            ],
        },
        {
            title: "Báo cáo Ticket",
            items: [
                {
                    title: "THỜI GIAN XỬ LÝ TICKET ...",
                    href: "/reports/ticket-processing-time",
                    icon: FileBarChart,
                },
                {
                    title: "THỜI GIAN XỬ LÝ TRUNG...",
                    href: "/reports/ticket-average-time",
                    icon: FileBarChart,
                },
                {
                    title: "THỜI GIAN XỬ LÝ TÁC VỤ...",
                    href: "/reports/task-processing-time",
                    icon: FileBarChart,
                },
                {
                    title: "THỜI GIAN XỬ LÝ TÁC VỤ...",
                    href: "/reports/task-average-time",
                    icon: FileBarChart,
                },
            ],
        },
    ],

    utilities: [
        {
            title: "TIỆN ÍCH",
            items: [
                {
                    title: "Lịch",
                    href: "/utilities/calendar",
                    icon: CalendarDays,
                },
                {
                    title: "Tài liệu",
                    href: "/utilities/documents",
                    icon: Folder,
                },
                {
                    title: "Thùng rác",
                    href: "/utilities/trash",
                    icon: Trash2,
                },
                {
                    title: "Hộp mail",
                    href: "/utilities/mailbox",
                    icon: Inbox,
                },
                {
                    title: "Báo cáo",
                    href: "/utilities/reports",
                    icon: FileBarChart,
                },
            ],
        },
    ],

    settings: [
        {
            title: "CẤU HÌNH",
            items: [
                {
                    title: "Tùy chọn cá nhân",
                    href: "/settings/profile",
                    icon: UserCog,
                },
                {
                    title: "Cấu hình Telesales",
                    href: "/settings/telesales",
                    icon: Headphones,
                },
                {
                    title: "Tích hợp mạng xã ...",
                    href: "/settings/social-integration",
                    icon: Globe,
                },
                {
                    title: "Cấu hình phân bổ ...",
                    href: "/settings/assignment",
                    icon: UsersRound,
                },
                {
                    title: "Chuyển đổi Email",
                    href: "/settings/email-convert",
                    icon: MailCheck,
                },
            ],
        },
    ],
};

const panelTitleMap: Record<PanelKey, string> = {
    customers: "KHÁCH HÀNG",
    surveys: "KHẢO SÁT",
    tickets: "CSKH",
    reports: "BÁO CÁO",
    utilities: "TIỆN ÍCH",
    settings: "CẤU HÌNH",
};
const getPanelWidthClass = (activePanel: PanelKey | null) => {
    if (!activePanel) return "w-0 opacity-0";

    if (activePanel === "reports") {
        return "w-[640px] opacity-100";
    }

    return "w-[420px] opacity-100";
};

const getPanelInnerWidthClass = (activePanel: PanelKey | null) => {
    if (activePanel === "reports") {
        return "min-w-[640px]";
    }

    return "min-w-[420px]";
};

const getPanelGridClass = (activePanel: PanelKey | null) => {
    if (activePanel === "reports") {
        return "grid-cols-2";
    }

    return "grid-cols-1";
};

export function MainNavigationDrawer({
    open,
    onClose,
}: MainNavigationDrawerProps) {
    const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

    const handleClose = () => {
        setActivePanel(null);
        onClose();
    };

    const activeGroups = activePanel ? panelGroups[activePanel] : [];

    return (
        <>
            {open && (
                <button
                    type="button"
                    onClick={handleClose}
                    className="fixed inset-0 z-40 bg-black/20"
                    aria-label="Close menu overlay"
                />
            )}

            <aside
                onMouseLeave={() => setActivePanel(null)}
                className={`fixed left-0 top-0 z-50 flex h-screen bg-[#263747] text-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Main drawer */}
                <div className="h-screen w-[200px] border-r border-white/10 bg-[#263747]">
                    <div className="flex h-[56px] items-center justify-between border-b border-white/10 px-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex h-9 w-9 items-center justify-center rounded hover:bg-white/10"
                            aria-label="Close menu"
                        >
                            <X size={22} />
                        </button>

                        <Pin size={22} className="text-white/50" />
                    </div>

                    <nav className="py-3">
                        {mainMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePanel === item.panel;

                            if (item.panel) {
                                return (
                                    <button
                                        key={item.title}
                                        type="button"
                                        onMouseEnter={() => setActivePanel(item.panel!)}
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
                                    key={item.title}
                                    href={item.href}
                                    onMouseEnter={() => setActivePanel(null)}
                                    onClick={handleClose}
                                    className="flex h-[40px] items-center gap-4 px-5 text-white/80 transition hover:bg-white/10 hover:text-white"
                                >
                                    <Icon size={27} className="shrink-0 text-white/70" />

                                    <span className="flex-1 text-[10px] font-semibold tracking-wide">
                                        {item.title}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Mega panel */}
                <div
                    onMouseEnter={() => {
                        if (activePanel) setActivePanel(activePanel);
                    }}
                    className={`h-screen overflow-y-auto bg-[#263747] transition-all duration-300 ${getPanelWidthClass(
                        activePanel
                    )}`}
                >
                    <div className={`${getPanelInnerWidthClass(activePanel)} px-6 py-6`}>
                        {activePanel && (
                            <>
                                <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Menu size={22} className="text-white/55" />

                                        <h2 className="text-[22px] font-semibold tracking-wide text-[#b9d8e8]">
                                            {panelTitleMap[activePanel]}
                                        </h2>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setActivePanel(null)}
                                        className="rounded-md px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white"
                                    >
                                        Thu gọn
                                    </button>
                                </div>

                                <div className={`grid gap-4 ${getPanelGridClass(activePanel)}`}>
                                    {activeGroups.map((group) => (
                                        <section
                                            key={group.title}
                                            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                                        >
                                            <h3 className="mb-4 text-[16px] font-semibold text-[#b9d8e8]">
                                                {group.title}
                                            </h3>

                                            <div className="space-y-2">
                                                {group.items.map((item, index) => {
                                                    const Icon = item.icon;

                                                    return (
                                                        <Link
                                                            key={`${group.title}-${item.href}-${index}`}
                                                            href={item.href}
                                                            onClick={handleClose}
                                                            className="group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                                                        >
                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/55 group-hover:bg-orange-500 group-hover:text-white">
                                                                <Icon size={17} />
                                                            </span>

                                                            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5">
                                                                {item.title}
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}