"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";

import { useExternalErrorImport } from "@/hooks/useExternalErrorImport";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function ExternalErrorImportPage() {
  const state = useExternalErrorImport();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Lỗi bên ngoài", href: "/external-errors" },
        { label: "Import Excel" },
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
      <div className="mx-auto max-w-5xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h1 className="text-sm font-semibold text-slate-800">
            Import lỗi từ Excel
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Hệ thống đọc 7 cột: Ngày nhận, Ngày hoàn thành, Nguồn,
            Thiết bị, Kết quả xử lý, Nội dung và Nguyên nhân.
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

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                File Excel <span className="text-red-500">*</span>
              </label>

              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-sky-400 hover:bg-sky-50">
                <FileSpreadsheet
                  size={34}
                  className="text-sky-600"
                />
                <span className="mt-2 text-sm font-semibold text-slate-700">
                  {state.file
                    ? state.file.name
                    : "Chọn file .xlsx hoặc .xlsm"}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Bấm để chọn file từ máy tính
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xlsm"
                  onChange={state.selectFile}
                  className="hidden"
                />
              </label>

              {state.file && (
                <button
                  type="button"
                  onClick={state.clearFile}
                  className="mt-2 inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <X size={13} />
                  Bỏ file
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Tên sheet
              </label>
              <input
                value={state.sheetName}
                onChange={(event) =>
                  state.setSheetName(event.target.value)
                }
                placeholder="Để trống để lấy sheet đầu tiên"
                className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
              />
            </div>

            <label className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
              <input
                type="checkbox"
                checked={state.autoClassify}
                onChange={(event) =>
                  state.setAutoClassify(event.target.checked)
                }
                className="mt-0.5"
              />
              <span>
                <strong>Tự động phân loại sau khi import.</strong>
                <br />
                Sau khi lưu dữ liệu, Celery sẽ phân loại lỗi và nguyên nhân
                bằng các danh mục Active mới nhất.
              </span>
            </label>

            <button
              type="button"
              disabled={!state.file || state.loading}
              onClick={() => void state.importExcel()}
              className="flex h-10 items-center gap-2 rounded bg-[#0097cf] px-5 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={15} />
              {state.loading
                ? "Đang import dữ liệu..."
                : "Import Excel"}
            </button>
          </div>

          <div className="rounded-md border border-slate-200 bg-[#f8fafc] p-4">
            <h2 className="text-sm font-semibold text-slate-800">
              Quy tắc dữ liệu
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
              <li>• Ngày nhận giữ đầy đủ ngày và giờ.</li>
              <li>
                • Ngày hoàn thành chỉ có ngày sẽ được gắn 23:59.
              </li>
              <li>
                • Thiếu ngày hoàn thành nhưng có “Đã khắc phục” sẽ
                dùng thời điểm import.
              </li>
              <li>
                • Thiếu ngày hoàn thành và chưa khắc phục sẽ bỏ qua.
              </li>
              <li>
                • Cột Nguyên nhân được lưu và clean trước khi Celery phân loại.
              </li>
              <li>
                • Các cột ngoài 7 cột quy định không được import.
              </li>
            </ul>
          </div>
        </div>

        {state.result && (
          <div className="border-t p-5">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={17} />
                Kết quả import
              </div>

              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <ResultMetric
                  label="Batch"
                  value={state.result.batch.batch_code}
                />
                <ResultMetric
                  label="Tổng dòng nguồn"
                  value={String(
                    state.result.import_summary.source_rows
                  )}
                />
                <ResultMetric
                  label="Đã import"
                  value={String(
                    state.result.import_summary.imported_rows
                  )}
                />
                <ResultMetric
                  label="Bỏ qua"
                  value={String(
                    state.result.import_summary.skipped_rows
                  )}
                />
              </div>
            </div>

            {state.result.import_summary.skipped_details.length >
              0 && (
              <div className="mt-4 overflow-hidden rounded-md border border-amber-200">
                <div className="bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                  Các dòng bị bỏ qua
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b bg-white">
                        <th className="px-3 py-2 font-semibold">
                          Dòng
                        </th>
                        <th className="px-3 py-2 font-semibold">
                          Lý do
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.result.import_summary.skipped_details.map(
                        (item) => (
                          <tr
                            key={`${item.row}-${item.reason}`}
                            className="border-b border-slate-100"
                          >
                            <td className="px-3 py-2">
                              {item.row}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {item.reason}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-emerald-200 bg-white p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
