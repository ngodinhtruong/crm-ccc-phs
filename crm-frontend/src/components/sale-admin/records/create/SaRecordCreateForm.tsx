"use client";

import { AlertTriangle, PhoneCall, Save, X } from "lucide-react";

import {
  SaRecordFormController,
  SaRecordFormMode,
} from "@/types/sale-admin.type";

import {
  SaRecordAccountSection,
  SaRecordCallSection,
  SaRecordTransactionSection,
} from "./SaRecordCreateSections";

type SaRecordCreateFormProps = {
  create: SaRecordFormController;
  mode?: SaRecordFormMode;
};

export function SaRecordCreateForm({
  create,
  mode = "create",
}: SaRecordCreateFormProps) {
  const isEdit = mode === "edit";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981] text-white shadow-sm">
            <PhoneCall size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">
              {isEdit ? "Chỉnh sửa SA Record" : "Ghi nhận kết quả cuộc gọi (SA Record)"}
            </h1>
            <p className="text-xs text-slate-500">
              {isEdit
                ? "Cập nhật dữ liệu tương tác SA Record. Mọi chỉnh sửa được ghi vết vào nhật ký kiểm toán."
                : "Tích hợp kết quả chăm sóc khách hàng CRM CloudGo với hệ thống quản lý SA Record."}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={create.cancel}
            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <X size={14} />
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={create.submit}
            disabled={create.submitting}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#10b981] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#059669] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={14} />
            {create.submitting
              ? isEdit
                ? "Đang cập nhật..."
                : "Đang lưu SA Record..."
              : isEdit
                ? "Cập nhật SA Record"
                : "Lưu SA Record"}
          </button>
        </div>
      </div>

      {/* Error Banners */}
      {create.masterError && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
          <AlertTriangle size={15} className="shrink-0 text-red-600" />
          <span>{create.masterError}</span>
        </div>
      )}

      {create.error && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
          <AlertTriangle size={15} className="shrink-0 text-red-600" />
          <span>{create.error}</span>
        </div>
      )}

      {/* Sections Body */}
      <div className="space-y-3.5 p-3.5 sm:p-4">
        <SaRecordAccountSection create={create} />
        <SaRecordCallSection create={create} />
        <SaRecordTransactionSection create={create} mode={mode} />

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3.5">
          <span className="text-xs text-slate-500">
            * Các trường có dấu <span className="font-bold text-red-500">*</span> là bắt buộc nhập
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={create.cancel}
              className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={create.submit}
              disabled={create.submitting}
              className="flex h-9 items-center gap-1.5 rounded-md bg-[#10b981] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#059669] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={15} />
              {create.submitting
                ? isEdit
                  ? "Đang cập nhật..."
                  : "Đang lưu SA Record..."
                : isEdit
                  ? "Cập nhật SA Record"
                  : "Lưu SA Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}