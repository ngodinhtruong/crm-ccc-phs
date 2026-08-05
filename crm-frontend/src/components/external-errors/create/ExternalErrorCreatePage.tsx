"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Save,
} from "lucide-react";

import { useExternalErrorCreate } from "@/hooks/useExternalErrorCreate";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PROCESSING_STATUS_OPTIONS } from "@/types/external-error.type";

export function ExternalErrorCreatePage() {
  const state = useExternalErrorCreate();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Lỗi bên ngoài", href: "/external-errors" },
        { label: "Thêm lỗi mới" },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={state.reset}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Làm mới
          </button>
          <Link
            href="/external-errors"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            Quay lại
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Header info */}
        <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-xs">
          <h1 className="text-base font-bold text-slate-900">
            Thêm mới lỗi bên ngoài
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Nhập 8 trường dữ liệu tương ứng file Excel. Hệ thống sẽ tự động phân loại bằng AI dựa trên danh mục Active.
          </p>
        </div>

        {(state.error || state.notice) && (
          <div
            className={`rounded-lg border p-3.5 text-xs font-medium ${
              state.error
                ? "border-red-200 bg-red-50 text-red-600 shadow-xs"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs"
            }`}
          >
            {state.error || state.notice}
          </div>
        )}

        <form onSubmit={state.submit} className="space-y-5">
          {/* Card Dữ liệu nhập 8 trường */}
          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
            <h2 className="mb-4 border-b border-slate-200 pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">
              Dữ liệu nhập (8 Trường)
            </h2>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Ngày nhận" required>
                <input
                  type="datetime-local"
                  value={state.form.receivedDate}
                  onChange={(event) =>
                    state.setField("receivedDate", event.target.value)
                  }
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </FormField>

              <FormField label="Ngày hoàn thành">
                <input
                  type="date"
                  value={state.form.completedDate}
                  onChange={(event) =>
                    state.setField("completedDate", event.target.value)
                  }
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </FormField>

              <FormField label="Nguồn">
                <input
                  value={state.form.source}
                  onChange={(event) =>
                    state.setField("source", event.target.value)
                  }
                  placeholder="Hotline, Email, Zalo..."
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </FormField>

              <FormField label="Thiết bị">
                <input
                  value={state.form.device}
                  onChange={(event) =>
                    state.setField("device", event.target.value)
                  }
                  placeholder="Android, iOS, Web..."
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </FormField>

              <FormField label="Trạng thái xử lý" className="sm:col-span-2 lg:col-span-3">
                <select
                  value={state.form.result || "Tiếp nhận"}
                  onChange={(event) =>
                    state.setField("result", event.target.value)
                  }
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  {PROCESSING_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <label className="flex h-8.5 w-full items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 cursor-pointer shadow-xs">
                  <input
                    type="checkbox"
                    checked={state.form.autoClassify}
                    onChange={(event) =>
                      state.setField("autoClassify", event.target.checked)
                    }
                  />
                  Phân loại tự động AI
                </label>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <FormField label="Nội dung lỗi (Văn bản gốc)" required>
                <textarea
                  value={state.form.content}
                  onChange={(event) =>
                    state.setField("content", event.target.value)
                  }
                  rows={3}
                  placeholder="Mô tả đầy đủ lỗi khách hàng hoặc hệ thống gặp phải..."
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </FormField>

              <FormField label="Nguyên nhân (Văn bản gốc)">
                <textarea
                  value={state.form.cause}
                  onChange={(event) =>
                    state.setField("cause", event.target.value)
                  }
                  rows={3}
                  placeholder="Nguyên nhân phát sinh lỗi (nếu có)..."
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </FormField>

              <FormField label="Giải pháp khắc phục (Văn bản gốc)">
                <textarea
                  value={state.form.solution}
                  onChange={(event) =>
                    state.setField("solution", event.target.value)
                  }
                  rows={3}
                  placeholder="Giải pháp / biện pháp khắc phục (nếu có)..."
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </FormField>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                type="submit"
                disabled={!state.canSubmit || state.saving}
                className="flex h-9 items-center gap-1.5 rounded-md bg-[#10b981] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#059669] disabled:opacity-50"
              >
                <Save size={14} />
                {state.saving ? "Đang lưu..." : "Lưu lỗi"}
              </button>

              {state.createdRecord && (
                <button
                  type="button"
                  onClick={state.goToList}
                  className="flex h-9 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100"
                >
                  <CheckCircle2 size={14} />
                  Xem danh sách
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Kết quả phân loại sau khi tạo */}
        {state.createdRecord && (
          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
            <h2 className="mb-4 border-b border-slate-200 pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">
              Kết quả phân loại tự động (AI / Rules)
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-300 bg-[#f8fafc] p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">Phân loại Mã lỗi</div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nhóm lỗi:</span>
                  <span className="font-bold text-slate-900">
                    {state.createdRecord.error_group_name || "Chưa xác định"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Mã lỗi:</span>
                  <span className="font-bold text-emerald-700">
                    {state.createdRecord.error_code_value ? `${state.createdRecord.error_code_value} - ${state.createdRecord.error_code_name}` : "Chưa xác định"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Trạng thái:</span>
                  <span className="font-bold text-slate-900">
                    {state.createdRecord.classification_status}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-300 bg-[#f8fafc] p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">Phân loại Nhóm nguyên nhân</div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nhóm nguyên nhân:</span>
                  <span className="font-bold text-slate-900">
                    {state.createdRecord.cause_group_name || "Chưa xác định"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Trạng thái:</span>
                  <span className="font-bold text-slate-900">
                    {state.createdRecord.cause_classification_status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function FormField({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-300 bg-[#f8fafc] p-3 ${className}`}>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {children}
    </div>
  );
}
