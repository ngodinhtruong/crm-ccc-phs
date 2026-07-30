import { HomeTabKey } from "@/types/dashboard.type";

const HOME_TABS: HomeTabKey[] = [
  "Ticket",
  "Call Center",
  "Hoạt động",
  "Ghi chú",
];

export function HomeTabs({
  activeTab,
  onChange,
}: {
  activeTab: HomeTabKey;
  onChange: (tab: HomeTabKey) => void;
}) {
  return (
    <div className="flex h-12 items-end border-b bg-white px-4">
      {HOME_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`mr-1 rounded-t border px-4 py-2 text-xs font-semibold ${
            activeTab === tab
              ? "border-b-white bg-white text-[#059669]"
              : "bg-slate-50 text-slate-700 hover:bg-white"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}