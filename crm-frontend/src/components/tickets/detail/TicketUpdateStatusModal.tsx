"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { masterDataApi } from "@/apis/master-data.api";
import { ticketApi } from "@/apis/ticket.api";
import { userApi } from "@/apis/user.api";
import {
  BreachReasonOption,
  SlaBreachReasonModal,
} from "@/components/tickets/detail/SlaBreachReasonModal";
import { TICKET_STATUS_OPTIONS } from "@/constants/ticket-detail.constant";
import { TicketDetail, TicketStatusCode } from "@/types/ticket.type";

type Opt = { id: number; [key: string]: unknown };

const name = (o: Opt, keys: string[]) => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v) return v;
  }
  return `#${o.id}`;
};

const toId = (v: string) => (v ? Number(v) : null);

/**
 * Modal "Cập nhật tình trạng" cho ticket thường.
 *
 * Backend tách nghiệp vụ thành 3 service riêng (assign / amend / status) để giữ
 * log, SLA tracking và notification. Modal gom lại: người dùng bấm Lưu một lần,
 * bên trong gọi lần lượt 3 API.
 */
export function TicketUpdateStatusModal({
  ticket,
  onClose,
  onSaved,
}: {
  ticket: TicketDetail;
  onClose: () => void;
  onSaved: (updated: TicketDetail) => void;
}) {
  // Form
  const [status, setStatus] = useState<TicketStatusCode>(
    (ticket.current_status_code as TicketStatusCode) || "CREATED"
  );
  const [unit, setUnit] = useState<number | null>(ticket.assigned_unit ?? null);
  const [branch, setBranch] = useState<number | null>(
    ticket.handling_branch ?? null
  );
  const [slaPolicy, setSlaPolicy] = useState<number | null>(
    ticket.sla_policy ?? null
  );
  const [priority, setPriority] = useState<number | null>(
    ticket.priority ?? null
  );
  const [owner, setOwner] = useState<number | null>(ticket.owner_user ?? null);
  const [sendSurvey, setSendSurvey] = useState(false);
  const [solution, setSolution] = useState(ticket.handling_solution || "");
  const [requestContent, setRequestContent] = useState(
    ticket.request_content || ""
  );
  const [finalResponse, setFinalResponse] = useState(
    ticket.final_response || ""
  );
  const [cancelledReason, setCancelledReason] = useState("");

  // Phân loại
  const [category, setCategory] = useState<number | null>(
    ticket.support_category ?? null
  );
  const [classification, setClassification] = useState<number | null>(
    ticket.classification ?? null
  );
  const [source, setSource] = useState<number | null>(ticket.source ?? null);

  // Options
  const [units, setUnits] = useState<Opt[]>([]);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<Opt[]>([]);
  const [priorities, setPriorities] = useState<Opt[]>([]);
  const [users, setUsers] = useState<Opt[]>([]);
  const [reasons, setReasons] = useState<BreachReasonOption[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [classifications, setClassifications] = useState<Opt[]>([]);
  const [sources, setSources] = useState<Opt[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showBreachModal, setShowBreachModal] = useState(false);

  useEffect(() => {
    let active = true;

    // Các API master-data trả unknown[] → ép về Opt[] để dùng chung một khuôn
    const load = (
      fetcher: () => Promise<unknown>,
      setter: (v: Opt[]) => void
    ) => {
      fetcher()
        .then((data) => {
          if (!active) return;

          const rows = Array.isArray(data)
            ? data
            : ((data as { results?: unknown[] })?.results ?? []);

          setter(rows as Opt[]);
        })
        .catch(() => {
          // Thiếu một danh mục thì dropdown đó rỗng, không chặn các dropdown khác
        });
    };

    load(() => masterDataApi.getProcessingUnits(), setUnits);
    load(() => masterDataApi.getBranches(), setBranches);
    load(() => masterDataApi.getSlaPolicies(), setSlaPolicies);
    load(() => masterDataApi.getTicketPriorities(), setPriorities);
    load(() => masterDataApi.getTicketCategories(), setCategories);
    load(() => masterDataApi.getTicketClassifications(), setClassifications);
    load(() => masterDataApi.getTicketSources(), setSources);
    load(() => masterDataApi.getSlaBreachReasons(), (v) =>
      setReasons(v as BreachReasonOption[])
    );
    load(() => userApi.getUsers(), setUsers);

    return () => {
      active = false;
    };
  }, []);

  // Chọn danh mục hỗ trợ → chỉ hiện phân loại và SLA thuộc danh mục đó (giống form tạo)
  const filteredClassifications = category
    ? classifications.filter((o) => Number(o.support_category) === category)
    : classifications;

  const filteredSlaPolicies = category
    ? slaPolicies.filter((o) => Number(o.support_category) === category)
    : slaPolicies;

  /** Lưu: assign → amend → status. Nếu backend chặn vì vượt SLA thì mở modal lý do. */
  const save = async (breach?: { reason: number; note: string }) => {
    try {
      setSaving(true);
      setError("");

      // 1. Phân công (chỉ gọi khi có thay đổi)
      if (
        unit !== (ticket.assigned_unit ?? null) ||
        branch !== (ticket.handling_branch ?? null)
      ) {
        await ticketApi.assignTicket(ticket.id, {
          to_unit: unit,
          to_branch: branch,
        });
      }

      // 2. Sửa thông tin
      await ticketApi.amendTicket(ticket.id, {
        support_category: category,
        classification,
        source,
        priority,
        sla_policy: slaPolicy,
        request_content: requestContent,
        handling_solution: solution,
        final_response: finalResponse,
      });

      // 3. Đổi trạng thái (kèm lý do vượt SLA nếu có)
      const updated = await ticketApi.updateTicketStatus(ticket.id, {
        to_status_code: status,
        breach_reason: breach?.reason,
        breach_note: breach?.note,
        cancelled_reason:
          status === "CANCELLED" ? cancelledReason || undefined : undefined,
      });

      // 4. Khảo sát (tùy chọn)
      if (sendSurvey) {
        await ticketApi.sendTicketSurvey(ticket.id, true).catch(() => {});
      }

      onSaved(updated);
      onClose();
    } catch (err) {
      // Backend trả lỗi validate dạng mảng ["Ticket đã vượt SLA..."],
      // lỗi quyền dạng {detail: "..."} → gom cả hai về một chuỗi.
      const data = (err as { response?: { data?: unknown } })?.response?.data;

      let message = "";

      if (Array.isArray(data)) {
        message = data.join(" ");
      } else if (typeof data === "string") {
        message = data;
      } else if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        message =
          (obj.detail as string) ||
          Object.values(obj).flat().filter(Boolean).join(" ");
      }

      // Chặn đóng ticket vượt SLA chưa khai lý do → bật modal nhập lý do
      if (message.includes("SLA")) {
        setShowBreachModal(true);
        setError("");
      } else {
        setError(message || "Không lưu được. Vui lòng thử lại.");
      }
    } finally {
      setSaving(false);
    }
  };

  const labelCls =
    "rounded bg-slate-50 px-3 py-2 text-right text-xs font-semibold text-slate-600";
  const inputCls =
    "h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400";

  const Row = ({
    label,
    required,
    children,
  }: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
  }) => (
    <div className="grid grid-cols-5 items-center gap-3">
      <label className={`col-span-2 ${labelCls}`}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="col-span-3">{children}</div>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-800">
              Cập nhật tình trạng
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-x-10 gap-y-3 overflow-y-auto px-6 py-5 lg:grid-cols-2">
            {/* ── Cột trái ── */}
            <div className="flex flex-col gap-3">
              <Row label="Danh mục hỗ trợ" required>
                <select
                  value={category ?? ""}
                  onChange={(e) => {
                    const next = toId(e.target.value);
                    setCategory(next);
                    // Đổi danh mục → phân loại và SLA cũ có thể không còn hợp lệ
                    setClassification(null);
                    setSlaPolicy(null);
                  }}
                  className={inputCls}
                >
                  <option value="">-- Chọn danh mục hỗ trợ --</option>
                  {categories.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["category_name", "name"])}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Phân loại">
                <select
                  value={classification ?? ""}
                  onChange={(e) => setClassification(toId(e.target.value))}
                  className={inputCls}
                >
                  <option value="">-- Chọn phân loại --</option>
                  {filteredClassifications.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["classification_name", "name"])}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Tình trạng" required>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TicketStatusCode)
                  }
                  className={inputCls}
                >
                  {TICKET_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Phân công xử lý">
                <select
                  value={unit ?? ""}
                  onChange={(e) => setUnit(toId(e.target.value))}
                  className={inputCls}
                >
                  <option value="">-- Chọn đơn vị xử lý --</option>
                  {units.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["unit_name", "name"])}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Chi nhánh xử lý">
                <select
                  value={branch ?? ""}
                  onChange={(e) => setBranch(toId(e.target.value))}
                  className={inputCls}
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {branches.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["branch_name", "name"])}
                    </option>
                  ))}
                </select>
              </Row>

              <div className="grid grid-cols-5 items-center gap-3">
                <label className={`col-span-2 ${labelCls}`}>
                  Có gửi khảo sát không?
                </label>
                <div className="col-span-3">
                  <input
                    type="checkbox"
                    checked={sendSurvey}
                    onChange={(e) => setSendSurvey(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </div>
              </div>

              {status === "CANCELLED" && (
                <Row label="Lý do hủy" required>
                  <textarea
                    value={cancelledReason}
                    onChange={(e) => setCancelledReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
                  />
                </Row>
              )}
            </div>

            {/* ── Cột phải ── */}
            <div className="flex flex-col gap-3">
              <Row label="Danh mục SLA" required>
                <select
                  value={slaPolicy ?? ""}
                  onChange={(e) => setSlaPolicy(toId(e.target.value))}
                  className={inputCls}
                >
                  <option value="">-- Chọn danh mục SLA --</option>
                  {filteredSlaPolicies.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["sla_name", "name"])}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Nguồn">
                <select
                  value={source ?? ""}
                  onChange={(e) => setSource(toId(e.target.value))}
                  className={inputCls}
                >
                  <option value="">-- Chọn nguồn --</option>
                  {sources.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["source_name", "name"])}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Mức ưu tiên" required>
                <select
                  value={priority ?? ""}
                  onChange={(e) => setPriority(toId(e.target.value))}
                  className={inputCls}
                >
                  <option value="">-- Chọn mức ưu tiên --</option>
                  {priorities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["priority_name", "name"])}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Giao cho">
                <select
                  value={owner ?? ""}
                  onChange={(e) => setOwner(toId(e.target.value))}
                  className={inputCls}
                >
                  <option value="">-- Chọn người xử lý --</option>
                  {users.map((o) => (
                    <option key={o.id} value={o.id}>
                      {name(o, ["employee_name", "username", "email"])}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Hướng xử lý">
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
                />
              </Row>
            </div>

            {/* ── Nội dung yêu cầu + Phản hồi cuối (full width) ── */}
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-10">
                <label className={`lg:col-span-2 ${labelCls}`}>
                  Nội dung yêu cầu
                </label>
                <textarea
                  value={requestContent}
                  onChange={(e) => setRequestContent(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400 lg:col-span-8"
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-10">
                <label className={`lg:col-span-2 ${labelCls}`}>
                  Phản hồi cuối
                </label>
                <textarea
                  value={finalResponse}
                  onChange={(e) => setFinalResponse(e.target.value)}
                  rows={3}
                  placeholder="Nội dung trả lời chính thức gửi khách hàng..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400 lg:col-span-8"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 lg:col-span-2">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-emerald-500 px-8 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-rose-500 hover:underline"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>

      {/* Chỉ bật khi backend báo ticket đã vượt SLA */}
      {showBreachModal && (
        <SlaBreachReasonModal
          reasons={reasons}
          saving={saving}
          onClose={() => setShowBreachModal(false)}
          onSubmit={(reason, note) => {
            setShowBreachModal(false);
            void save({ reason, note });
          }}
        />
      )}
    </>
  );
}
