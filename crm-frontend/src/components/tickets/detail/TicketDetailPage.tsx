"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { ticketApi } from "@/apis/ticket.api";
import { TicketStatusFlow } from "@/components/tickets/detail/TicketStatusFlow";
import { TicketUpdateStatusModal } from "@/components/tickets/detail/TicketUpdateStatusModal";
import { TICKET_STATUS_PILL } from "@/constants/ticket-detail.constant";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { TicketDetail, TicketStatusCode } from "@/types/ticket.type";
import { formatDateTime } from "@/utils/date.util";

function Field({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  const empty = children === null || children === undefined || children === "";

  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="col-span-1 text-right text-xs font-semibold text-slate-500">
        {label}
      </div>
      <div className="col-span-2 text-xs text-slate-800">
        {empty ? <span className="text-slate-300">—</span> : children}
      </div>
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

export function TicketDetailPage({ id }: { id: number }) {
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpdate, setShowUpdate] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setTicket(await ticketApi.getTicketById(id));
    } catch {
      setError("Không tải được chi tiết ticket.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusCode = (ticket?.current_status_code || "") as TicketStatusCode;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Tickets", href: "/tickets" },
        { label: ticket?.ticket_code || "Chi tiết" },
      ]}
      rightAction={
        <button
          type="button"
          onClick={() => router.push("/tickets")}
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
          {/* Header: mã ticket + nút cập nhật + thanh trạng thái */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <p className="text-sm text-slate-600">
                Mã ticket:{" "}
                <span className="font-bold text-sky-600">
                  {ticket.ticket_code}
                </span>
                {ticket.is_locked_for_amend && (
                  <span className="ml-3 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    Đã khóa sửa
                  </span>
                )}
              </p>

              <button
                type="button"
                onClick={() => setShowUpdate(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                <Pencil size={13} />
                Cập nhật tình trạng
              </button>
            </div>

            <TicketStatusFlow status={statusCode} />
          </div>

          <Section title="Thông tin chung">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Mã Ticket">{ticket.ticket_code}</Field>
              <Field label="Tiêu đề">{ticket.title}</Field>

              <Field label="Danh mục hỗ trợ">
                {ticket.support_category_name && (
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {ticket.support_category_name}
                  </span>
                )}
              </Field>
              <Field label="Phân loại">{ticket.classification_name}</Field>

              <Field label="Tình trạng">
                {statusCode && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      TICKET_STATUS_PILL[statusCode] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ticket.current_status_name}
                  </span>
                )}
              </Field>
              <Field label="Mức ưu tiên">{ticket.priority_name}</Field>

              <Field label="Nguồn">{ticket.source_name}</Field>
              <Field label="Cách phân loại">
                {ticket.classification_method === "AUTO"
                  ? "Tự động"
                  : ticket.classification_method === "MANUAL"
                  ? "Thủ công"
                  : ticket.classification_method}
              </Field>
            </div>
          </Section>

          <Section title="Thông tin liên hệ">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Khách hàng">{ticket.customer_name}</Field>
              <Field label="Công ty">{ticket.company_name}</Field>

              <Field label="Số tài khoản">
                {ticket.display_account_number ||
                  ticket.customer_account_number}
              </Field>
              <Field label="Trạng thái TK">
                {ticket.account_link_status === "LINKED" ? (
                  <span className="font-semibold text-emerald-600">
                    Đã liên kết KH
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600">
                    Chưa có TK liên kết
                  </span>
                )}
              </Field>

              <Field label="Số TK nhập tay">{ticket.raw_account_number}</Field>
            </div>
          </Section>

          <Section title="Thông tin mô tả">
            <Field label="Nội dung yêu cầu">
              <span className="whitespace-pre-wrap">
                {ticket.request_content}
              </span>
            </Field>
          </Section>

          {/* Chỉ hiện khi là ticket lỗi */}
          {ticket.is_error_ticket && (
            <Section title="Thông tin lỗi">
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
                <Field label="Nhóm lỗi">{ticket.error_group_name}</Field>
                <Field label="Loại lỗi">{ticket.error_type_name}</Field>

                <Field label="Hệ thống liên quan">
                  {ticket.related_system}
                </Field>
                <Field label="Trạng thái bên ngoài">
                  {ticket.external_status}
                </Field>
              </div>
              <Field label="Ghi chú lỗi">
                <span className="whitespace-pre-wrap">{ticket.error_note}</span>
              </Field>
            </Section>
          )}

          <Section title="Giải pháp xử lý">
            <Field label="Giải pháp">
              <span className="whitespace-pre-wrap">
                {ticket.handling_solution}
              </span>
            </Field>
            <Field label="Phản hồi cuối">
              <span className="whitespace-pre-wrap">
                {ticket.final_response}
              </span>
            </Field>
          </Section>

          <Section title="Quản lý SLA">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Danh mục SLA">{ticket.sla_policy_name}</Field>
              <Field label="Mức ưu tiên">{ticket.priority_name}</Field>

              <Field label="Ngày tiếp nhận">
                {formatDateTime(ticket.accepted_at)}
              </Field>
              <Field label="Ngày bắt đầu xử lý">
                {formatDateTime(ticket.processing_started_at)}
              </Field>

              <Field label="Ngày hoàn thành">
                {formatDateTime(ticket.done_at)}
              </Field>
              <Field label="Ngày đóng">{formatDateTime(ticket.closed_at)}</Field>
            </div>
          </Section>

          <Section title="Thông tin quản lý">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <Field label="Giao cho">{ticket.owner_user_name}</Field>
              <Field label="Người xử lý">
                {ticket.assigned_employee_name}
              </Field>

              <Field label="Phân công xử lý">{ticket.assigned_unit_name}</Field>
              <Field label="Chi nhánh xử lý">
                {ticket.handling_branch_name}
              </Field>

              <Field label="Ngày tạo">{formatDateTime(ticket.created_at)}</Field>
              <Field label="Lần sửa đổi cuối">
                {formatDateTime(ticket.updated_at)}
              </Field>

              {ticket.cancelled_at && (
                <>
                  <Field label="Ngày hủy">
                    {formatDateTime(ticket.cancelled_at)}
                  </Field>
                  <Field label="Lý do hủy">{ticket.cancelled_reason}</Field>
                </>
              )}
            </div>
          </Section>
        </div>
      )}

      {ticket && showUpdate && (
        <TicketUpdateStatusModal
          ticket={ticket}
          onClose={() => setShowUpdate(false)}
          onSaved={(updated) => setTicket(updated)}
        />
      )}
    </DashboardLayout>
  );
}
