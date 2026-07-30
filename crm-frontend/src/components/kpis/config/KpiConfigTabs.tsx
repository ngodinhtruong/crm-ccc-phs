"use client";

import { KpiConfigTab } from "@/hooks/useKpiConfig";

const tabs: { key: KpiConfigTab; label: string }[] = [
  { key: "metrics", label: "Chỉ tiêu KPI" },
  { key: "groups", label: "Phần & Nhóm KPI" },
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
    <div className="flex h-12 items-center justify-center border-b bg-white px-4">
      <div className="inline-flex overflow-hidden rounded border border-sky-300 text-xs font-semibold">
        {tabs.map((tab, index) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={[
                "h-8 px-5",
                index > 0 ? "border-l border-emerald-300" : "",
                active
                  ? "bg-[#10b981] text-white"
                  : "bg-white text-[#059669] hover:bg-emerald-50",
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
