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

export function ExternalErrorCreatePage() {
  const state = useExternalErrorCreate();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Lỗi bên ngoài", href: "/external-errors" },
        { label: "Thêm lỗi" },
      ]}
      rightAction={
        <Link
          href="/external-errors"
          className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={14} />
          Quay lại
        </Link>
      }
    >
      <div className="mx-auto max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h1 className="text-sm font-semibold text-slate-800">
            Thêm mới lỗi bên ngoài
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Nhập các trường tương ứng file Excel. Nhóm lỗi và mã lỗi sẽ
            do LLM phân loại từ danh mục Active.
          </p>
        </div>

        {(state.error || state.notice) && (
          <div
            className={`border-b px-4 py-2 text-xs ${
              state.error
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {state.error || state.notice}
          </div>
        )}

        <form
          onSubmit={state.submit}
          className="grid gap-4 p-5 md:grid-cols-2"
        >
          <FormField label="Ngày nhận" required>
            <input
              type="datetime-local"
              value={state.form.receivedDate}
              onChange={(event) =>
                state.setField("receivedDate", event.target.value)
              }
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            />
          </FormField>

          <FormField label="Ngày hoàn thành">
            <input
              type="date"
              value={state.form.completedDate}
              onChange={(event) =>
                state.setField("completedDate", event.target.value)
              }
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Nếu chỉ có ngày, backend lưu lúc 23:59.
            </p>
          </FormField>

          <FormField label="Nguồn">
            <input
              value={state.form.source}
              onChange={(event) =>
                state.setField("source", event.target.value)
              }
              placeholder="Hotline, Email, Zalo..."
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            />
          </FormField>

          <FormField label="Thiết bị">
            <input
              value={state.form.device}
              onChange={(event) =>
                state.setField("device", event.target.value)
              }
              placeholder="Android, iOS, Web..."
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            />
          </FormField>

          <FormField label="Kết quả xử lý">
            <input
              value={state.form.result}
              onChange={(event) =>
                state.setField("result", event.target.value)
              }
              placeholder="Đã khắc phục, đang xử lý..."
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            />
          </FormField>

          <div className="flex items-end">
            <label className="flex min-h-9 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs text-emerald-800">
              <input
                type="checkbox"
                checked={state.form.autoClassify}
                onChange={(event) =>
                  state.setField(
                    "autoClassify",
                    event.target.checked
                  )
                }
              />
              Tự động phân loại bằng LLM sau khi lưu
            </label>
          </div>

          <div className="md:col-span-2">
            <FormField label="Nội dung" required>
              <textarea
                value={state.form.content}
                onChange={(event) =>
                  state.setField("content", event.target.value)
                }
                rows={7}
                placeholder="Mô tả đầy đủ lỗi khách hàng hoặc hệ thống gặp phải..."
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
            </FormField>
          </div>

          <div className="flex items-center gap-2 border-t pt-4 md:col-span-2">
            <button
              type="submit"
              disabled={!state.canSubmit || state.saving}
              className="flex h-9 items-center gap-1 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
            >
              <Save size={14} />
              {state.saving
                ? "Đang lưu và phân loại..."
                : "Lưu lỗi"}
            </button>

            <button
              type="button"
              onClick={state.reset}
              className="flex h-9 items-center gap-1 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={14} />
              Làm mới
            </button>

            {state.createdRecord && (
              <button
                type="button"
                onClick={state.goToList}
                className="ml-auto flex h-9 items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <CheckCircle2 size={14} />
                Xem danh sách
              </button>
            )}
          </div>
        </form>

        {state.createdRecord && (
          <div className="border-t bg-[#f8fafc] p-5">
            <h2 className="text-sm font-semibold text-slate-800">
              Kết quả phân loại
            </h2>
            <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <ResultItem
                label="Nhóm lỗi"
                value={
                  state.createdRecord.error_group_name ||
                  "Chưa xác định"
                }
              />
              <ResultItem
                label="Mã lỗi"
                value={
                  state.createdRecord.error_code_value ||
                  "Chưa xác định"
                }
              />
              <ResultItem
                label="Tên lỗi"
                value={
                  state.createdRecord.error_code_name ||
                  "Chưa xác định"
                }
              />
              <ResultItem
                label="Trạng thái"
                value={state.createdRecord.classification_status}
              />
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
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function ResultItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
