"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { chatbotTicketApi } from "@/apis/chatbot-ticket.api";
import {
  ChatbotTicket,
  ChatbotTicketOptions,
  ChatbotTicketStatus,
} from "@/types/chatbot-ticket.type";

function toId(value: string): number | null {
  return value ? Number(value) : null;
}

export function UpdateStatusModal({
  ticket,
  onClose,
  onSaved,
}: {
  ticket: ChatbotTicket;
  onClose: () => void;
  onSaved: (updated: ChatbotTicket) => void;
}) {
  const [options, setOptions] = useState<ChatbotTicketOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state khởi tạo từ ticket hiện tại
  const [status, setStatus] = useState<ChatbotTicketStatus>(ticket.status);
  const [ownerUser, setOwnerUser] = useState<number | null>(
    ticket.owner_user ?? null
  );
  const [assignedUnit, setAssignedUnit] = useState<number | null>(
    ticket.assigned_unit ?? null
  );
  const [handlingBranch, setHandlingBranch] = useState<number | null>(
    ticket.handling_branch ?? null
  );
  const [slaPolicy, setSlaPolicy] = useState<number | null>(
    ticket.sla_policy ?? null
  );
  const [priority, setPriority] = useState<number | null>(
    ticket.priority ?? null
  );
  const [sendSurvey, setSendSurvey] = useState<boolean>(
    ticket.send_survey ?? false
  );
  const [handlingSolution, setHandlingSolution] = useState<string>(
    ticket.handling_solution ?? ""
  );

  useEffect(() => {
    let active = true;

    chatbotTicketApi
      .getOptions()
      .then((data) => {
        if (active) setOptions(data);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách lựa chọn.");
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const updated = await chatbotTicketApi.update(ticket.id, {
        status,
        owner_user: ownerUser,
        assigned_unit: assignedUnit,
        handling_branch: handlingBranch,
        sla_policy: slaPolicy,
        priority,
        send_survey: sendSurvey,
        handling_solution: handlingSolution,
      });

      onSaved(updated);
      onClose();
    } catch {
      setError("Không lưu được. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "text-xs font-semibold text-slate-600";
  const selectCls =
    "h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-800">
            Cập nhật tình trạng
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
          {/* Cột trái */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>
              Tình trạng <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ChatbotTicketStatus)
              }
              className={selectCls}
            >
              {(options?.statuses ?? []).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cột phải */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Danh mục SLA</label>
            <select
              value={slaPolicy ?? ""}
              onChange={(e) => setSlaPolicy(toId(e.target.value))}
              className={selectCls}
            >
              <option value="">-- Chọn danh mục SLA --</option>
              {(options?.sla_policies ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Phân công xử lý</label>
            <select
              value={assignedUnit ?? ""}
              onChange={(e) => setAssignedUnit(toId(e.target.value))}
              className={selectCls}
            >
              <option value="">-- Chọn đơn vị xử lý --</option>
              {(options?.units ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Mức ưu tiên</label>
            <select
              value={priority ?? ""}
              onChange={(e) => setPriority(toId(e.target.value))}
              className={selectCls}
            >
              <option value="">-- Chọn mức ưu tiên --</option>
              {(options?.priorities ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Chi nhánh xử lý</label>
            <select
              value={handlingBranch ?? ""}
              onChange={(e) => setHandlingBranch(toId(e.target.value))}
              className={selectCls}
            >
              <option value="">-- Chọn chi nhánh --</option>
              {(options?.branches ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Giao cho</label>
            <select
              value={ownerUser ?? ""}
              onChange={(e) => setOwnerUser(toId(e.target.value))}
              className={selectCls}
            >
              <option value="">-- Chọn người xử lý --</option>
              {(options?.users ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="send_survey"
              type="checkbox"
              checked={sendSurvey}
              onChange={(e) => setSendSurvey(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="send_survey" className={labelCls}>
              Có gửi khảo sát không?
            </label>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className={labelCls}>Hướng xử lý</label>
            <textarea
              value={handlingSolution}
              onChange={(e) => setHandlingSolution(e.target.value)}
              rows={3}
              placeholder="Nhập hướng xử lý..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
            />
          </div>

          {error && (
            <div className="md:col-span-2 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-emerald-500 px-6 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
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
  );
}
