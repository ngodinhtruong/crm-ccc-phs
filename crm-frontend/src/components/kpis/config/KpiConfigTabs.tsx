"use client";

import { KpiConfigTab } from "@/hooks/useKpiConfig";

const tabs: { key: KpiConfigTab; label: string }[] = [
  { key: "metrics", label: "Chỉ tiêu KPI" },
  { key: "groups", label: "Nhóm KPI" },
  { key: "gates", label: "Gate Conditions" },
  { key: "rewards", label: "Bậc thưởng" },
];

export function KpiConfigTabs({
  activeTab,
  onChange,
}: {
  activeTab: KpiConfigTab;
  onChange: (tab: KpiConfigTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b bg-white px-4 pt-3">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={[
              "border-b-2 px-3 pb-3 text-xs font-semibold",
              active
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}