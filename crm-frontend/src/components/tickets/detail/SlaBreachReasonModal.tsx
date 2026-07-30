"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export type BreachReasonOption = {
  id: number;
  reason_code?: string;
  reason_name?: string;
};

/**
 * Modal nhập lý do vượt SLA — chỉ bật lên khi backend chặn việc đóng ticket
 * đã trễ hạn mà chưa khai lý do.
 */
export function SlaBreachReasonModal({
  reasons,
  saving,
  onClose,
  onSubmit,
}: {
  reasons: BreachReasonOption[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (reasonId: number, note: string) => void;
}) {
  useEscapeKey(onClose);
  const [reasonId, setReasonId] = useState<number | null>(
    reasons[0]?.id ?? null
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!reasonId) {
      setError("Vui lòng chọn lý do vượt SLA.");
      return;
    }

    onSubmit(reasonId, note);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-800">
            Ticket đã vượt SLA, vui lòng nhập lý do
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="grid grid-cols-3 items-center gap-3">
            <label className="col-span-1 rounded bg-slate-50 px-3 py-2 text-right text-xs font-semibold text-slate-600">
              Lý do vượt SLA <span className="text-rose-500">*</span>
            </label>
            <select
              value={reasonId ?? ""}
              onChange={(event) => {
                setReasonId(event.target.value ? Number(event.target.value) : null);
                setError("");
              }}
              className="col-span-2 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500"
            >
              <option value="">-- Chọn lý do --</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reason_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 items-start gap-3">
            <label className="col-span-1 rounded bg-slate-50 px-3 py-2 text-right text-xs font-semibold text-slate-600">
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="col-span-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="rounded-lg bg-emerald-500 px-6 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Đang xử lý..." : "Xác nhận"}
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
