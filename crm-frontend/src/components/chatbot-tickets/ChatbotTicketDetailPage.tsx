"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, History, MessageSquareText, Pencil, Phone, X } from "lucide-react";

import { chatbotTicketApi } from "@/apis/chatbot-ticket.api";
import { masterDataApi } from "@/apis/master-data.api";
import { ConversationModal } from "@/components/chatbot-dashboard/ConversationModal";
import { TicketHistoryModal } from "@/components/tickets/detail/TicketHistoryModal";
import {
  BreachReasonOption,
  SlaBreachReasonModal,
} from "@/components/tickets/detail/SlaBreachReasonModal";
import { TicketStatusFlow } from "@/components/chatbot-tickets/TicketStatusFlow";
import { CHATBOT_TICKET_STATUS_PILL } from "@/constants/chatbot-ticket.constant";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ChatbotTicketItem } from "@/types/chatbot-dashboard.type";
import {
  ChatbotTicket,
  ChatbotTicketOptions,
  ChatbotTicketStatus,
  ChatbotTicketUpdatePayload,
} from "@/types/chatbot-ticket.type";
import { formatDateTime } from "@/utils/date.util";
import { getApiErrorDetail } from "@/utils/error.util";

/** Trạng thái kết thúc — backend bắt khai lý do nếu ticket đã vượt SLA. */
const CLOSING_STATUSES: ChatbotTicketStatus[] = [
  "DONE_WAIT_CLOSE",
  "PENDING_CLOSE",
  "CLOSED",
];

type Opt = { id: number; name: string };

function Field({
  label,
  editing,
  view,
  edit,
}: {
  label: string;
  editing: boolean;
  view: React.ReactNode;
  edit?: React.ReactNode;
}) {
  const empty = view === null || view === undefined || view === "";
  return (
    <div className="grid grid-cols-3 items-center gap-3 py-2">
      <div className="col-span-1 text-right text-xs font-semibold text-slate-500">
        {label}
      </div>
      <div className="col-span-2 text-xs text-slate-800">
        {editing && edit ? edit : empty ? (
          <span className="text-slate-300">—</span>
        ) : (
          view
        )}
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

const SELECT_CLS =
  "h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400";

function EditSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: Opt[];
  placeholder: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={SELECT_CLS}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

export function ChatbotTicketDetailPage({ id }: { id: number }) {
  const router = useRouter();

  const [ticket, setTicket] = useState<ChatbotTicket | null>(null);
  const [options, setOptions] = useState<ChatbotTicketOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Lý do vượt SLA: chỉ bật khi backend chặn việc đóng ticket đã trễ hạn
  const [breachReasons, setBreachReasons] = useState<BreachReasonOption[]>([]);
  const [showBreachModal, setShowBreachModal] = useState(false);

  // Form state
  const [status, setStatus] = useState<ChatbotTicketStatus>("CREATED");
  const [slaPolicy, setSlaPolicy] = useState<number | null>(null);
  const [priority, setPriority] = useState<number | null>(null);
  const [owner, setOwner] = useState<number | null>(null);
  const [unit, setUnit] = useState<number | null>(null);
  const [branch, setBranch] = useState<number | null>(null);
  const [sendSurvey, setSendSurvey] = useState(false);
  const [solution, setSolution] = useState("");

  const resetForm = useCallback((t: ChatbotTicket) => {
    setStatus(t.status);
    setSlaPolicy(t.sla_policy ?? null);
    setPriority(t.priority ?? null);
    setOwner(t.owner_user ?? null);
    setUnit(t.assigned_unit ?? null);
    setBranch(t.handling_branch ?? null);
    setSendSurvey(t.send_survey ?? false);
    setSolution(t.handling_solution || "");
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await chatbotTicketApi.getDetail(id);
      setTicket(data.ticket);
      resetForm(data.ticket);
    } catch (err) {
      setError(getApiErrorDetail(err, "Không tải được chi tiết ticket."));
    } finally {
      setLoading(false);
    }
  }, [id, resetForm]);

  useEffect(() => {
    void load();
  }, [load]);

  // Bỏ qua response về muộn khi component đã unmount
  useEffect(() => {
    let active = true;

    chatbotTicketApi
      .getOptions()
      .then((data) => {
        if (active) setOptions(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            getApiErrorDetail(err, "Không tải được danh sách lựa chọn.")
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Danh mục lý do vượt SLA — nạp sẵn để modal mở là dùng được ngay
  useEffect(() => {
    let active = true;

    masterDataApi
      .getSlaBreachReasons()
      .then((data) => {
        if (active) setBreachReasons(data);
      })
      .catch(() => {
        // Không chặn luồng chính: modal sẽ báo khi danh sách rỗng
      });

    return () => {
      active = false;
    };
  }, []);

  /** Ticket đã trễ hạn và chưa từng khai lý do vượt SLA. */
  const needBreachReason =
    ticket?.sla_status === "OVERDUE" &&
    !ticket?.breach_reason &&
    !ticket?.breach_note;

  const submit = useCallback(
    async (extra?: Pick<ChatbotTicketUpdatePayload, "breach_reason" | "breach_note">) => {
      if (!ticket) return;

      try {
        setSaving(true);
        setError("");

        const updated = await chatbotTicketApi.update(ticket.id, {
          status,
          sla_policy: slaPolicy,
          priority,
          owner_user: owner,
          assigned_unit: unit,
          handling_branch: branch,
          send_survey: sendSurvey,
          handling_solution: solution,
          ...extra,
        });

        setTicket(updated);
        resetForm(updated);
        setEditing(false);
        setShowBreachModal(false);
      } catch (err) {
        const message = getApiErrorDetail(
          err,
          "Không lưu được. Vui lòng thử lại."
        );

        // Backend chặn vì chưa khai lý do vượt SLA → mở modal cho nhập
        if (message.includes("vượt SLA")) {
          setShowBreachModal(true);
          setError("");
        } else {
          setError(message);
        }
      } finally {
        setSaving(false);
      }
    },
    [
      ticket,
      status,
      slaPolicy,
      priority,
      owner,
      unit,
      branch,
      sendSurvey,
      solution,
      resetForm,
    ]
  );

  const save = () => {
    // Chủ động hỏi lý do trước khi gọi API, thay vì đợi backend từ chối
    if (needBreachReason && CLOSING_STATUSES.includes(status)) {
      setShowBreachModal(true);
      return;
    }

    void submit();
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "TRANG CHỦ", href: "/" }]}>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải...
        </div>
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "TRANG CHỦ", href: "/" }]}>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-600">
          {error || "Không tìm thấy ticket."}
        </div>
      </DashboardLayout>
    );
  }

  const slaOpts: Opt[] = options?.sla_policies ?? [];
  const priOpts: Opt[] = options?.priorities ?? [];
  const unitOpts: Opt[] = options?.units ?? [];
  const branchOpts: Opt[] = options?.branches ?? [];
  const userOpts: Opt[] = options?.users ?? [];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Chatbot", href: "/chatbots/dashboard" },
        { label: "Ticket chuyển CCC" },
        { label: ticket.ticket_code || "Chi tiết" },
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
      <div className="flex flex-col gap-4 pb-24">
        {/* Header + thanh trạng thái */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-600">
              Mã ticket:{" "}
              <span className="font-bold text-sky-600">
                {ticket.ticket_code}
              </span>
              {editing && (
                <span className="ml-3 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Đang chỉnh sửa
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <History size={13} />
                Lịch sử
              </button>

              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  <Pencil size={13} />
                  Cập nhật tình trạng
                </button>
              )}
            </div>
          </div>

          <TicketStatusFlow status={editing ? status : ticket.status} />
        </div>

        {/* Thông tin chung */}
        <Section title="Thông tin chung">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            <Field label="Mã Ticket" editing={false} view={ticket.ticket_code} />
            <Field
              label="Danh mục hỗ trợ"
              editing={false}
              view={
                ticket.dashboard_category ? (
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {ticket.dashboard_category}
                  </span>
                ) : (
                  <span className="text-slate-400">Chưa phân loại</span>
                )
              }
            />
            <Field label="Kênh" editing={false} view={ticket.channel} />
            <Field
              label="Tình trạng"
              editing={editing}
              view={
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    CHATBOT_TICKET_STATUS_PILL[ticket.status] ??
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {ticket.status_label || ticket.status}
                </span>
              }
              edit={
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ChatbotTicketStatus)
                  }
                  className={SELECT_CLS}
                >
                  {(options?.statuses ?? []).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              }
            />
            <Field label="Nguồn" editing={false} view="Chatbot" />
            <Field
              label="Mức ưu tiên"
              editing={editing}
              view={ticket.priority_name}
              edit={
                <EditSelect
                  value={priority}
                  onChange={setPriority}
                  options={priOpts}
                  placeholder="-- Chọn ưu tiên --"
                />
              }
            />
          </div>
        </Section>

        {/* Thông tin liên hệ (chỉ xem) */}
        <Section title="Thông tin liên hệ">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            <Field
              label="Khách hàng"
              editing={false}
              view={ticket.customer_name}
            />
            <Field
              label="Trạng thái TK"
              editing={false}
              view={
                ticket.link_status === "LINKED" ? (
                  <span className="font-semibold text-emerald-600">
                    Đã liên kết KH
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600">
                    Chưa có TK liên kết
                  </span>
                )
              }
            />
            <Field
              label="Di động"
              editing={false}
              view={
                ticket.phone ? (
                  <span className="inline-flex items-center gap-1 text-sky-600">
                    {ticket.phone}
                    <Phone size={12} />
                  </span>
                ) : null
              }
            />
            <Field
              label="Số tài khoản"
              editing={false}
              view={ticket.account_number}
            />
            <Field label="Email" editing={false} view={ticket.email} />
          </div>
        </Section>

        {/* Thông tin mô tả — nút mở hội thoại */}
        <Section title="Thông tin mô tả">
          <div className="flex flex-col gap-3">
            {ticket.reason && (
              <div className="rounded-lg bg-amber-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase text-amber-700">
                  Câu hỏi của khách hàng
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

        {/* Giải pháp xử lý */}
        <Section title="Giải pháp xử lý">
          <Field
            label="Hướng xử lý"
            editing={editing}
            view={
              <span className="whitespace-pre-wrap">
                {ticket.handling_solution}
              </span>
            }
            edit={
              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                rows={3}
                placeholder="Nhập cách xử lý ticket..."
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-sky-400"
              />
            }
          />
        </Section>

        {/* Quản lý SLA */}
        <Section title="Quản lý SLA">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            <Field
              label="Danh mục SLA"
              editing={editing}
              view={ticket.sla_policy_name}
              edit={
                <EditSelect
                  value={slaPolicy}
                  onChange={setSlaPolicy}
                  options={slaOpts}
                  placeholder="-- Chọn danh mục SLA --"
                />
              }
            />
            <Field
              label="Tình trạng SLA"
              editing={false}
              view={
                ticket.sla_status === "OVERDUE" ? (
                  <span className="rounded-md bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                    Quá hạn
                  </span>
                ) : ticket.sla_status === "ON_TIME" ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    Đúng hạn
                  </span>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                    Đang xử lý
                  </span>
                )
              }
            />
            <Field
              label="Hạn hoàn tất"
              editing={false}
              view={formatDateTime(ticket.resolution_due_at)}
            />
            <Field
              label="Có gửi khảo sát"
              editing={editing}
              view={ticket.send_survey ? "Có" : "Không"}
              edit={
                <input
                  type="checkbox"
                  checked={sendSurvey}
                  onChange={(e) => setSendSurvey(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              }
            />
          </div>
        </Section>

        {/* Thông tin quản lý */}
        <Section title="Thông tin quản lý">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            <Field
              label="Giao cho"
              editing={editing}
              view={ticket.owner_username}
              edit={
                <EditSelect
                  value={owner}
                  onChange={setOwner}
                  options={userOpts}
                  placeholder="-- Chọn người xử lý --"
                />
              }
            />
            <Field
              label="Phân công xử lý"
              editing={editing}
              view={ticket.assigned_unit_name}
              edit={
                <EditSelect
                  value={unit}
                  onChange={setUnit}
                  options={unitOpts}
                  placeholder="-- Chọn đơn vị --"
                />
              }
            />
            <Field
              label="Chi nhánh xử lý"
              editing={editing}
              view={ticket.handling_branch_name}
              edit={
                <EditSelect
                  value={branch}
                  onChange={setBranch}
                  options={branchOpts}
                  placeholder="-- Chọn chi nhánh --"
                />
              }
            />
            <Field
              label="Thời gian nhận"
              editing={false}
              view={formatDateTime(ticket.accepted_at)}
            />
            <Field
              label="Lần sửa đổi cuối"
              editing={false}
              view={formatDateTime(ticket.updated_at)}
            />
          </div>
        </Section>

        {/* Lỗi khi KHÔNG ở chế độ sửa (ví dụ tải dữ liệu hỏng) */}
        {error && !editing && (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}
      </div>

      {/* Thanh Lưu/Hủy dính đáy khi đang sửa */}
      {editing && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur">
          {/* Lỗi hiện ngay cạnh nút Lưu, không để người dùng phải cuộn tìm */}
          {error && (
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-2 text-center text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}
          <div className="flex items-center justify-center gap-4 px-6 py-3">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-lg bg-emerald-500 px-8 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                resetForm(ticket);
                setEditing(false);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline"
            >
              <X size={13} />
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* Modal nhập lý do vượt SLA */}
      {showBreachModal && (
        <SlaBreachReasonModal
          reasons={breachReasons}
          saving={saving}
          onClose={() => setShowBreachModal(false)}
          onSubmit={(reasonId, note) =>
            void submit({ breach_reason: reasonId, breach_note: note })
          }
        />
      )}

      {/* Modal lịch sử trò chuyện */}
      {showConversation && (
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

      {/* Modal lịch sử thay đổi */}
      {showHistory && (
        <TicketHistoryModal
          ticketId={ticket.id}
          ticketCode={ticket.ticket_code}
          fetchHistory={chatbotTicketApi.getHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </DashboardLayout>
  );
}
