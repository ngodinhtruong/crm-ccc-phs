"use client";

import { KpiConfigTab } from "@/hooks/useKpiConfig";

const tabs: { key: KpiConfigTab; label: string }[] = [
  { key: "metrics", label: "Chỉ tiêu KPI" },
  { key: "groups", label: "Phần & Nhóm KPI" },
  { key: "icp", label: "Phân khúc KH (ICP)" },
  // Ẩn 2 tab bên dưới để phát triển sau
  // { key: "gates", label: "Gate Conditions" },
  // { key: "rewards", label: "Bậc thưởng" },
];

export function KpiConfigTabs({
  activeTab,
  onChange,
}: {
  activeTab: KpiConfigTab;
  onChange: (tab: KpiConfigTab) => void;
}) {
  return (
    <div className="flex h-12 items-center justify-center border-b border-slate-200 bg-slate-50/50 px-4">
      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={[
                "h-8 px-4 rounded-md transition-all font-bold",
                active
                  ? "bg-white text-[#059669] shadow-sm ring-1 ring-emerald-500/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
