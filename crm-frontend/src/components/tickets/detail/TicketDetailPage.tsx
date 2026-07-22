"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  History,
  MessageSquareText,
  Pencil,
  UserPlus,
  X,
} from "lucide-react";

import { ticketApi } from "@/apis/ticket.api";
import { ConversationModal } from "@/components/chatbot-dashboard/ConversationModal";
import { chatbotDashboardService } from "@/services/chatbot-dashboard.service";
import { SlaBreachReasonModal } from "@/components/tickets/detail/SlaBreachReasonModal";
import { TicketHistoryModal } from "@/components/tickets/detail/TicketHistoryModal";
import { TicketStatusFlow } from "@/components/tickets/detail/TicketStatusFlow";
import {
  TICKET_STATUS_OPTIONS,
  TICKET_STATUS_PILL,
} from "@/constants/ticket-detail.constant";
import {
  Opt,
  optName,
  useTicketEditForm,
} from "@/hooks/useTicketEditForm";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ChatbotTicketItem } from "@/types/chatbot-dashboard.type";
import { TicketDetail, TicketStatusCode } from "@/types/ticket.type";
import { formatDateTime } from "@/utils/date.util";
import { getApiErrorDetail } from "@/utils/error.util";

/** Hàng "nhãn : giá trị". Khi editing=true, render input do caller truyền. */
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

const CONTACT_TYPE_LABELS: Record<string, string> = {
  PHONE: "Số điện thoại",
  EMAIL: "Email",
  ACCOUNT: "Số tài khoản",
};

const SELECT_CLS =
  "h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400";
const INPUT_CLS =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-sky-400";

/** Dropdown gọn cho chế độ sửa. */
function EditSelect({
  value,
  onChange,
  options,
  keys,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: Opt[];
  keys: string[];
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
          {optName(o, keys)}
        </option>
      ))}
    </select>
  );
}

export function TicketDetailPage({ id }: { id: number }) {
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBreachModal, setShowBreachModal] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      setTicket(await ticketApi.getTicketById(id));
    } catch {
      setLoadError("Không tải được chi tiết ticket.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
          {loadError || "Không tìm thấy ticket."}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <TicketDetailInner
      ticket={ticket}
      editing={editing}
      setEditing={setEditing}
      showHistory={showHistory}
      setShowHistory={setShowHistory}
      showBreachModal={showBreachModal}
      setShowBreachModal={setShowBreachModal}
      showConversation={showConversation}
      setShowConversation={setShowConversation}
      claiming={claiming}
      claimError={claimError}
      onClaim={async () => {
        try {
          setClaiming(true);
          setClaimError("");
          setTicket(await ticketApi.claimTicket(id));
        } catch (err) {
          setClaimError(getApiErrorDetail(err, "Không nhận được ticket."));
        } finally {
          setClaiming(false);
        }
      }}
      onSaved={setTicket}
      onBack={() => router.push("/tickets")}
    />
  );
}

/** Tách riêng để hook edit khởi tạo lại đúng khi ticket đổi (key={ticket.updated_at}). */
function TicketDetailInner({
  ticket,
  editing,
  setEditing,
  showHistory,
  setShowHistory,
  showBreachModal,
  setShowBreachModal,
  showConversation,
  setShowConversation,
  claiming,
  claimError,
  onClaim,
  onSaved,
  onBack,
}: {
  ticket: TicketDetail;
  editing: boolean;
  setEditing: (v: boolean) => void;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  showBreachModal: boolean;
  setShowBreachModal: (v: boolean) => void;
  showConversation: boolean;
  setShowConversation: (v: boolean) => void;
  claiming: boolean;
  claimError: string;
  onClaim: () => void;
  onSaved: (t: TicketDetail) => void;
  onBack: () => void;
}) {
  const f = useTicketEditForm(ticket);
  const statusCode = (ticket.current_status_code || "") as TicketStatusCode;

  // Ticket sinh từ chatbot: classification_method = AUTO và có id phiên chat gốc.
  const isChatbotTicket = ticket.classification_method === "AUTO";
  const sessionId = ticket.source_ref_id || "";
  const [customerQuestions, setCustomerQuestions] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      if (!isChatbotTicket || !sessionId) {
        setCustomerQuestions(null);
        return;
      }

      try {
        const data = await chatbotDashboardService.getSessionDetail(sessionId);
        if (!active) return;
        const qs = (data.messages || [])
          .filter((m) => m.question && m.question.trim())
          .map((m) => m.question!.trim())
          .slice(0, 5);
        setCustomerQuestions(qs.length ? qs : null);
      } catch {
        if (active) setCustomerQuestions(null);
      }
    };

    void loadPreview();

    return () => {
      active = false;
    };
  }, [isChatbotTicket, sessionId]);
  const canClaim = isChatbotTicket && !ticket.owner_user_name;

  const handleSave = async (breach?: { reason: number; note: string }) => {
    const res = await f.save(breach);

    if (res.needBreachReason) {
      setShowBreachModal(true);
      return;
    }

    if (res.ok && res.ticket) {
      onSaved(res.ticket);
      setEditing(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Tickets", href: "/tickets" },
        { label: ticket.ticket_code || "Chi tiết" },
      ]}
      rightAction={
        <button
          type="button"
          onClick={onBack}
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
              {isChatbotTicket && (
                <span className="ml-3 inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                  <Bot size={11} />
                  Chatbot
                </span>
              )}
              {editing && (
                <span className="ml-3 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Đang chỉnh sửa
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              {canClaim && (
                <button
                  type="button"
                  disabled={claiming}
                  onClick={onClaim}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0097cf] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0089bd] disabled:opacity-60"
                >
                  <UserPlus size={13} />
                  {claiming ? "Đang nhận..." : "Nhận ticket"}
                </button>
              )}

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

          {claimError && (
            <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {claimError}
            </div>
          )}

          <TicketStatusFlow status={statusCode} />
        </div>

        {/* Inline hội thoại chatbot đã được loại bỏ; dùng popup để xem lịch sử */}

        {/* Thông tin chung */}
        <Section title="Thông tin chung">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            <Field label="Mã Ticket" editing={false} view={ticket.ticket_code} />
            <Field label="Tiêu đề" editing={false} view={ticket.title} />

            <Field
              label="Danh mục hỗ trợ"
              editing={editing}
              view={
                ticket.support_category_name && (
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {ticket.support_category_name}
                  </span>
                )
              }
              edit={
                <EditSelect
                  value={f.category}
                  onChange={(v) => {
                    f.setCategory(v);
                    f.setClassification(null);
                    f.setSlaPolicy(null);
                  }}
                  options={f.categories}
                  keys={["category_name", "name"]}
                  placeholder="-- Chọn danh mục --"
                />
              }
            />
            <Field
              label="Phân loại"
              editing={editing}
              view={ticket.classification_name}
              edit={
                <EditSelect
                  value={f.classification}
                  onChange={f.setClassification}
                  options={f.filteredClassifications}
                  keys={["classification_name", "name"]}
                  placeholder="-- Chọn phân loại --"
                />
              }
            />

            <Field
              label="Tình trạng"
              editing={editing}
              view={
                statusCode && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      TICKET_STATUS_PILL[statusCode] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ticket.current_status_name}
                  </span>
                )
              }
              edit={
                <select
                  value={f.status}
                  onChange={(e) =>
                    f.setStatus(e.target.value as TicketStatusCode)
                  }
                  className={SELECT_CLS}
                >
                  {TICKET_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              }
            />
            <Field
              label="Mức ưu tiên"
              editing={editing}
              view={ticket.priority_name}
              edit={
                <EditSelect
                  value={f.priority}
                  onChange={f.setPriority}
                  options={f.priorities}
                  keys={["priority_name", "name"]}
                  placeholder="-- Chọn ưu tiên --"
                />
              }
            />

            <Field
              label="Nguồn"
              editing={editing}
              view={ticket.source_name}
              edit={
                <EditSelect
                  value={f.source}
                  onChange={f.setSource}
                  options={f.sources}
                  keys={["source_name", "name"]}
                  placeholder="-- Chọn nguồn --"
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
            <Field label="Công ty" editing={false} view={ticket.company_name} />
            <Field
              label="Số tài khoản"
              editing={false}
              view={
                ticket.display_account_number || ticket.customer_account_number
              }
            />
            <Field
              label="Trạng thái TK"
              editing={false}
              view={
                ticket.account_link_status === "LINKED" ? (
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
          </div>
        </Section>

        {/* Thông tin mô tả */}
        <Section title="Thông tin mô tả">
          {/* Hiển thị khối hiển thị CHỈ câu hỏi của khách (không show đáp án) - lấy từ preview messages */}
          {customerQuestions && customerQuestions.length > 0 && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-700">
              <div className="text-[11px] font-semibold uppercase text-amber-700">
                CÂU HỎI CỦA KHÁCH HÀNG
              </div>
              <div className="mt-1 whitespace-pre-wrap text-xs text-amber-900">
                {customerQuestions.map((q, i) => (
                  <div key={i} className={i ? "mt-2" : ""}>
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Đối với ticket sinh từ chatbot, ẩn trường "Nội dung yêu cầu" chi tiết ngoài modal;
              người xử lý có thể bấm "Xem lịch sử trò chuyện" để xem đầy đủ Q/A */}
          {!isChatbotTicket && (
            <Field
              label="Nội dung yêu cầu"
              editing={editing}
              view={<span className="whitespace-pre-wrap">{ticket.request_content}</span>}
              edit={
                <textarea
                  value={f.requestContent}
                  onChange={(e) => f.setRequestContent(e.target.value)}
                  rows={3}
                  className={INPUT_CLS}
                />
              }
            />
          )}

          <Field
            label="phản hồi sau khi liên hệ"
            editing={editing}
            view={
              <span className="whitespace-pre-wrap">{ticket.final_response}</span>
            }
            edit={
              <textarea
                value={f.finalResponse}
                onChange={(e) => f.setFinalResponse(e.target.value)}
                rows={3}
                placeholder="Nội dung trả lời chính thức gửi khách hàng..."
                className={INPUT_CLS}
              />
            }
          />

          {/* Nút mở popup lịch sử hội thoại (hiển thị modal có thể kéo để xem toàn bộ) */}
          {isChatbotTicket && sessionId && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowConversation(true)}
                className="flex w-fit items-center gap-2 rounded-lg bg-[#0097cf] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
              >
                <MessageSquareText size={14} />
                Xem lịch sử trò chuyện
              </button>
            </div>
          )}
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
                value={f.solution}
                onChange={(e) => f.setSolution(e.target.value)}
                rows={3}
                className={INPUT_CLS}
              />
            }
          />
        </Section>

        {/* Thông tin lỗi */}
        <Section title="Thông tin lỗi">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            <Field
              label="Nhóm lỗi"
              editing={editing}
              view={ticket.error_group_name}
              edit={
                <EditSelect
                  value={f.errorGroup}
                  onChange={(v) => {
                    f.setErrorGroup(v);
                    f.setErrorType(null);
                  }}
                  options={f.errorGroups}
                  keys={["group_name", "name"]}
                  placeholder="-- Chọn nhóm lỗi --"
                />
              }
            />
            <Field
              label="Loại lỗi"
              editing={editing}
              view={ticket.error_type_name}
              edit={
                <EditSelect
                  value={f.errorType}
                  onChange={f.setErrorType}
                  options={f.filteredErrorTypes}
                  keys={["type_name", "name"]}
                  placeholder="-- Chọn loại lỗi --"
                />
              }
            />
            <Field
              label="Hệ thống liên quan"
              editing={editing}
              view={ticket.related_system}
              edit={
                <input
                  value={f.relatedSystem}
                  onChange={(e) => f.setRelatedSystem(e.target.value)}
                  placeholder="BASE / FLEX / APP / CRM..."
                  className={INPUT_CLS}
                />
              }
            />
            <Field
              label="Ghi chú lỗi"
              editing={editing}
              view={ticket.error_note}
              edit={
                <input
                  value={f.errorNote}
                  onChange={(e) => f.setErrorNote(e.target.value)}
                  className={INPUT_CLS}
                />
              }
            />
          </div>
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
                  value={f.slaPolicy}
                  onChange={f.setSlaPolicy}
                  options={f.filteredSlaPolicies}
                  keys={["sla_name", "name"]}
                  placeholder="-- Chọn danh mục SLA --"
                />
              }
            />
            <Field
              label="Có gửi khảo sát"
              editing={editing}
              view={ticket.send_survey ? "Có" : "Không"}
              edit={
                <input
                  type="checkbox"
                  checked={f.sendSurvey}
                  onChange={(e) => f.setSendSurvey(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              }
            />
            <Field
              label="Ngày tiếp nhận"
              editing={false}
              view={formatDateTime(ticket.accepted_at)}
            />
            <Field
              label="Ngày hoàn thành"
              editing={false}
              view={formatDateTime(ticket.done_at)}
            />
          </div>
        </Section>

        {/* Thông tin quản lý */}
        <Section title="Thông tin quản lý">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            <Field
              label="Giao cho"
              editing={editing}
              view={ticket.owner_user_name}
              edit={
                <EditSelect
                  value={f.owner}
                  onChange={f.setOwner}
                  options={f.users}
                  keys={["employee_name", "username", "email"]}
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
                  value={f.unit}
                  onChange={f.setUnit}
                  options={f.units}
                  keys={["unit_name", "name"]}
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
                  value={f.branch}
                  onChange={f.setBranch}
                  options={f.branches}
                  keys={["branch_name", "name"]}
                  placeholder="-- Chọn chi nhánh --"
                />
              }
            />
            <Field
              label="Ngày tạo"
              editing={false}
              view={formatDateTime(ticket.created_at)}
            />
            <Field
              label="Lần sửa đổi cuối"
              editing={false}
              view={formatDateTime(ticket.updated_at)}
            />
          </div>
        </Section>

        {f.error && (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {f.error}
          </div>
        )}
      </div>

      {/* Thanh Lưu/Hủy dính đáy khi đang sửa */}
      {editing && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-4 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur">
          <button
            type="button"
            disabled={f.saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-emerald-500 px-8 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {f.saving ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            type="button"
            onClick={() => {
              f.setError("");
              setEditing(false);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline"
          >
            <X size={13} />
            Hủy bỏ
          </button>
        </div>
      )}

      {showConversation && sessionId && (
        <ConversationModal
          session={
            {
              id: ticket.id,
              session_id: sessionId,
              ticket_code: ticket.ticket_code,
              contact_info: ticket.contact_value,
              reason: ticket.request_content,
              outcome_label: "Chuyển CCC xử lý",
              outcome_type: "CCC",
              started_at: ticket.created_at,
            } as ChatbotTicketItem
          }
          onClose={() => setShowConversation(false)}
        />
      )}

      {showHistory && (
        <TicketHistoryModal
          ticketId={ticket.id}
          ticketCode={ticket.ticket_code}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showBreachModal && (
        <SlaBreachReasonModal
          reasons={f.reasons}
          saving={f.saving}
          onClose={() => setShowBreachModal(false)}
          onSubmit={(reason, note) => {
            setShowBreachModal(false);
            void handleSave({ reason, note });
          }}
        />
      )}
    </DashboardLayout>
  );
}
