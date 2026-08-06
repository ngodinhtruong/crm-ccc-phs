"use client";

import { Hammer } from "lucide-react";

/**
 * Thanh tab của màn chi tiết ticket.
 *
 * Giữ đủ các tab theo thiết kế, kể cả những tab chưa có dữ liệu trong hệ
 * thống: `comingSoon` đánh dấu tab chỉ có khung, phần thân hiện "đang phát
 * triển" thay vì trang trắng. Ai thêm dữ liệu cho tab nào thì bỏ cờ ở đúng
 * dòng đó, không phải sửa chỗ nào khác.
 */
export const TICKET_DETAIL_TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "detail", label: "Chi tiết" },
  { key: "history", label: "Nhật ký" },
  { key: "feedback", label: "Phản hồi", comingSoon: true },
  { key: "tasks", label: "Nhật ký tác vụ", comingSoon: true },
  { key: "activity", label: "Hoạt động", comingSoon: true },
  { key: "documents", label: "Tài liệu", comingSoon: true },
  { key: "comments", label: "Bình luận", comingSoon: true },
  { key: "messaging", label: "Lịch sử SMS/OTT", comingSoon: true },
  { key: "survey", label: "Kết quả khảo sát" },
] as const;

export type TicketDetailTabKey = (typeof TICKET_DETAIL_TABS)[number]["key"];

type TicketDetailTab = {
  key: TicketDetailTabKey;
  label: string;
  comingSoon?: boolean;
};

/** Các tab chứa trường sửa được — vào chế độ sửa phải đứng ở một trong hai. */
export const EDITABLE_TABS: TicketDetailTabKey[] = ["overview", "detail"];

export function getTicketDetailTab(key: TicketDetailTabKey): TicketDetailTab {
  return (TICKET_DETAIL_TABS as readonly TicketDetailTab[]).find(
    (tab) => tab.key === key
  )!;
}

/** Thân của một tab chưa có dữ liệu. */
export function TicketTabComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
        <Hammer size={18} className="text-amber-600" />
      </div>

      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="max-w-sm text-xs text-slate-500">
        Chức năng đang phát triển. Phần này sẽ hiển thị dữ liệu khi được đưa
        vào hệ thống.
      </p>
    </div>
  );
}

export function TicketDetailTabs({
  active,
  onChange,
  surveyCount,
}: {
  active: TicketDetailTabKey;
  onChange: (key: TicketDetailTabKey) => void;
  /** Số lần gửi khảo sát, hiện ngay trên tab để khỏi phải bấm vào mới biết. */
  surveyCount?: number;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2">
      {(TICKET_DETAIL_TABS as readonly TicketDetailTab[]).map((tab) => {
        const selected = tab.key === active;

        // Tab chưa có dữ liệu để nhạt hơn: nhìn là biết chưa dùng được, khỏi
        // bấm thử hết sáu tab mới rõ.
        const idle = tab.comingSoon
          ? "border-transparent text-slate-400 hover:text-slate-600"
          : "border-transparent text-slate-500 hover:text-slate-700";

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            title={tab.comingSoon ? "Đang phát triển" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold ${
              selected ? "border-emerald-500 text-emerald-600" : idle
            }`}
          >
            {tab.label}

            {tab.key === "survey" && surveyCount ? (
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">
                {surveyCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
