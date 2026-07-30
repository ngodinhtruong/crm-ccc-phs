import { ActiveTab } from "@/types/chatbot-dashboard.type";

export function DashboardTabs({
  activeTab,
  onChange,
}: {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}) {
  return (
    <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      <TabButton
        active={activeTab === "overview"}
        onClick={() => onChange("overview")}
      >
        Tổng quan
      </TabButton>

      <TabButton
        active={activeTab === "tickets"}
        onClick={() => onChange("tickets")}
      >
        Tickets
      </TabButton>

      <TabButton active={activeTab === "faqs"} onClick={() => onChange("faqs")}>
        FAQ
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl px-5 text-sm font-semibold transition ${
        active
          ? "bg-[#10b981] text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}