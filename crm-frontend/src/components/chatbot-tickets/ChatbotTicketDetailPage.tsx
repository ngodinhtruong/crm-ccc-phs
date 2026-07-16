"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquareText, Pencil, Phone } from "lucide-react";

import { chatbotTicketApi } from "@/apis/chatbot-ticket.api";
import { ConversationModal } from "@/components/chatbot-dashboard/ConversationModal";
import { TicketStatusFlow } from "@/components/chatbot-tickets/TicketStatusFlow";
import { UpdateStatusModal } from "@/components/chatbot-tickets/UpdateStatusModal";
import { CHATBOT_TICKET_STATUS_PILL } from "@/constants/chatbot-ticket.constant";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ChatbotTicketItem } from "@/types/chatbot-dashboard.type";
import { ChatbotTicket } from "@/types/chatbot-ticket.type";
import { formatDateTime } from "@/utils/date.util";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="col-span-1 text-right text-xs font-semibold text-slate-500">
        {label}
      </div>
      <div className="col-span-2 text-xs text-slate-800">{children || "-"}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
        {title}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export function ChatbotTicketDetailPage({ id }: { id: number }) {
  const router = useRouter();

  const [ticket, setTicket] = useState<ChatbotTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [solution, setSolution] = useState("");
  const [solutionSaved, setSolutionSaved] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await chatbotTicketApi.getDetail(id);

      setTicket(data.ticket);
      setSolution(data.ticket.handling_solution || "");
    } catch {
      setError("Không tải được chi tiết ticket.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSolution = async () => {
    if (!ticket) return;

    try {
      setSaving(true);
      setSolutionSaved(false);
      const updated = await chatbotTicketApi.updateSolution(ticket.id, solution);
      setTicket(updated);
      setSolutionSaved(true);
    } catch {
      setError("Không lưu được giải pháp xử lý.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Chatbot", href: "/chatbots/dashboard" },
        { label: "Ticket chuyển CCC" },
        { label: ticket?.ticket_code || "Chi tiết" },
      ]}
      rightAction={
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={14} />
          Quay lại
        </button>
      }
    >
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải...
        </div>
      )}

      {!loading && error && !ticket && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-600">
          {error}
        </div>
      )}

      {ticket && (
        <div className="flex flex-col gap-4">
          {/* Header: mã ticket + nút Sửa + thanh trạng thái */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-sm text-slate-600">
                Mã ticket:{" "}
                <span className="font-bold text-sky-600">
                  {ticket.ticket_code}
                </span>
              </p>

              <div className="flex items-center gap-3">
                {error && (
                  <span className="text-xs font-semibold text-rose-600">
                    {error}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowUpdate(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  <Pencil size={13} />
                  Cập nhật tình trạng
                </button>
              </div>
            </div>

            <TicketStatusFlow status={ticket.status} />
          </div>

          <Section title="Thông tin chung">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Mã Ticket">{ticket.ticket_code}</Field>

              <Field label="Danh mục hỗ trợ">
                {ticket.dashboard_category ? (
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {ticket.dashboard_category}
                  </span>
                ) : (
                  <span className="text-slate-400">Chưa phân loại</span>
                )}
              </Field>

              <Field label="Kênh">{ticket.channel}</Field>

              {/* Tình trạng: chỉ hiển thị, đổi qua nút "Cập nhật tình trạng" */}
              <Field label="Tình trạng">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    CHATBOT_TICKET_STATUS_PILL[ticket.status]
                  }`}
                >
                  {ticket.status_label || ticket.status}
                </span>
              </Field>

              <Field label="Nguồn">Chatbot</Field>
              <Field label="Mức ưu tiên">{ticket.priority_name}</Field>
            </div>
          </Section>

          <Section title="Thông tin liên hệ">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Khách hàng">
                {ticket.customer_name || (
                  <span className="text-slate-400">Chưa xác định</span>
                )}
              </Field>
              <Field label="Trạng thái TK">
                {ticket.link_status === "LINKED" ? (
                  <span className="font-semibold text-emerald-600">
                    Đã liên kết KH
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600">
                    Chưa có TK liên kết
                  </span>
                )}
              </Field>
              <Field label="Di động">
                {ticket.phone ? (
                  <span className="inline-flex items-center gap-1 text-sky-600">
                    {ticket.phone}
                    <Phone size={12} />
                  </span>
                ) : null}
              </Field>
              <Field label="Số tài khoản">{ticket.account_number}</Field>
              <Field label="Email">{ticket.email}</Field>
            </div>
          </Section>

          {/* Thông tin mô tả — bấm nút mới mở modal xem lịch sử trò chuyện */}
          <Section title="Thông tin mô tả">
            <div className="flex flex-col gap-3">
              {ticket.reason && (
                <div className="rounded-lg bg-amber-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase text-amber-700">
                    CÂU HỎI CỦA KHÁCH HÀNG
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-xs text-amber-900">
                    {ticket.reason}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowConversation(true)}
                className="flex w-fit items-center gap-2 rounded-lg bg-[#0097cf] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
              >
                <MessageSquareText size={14} />
                Xem lịch sử trò chuyện
              </button>
            </div>
          </Section>

          {/* Giải pháp xử lý: người xử lý điền */}
          <Section title="Giải pháp xử lý">
            <textarea
              value={solution}
              onChange={(event) => {
                setSolution(event.target.value);
                setSolutionSaved(false);
              }}
              rows={4}
              placeholder="Nhập cách xử lý ticket..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSolution()}
                className="rounded-lg bg-[#0097cf] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0089bd] disabled:opacity-60"
              >
                Lưu giải pháp
              </button>
              {solutionSaved && (
                <span className="text-xs font-semibold text-emerald-600">
                  Đã lưu
                </span>
              )}
            </div>
          </Section>

          {/* Quản lý SLA */}
          <Section title="Quản lý SLA">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Danh mục SLA">
                {ticket.sla_policy_name || (
                  <span className="text-slate-400">Chưa chọn</span>
                )}
              </Field>
              <Field label="Mức ưu tiên">{ticket.priority_name}</Field>
              <Field label="Ngày tiếp nhận">
                {formatDateTime(ticket.accepted_at)}
              </Field>
              <Field label="Ngày hoàn thành">
                {formatDateTime(ticket.done_at)}
              </Field>
              <Field label="Có gửi khảo sát">
                {ticket.send_survey ? "Có" : "Không"}
              </Field>
            </div>
          </Section>

          {/* Thông tin quản lý */}
          <Section title="Thông tin quản lý">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Giao cho">
                {ticket.owner_username || (
                  <span className="text-slate-400">Chưa giao</span>
                )}
              </Field>
              <Field label="Người phụ trách">
                {ticket.assigned_employee_name ||
                  ticket.owner_username || (
                    <span className="text-slate-400">Chưa có</span>
                  )}
              </Field>
              <Field label="Phòng ban">
                {ticket.assigned_employee_department || "-"}
              </Field>
              <Field label="Phân công xử lý">
                {ticket.assigned_unit_name || "-"}
              </Field>
              <Field label="Chi nhánh xử lý">
                {ticket.handling_branch_name || "-"}
              </Field>
              <Field label="Thời gian nhận ticket">
                {formatDateTime(ticket.accepted_at)}
              </Field>
              <Field label="Lần sửa đổi cuối">
                {formatDateTime(ticket.updated_at)}
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* Modal lịch sử trò chuyện — giống hệt bấm ở ngoài danh sách */}
      {ticket && showConversation && (
        <ConversationModal
          session={
            {
              id: ticket.id,
              session_id: ticket.source_ref_id || "",
              category_label:
                ticket.category_label || ticket.dashboard_category,
              contact_info: ticket.contact_info,
              reason: ticket.reason,
              ticket_code: ticket.ticket_code,
              outcome_label: "Chuyển CCC xử lý",
              outcome_type: "CCC",
              started_at: ticket.created_at,
            } as ChatbotTicketItem
          }
          onClose={() => setShowConversation(false)}
        />
      )}

      {/* Modal cập nhật tình trạng */}
      {ticket && showUpdate && (
        <UpdateStatusModal
          ticket={ticket}
          onClose={() => setShowUpdate(false)}
          onSaved={(updated) => {
            setTicket(updated);
            setSolution(updated.handling_solution || "");
          }}
        />
      )}
    </DashboardLayout>
  );
}
