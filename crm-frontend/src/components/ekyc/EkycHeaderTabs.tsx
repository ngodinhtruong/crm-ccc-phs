"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileSpreadsheet,
  List,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";

export function EkycHeaderTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Dashboard",
      href: "/ekyc/dashboard",
      icon: BarChart3,
      active: pathname.startsWith("/ekyc/dashboard"),
    },
    {
      name: "Danh sách eKYC",
      href: "/ekyc",
      icon: List,
      active: pathname === "/ekyc",
    },
    {
      name: "Nhập eKYC mới",
      href: "/ekyc/create",
      icon: PlusCircle,
      active: pathname.startsWith("/ekyc/create"),
    },
    {
      name: "Import Excel",
      href: "/ekyc/import",
      icon: FileSpreadsheet,
      active: pathname.startsWith("/ekyc/import"),
    },
  ];

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">QUẢN LÝ eKYC</h1>
          <p className="text-xs text-slate-500">
            Theo dõi, tra cứu và ghi nhận thông tin cuộc gọi eKYC Khách hàng
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                tab.active
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
