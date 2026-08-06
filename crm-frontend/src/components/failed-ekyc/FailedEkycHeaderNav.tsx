"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileSpreadsheet, List, PlusCircle } from "lucide-react";
import { CccPeriodControls } from "@/components/common";
import { CompareMode, GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";

interface Props { granularity?: GranularityMode; onGranularityChange?: (value: GranularityMode) => void; compareMode?: CompareMode; onCompareModeChange?: (value: CompareMode) => void; }
export function FailedEkycHeaderNav({ granularity = "MONTH", onGranularityChange, compareMode = "NONE", onCompareModeChange }: Props) {
  const path = usePathname();
  const isDashboard = path.startsWith("/failed-ekyc/dashboard");
  const links = [
    ["Dashboard", "/failed-ekyc/dashboard", BarChart3], ["Danh sách", "/failed-ekyc", List],
    ["Nhập mới", "/failed-ekyc/create", PlusCircle], ["Import Excel", "/failed-ekyc/import", FileSpreadsheet],
  ] as const;
  return <div className="flex flex-wrap items-center gap-2">{isDashboard && onGranularityChange && onCompareModeChange && <CccPeriodControls granularity={granularity} onGranularityChange={onGranularityChange} compareMode={compareMode} onCompareModeChange={onCompareModeChange}/>}<div className="flex flex-wrap gap-1.5">{links.map(([label, href, Icon]) => { const active = href === "/failed-ekyc" ? path === href : path.startsWith(href); return <Link key={href} href={href} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${active ? "bg-emerald-600 text-white shadow-sm" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={14} className={active ? "text-white" : "text-emerald-600"}/>{label}</Link>; })}</div></div>;
}
