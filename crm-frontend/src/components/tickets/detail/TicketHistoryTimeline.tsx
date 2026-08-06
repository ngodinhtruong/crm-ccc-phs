"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock, User } from "lucide-react";

import { ticketApi } from "@/apis/ticket.api";
import { TicketHistoryItem } from "@/types/ticket.type";
import { formatDateTime } from "@/utils/date.util";

const ACTION_LABEL: Record<string, string> = {
  CREATE: "Tạo ticket",
  AMEND: "Sửa thông tin",
  UPDATE_STATUS: "Đổi trạng thái",
  ASSIGN: "Phân công",
  TRANSFER_UNIT: "Chuyển đơn vị",
  TRANSFER_BRANCH: "Chuyển chi nhánh",
  REASSIGN: "Chuyển xử lý",
  CLOSE: "Đóng ticket",
  CANCEL: "Hủy ticket",
};

// Tên field tiếng Việt để dịch action_name (backend ghi tiếng Anh dạng "Amend <field>")
const FIELD_LABEL: Record<string, string> = {
  support_category: "Danh mục hỗ trợ",
  classification: "Phân loại",
  source: "Nguồn",
  priority: "Mức ưu tiên",
  sla_policy: "Danh mục SLA",
  status: "Tình trạng",
  current_status: "Tình trạng",
  customer: "Khách hàng",
  company: "Công ty",
  customer_account: "Số tài khoản",
  error_group: "Nhóm lỗi",
  error_type: "Loại lỗi",
  related_system: "Hệ thống liên quan",
  error_note: "Ghi chú lỗi",
  request_content: "Nội dung yêu cầu",
  handling_solution: "Hướng xử lý",
  final_response: "Phản hồi cuối",
  title: "Tiêu đề",
  account_link_status: "Trạng thái liên kết TK",
};

const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  AMEND: "bg-emerald-100 text-emerald-700",
  UPDATE_STATUS: "bg-violet-100 text-violet-700",
  ASSIGN: "bg-amber-100 text-amber-700",
  REASSIGN: "bg-amber-100 text-amber-700",
  CLOSE: "bg-slate-100 text-slate-600",
  CANCEL: "bg-rose-100 text-rose-700",
};

/** Chuyển action_name tiếng Anh sang tiếng Việt. */
function translateActionName(actionName: string): string {
  if (!actionName) return "";

  const fixed: Record<string, string> = {
    "Create ticket": "Tạo ticket",
    "Update ticket status": "Đổi trạng thái",
    "Assign / transfer ticket": "Phân công / chuyển xử lý",
  };

  if (fixed[actionName]) return fixed[actionName];

  // Dạng "Amend <field_name>" → "Sửa <tên tiếng Việt>"
  if (actionName.startsWith("Amend ")) {
    const field = actionName.slice("Amend ".length).trim();
    return `Sửa ${FIELD_LABEL[field] || field}`;
  }

  return actionName;
}

/**
 * Dòng thời gian thay đổi của một ticket.
 *
 * Tách khỏi modal để tab "Nhật ký" và popup "Lịch sử" dùng chung một bản —
 * hai bản song song thì sửa nhãn hành động ở chỗ này lại quên chỗ kia.
 */
export function TicketHistoryTimeline({
  ticketId,
  fetchHistory,
}: {
  ticketId: number;
  /** Hàm lấy lịch sử — mặc định ticket thường; ticket chatbot truyền hàm riêng. */
  fetchHistory?: (id: number) => Promise<TicketHistoryItem[]>;
}) {
  const [items, setItems] = useState<TicketHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loader = fetchHistory || ticketApi.getTicketHistory;

    loader(ticketId)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setError("Không tải được lịch sử thay đổi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId, fetchHistory]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Đang tải...</p>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-rose-600">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Chưa có thay đổi nào.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-3">
          {/* Cột mốc thời gian */}
          <div className="flex flex-col items-center">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {index < items.length - 1 && (
              <div className="w-px flex-1 bg-slate-200" />
            )}
          </div>

          {/* Nội dung */}
          <div className="flex-1 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  ACTION_COLOR[item.action_type] || "bg-slate-100 text-slate-600"
                }`}
              >
                {ACTION_LABEL[item.action_type] || item.action_type}
              </span>
              <span className="text-xs font-medium text-slate-700">
                {translateActionName(item.action_name)}
              </span>
            </div>

            {/* Giá trị cũ → mới */}
            {(item.old_value || item.new_value) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                {item.old_value ? (
                  <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-700 line-through">
                    {item.old_value}
                  </span>
                ) : (
                  <span className="text-slate-400">(trống)</span>
                )}
                <ArrowRight size={12} className="text-slate-400" />
                <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                  {item.new_value || "(trống)"}
                </span>
              </div>
            )}

            {/* Ai đổi + khi nào */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <User size={11} />
                {item.changed_by || "Hệ thống"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {formatDateTime(item.created_at)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
