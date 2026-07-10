import { HomeTabKey } from "@/types/dashboard.type";

export function HomePlaceholderPanel({
  tab,
}: {
  tab: HomeTabKey;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
      Chưa cấu hình dữ liệu cho tab <span className="font-semibold">{tab}</span>.
    </div>
  );
}