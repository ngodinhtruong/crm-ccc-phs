"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastMessage;
  onClose: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div
      className={[
        "flex w-80 items-start gap-3 rounded-lg border p-3 shadow-lg transition-all animate-in slide-in-from-top-2",
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : isError
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900",
      ].join(" ")}
    >
      <div className="mt-0.5 shrink-0">
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : isError ? (
          <AlertCircle className="h-4 w-4 text-red-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        )}
      </div>

      <div className="flex-1 text-xs">
        <div className="font-bold">{toast.title}</div>
        {toast.message && <div className="mt-0.5 opacity-90">{toast.message}</div>}
      </div>

      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
