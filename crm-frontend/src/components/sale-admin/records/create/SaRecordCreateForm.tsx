"use client";

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
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h1 className="text-sm font-semibold text-slate-800">
          {isEdit ? "Chỉnh sửa SA Record" : "Ghi nhận kết quả cuộc gọi"}
        </h1>

        <p className="mt-0.5 text-xs text-slate-500">
          {isEdit
            ? "Cập nhật thông tin SA Record. Nội dung thay đổi sẽ được lưu vào lịch sử chỉnh sửa."
            : "Tích hợp kết quả cuộc gọi CRM CloudGo với CRM mini để thống nhất dữ liệu SA Record."}
        </p>
      </div>

      {create.masterError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
          {create.masterError}
        </div>
      )}

      {create.error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
          {create.error}
        </div>
      )}

      <div className="space-y-6 p-4">
        <SaRecordAccountSection create={create} />
        <SaRecordCallSection create={create} />
        <SaRecordTransactionSection create={create} mode={mode} />

        <div className="flex justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={create.cancel}
            className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={create.submit}
            disabled={create.submitting}
            className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {create.submitting
              ? isEdit
                ? "Đang cập nhật..."
                : "Đang lưu..."
              : isEdit
                ? "Cập nhật SA Record"
                : "Lưu SA Record"}
          </button>
        </div>
      </div>
    </div>
  );
}