"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileSpreadsheet,
  List,
  PlusCircle,
} from "lucide-react";
import { CccPeriodControls } from "@/components/common";
import { GranularityMode, CompareMode } from "@/components/tickets/dashboard/CccDashboardUtils";

interface EkycHeaderNavProps {
  granularity?: GranularityMode;
  onGranularityChange?: (g: GranularityMode) => void;
  compareMode?: CompareMode;
  onCompareModeChange?: (c: CompareMode) => void;
}

export function EkycHeaderNav({
  granularity = "MONTH",
  onGranularityChange,
  compareMode = "NONE",
  onCompareModeChange,
}: EkycHeaderNavProps) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/ekyc/dashboard");

  const actions = [
    {
      label: "Dashboard",
      href: "/ekyc/dashboard",
      icon: BarChart3,
      active: pathname.startsWith("/ekyc/dashboard"),
    },
    {
      label: "Danh sách eKYC",
      href: "/ekyc",
      icon: List,
      active: pathname === "/ekyc",
    },
    {
      label: "Nhập eKYC mới",
      href: "/ekyc/create",
      icon: PlusCircle,
      active: pathname.startsWith("/ekyc/create"),
    },
    {
      label: "Import Excel",
      href: "/ekyc/import",
      icon: FileSpreadsheet,
      active: pathname.startsWith("/ekyc/import"),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isDashboard && onGranularityChange && onCompareModeChange && (
        <CccPeriodControls
          granularity={granularity}
          onGranularityChange={onGranularityChange}
          compareMode={compareMode}
          onCompareModeChange={onCompareModeChange}
        />
      )}

      <div className="flex items-center gap-1.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.href}
              href={act.href}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                act.active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                size={14}
                className={act.active ? "text-white" : "text-emerald-600"}
              />
              <span>{act.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
