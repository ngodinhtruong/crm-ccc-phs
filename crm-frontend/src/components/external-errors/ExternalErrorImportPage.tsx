"use client";

import Link from "next/link";
import { BarChart3, ListChecks, Upload } from "lucide-react";

import { FilterSelect } from "@/components/common";
import { useExternalErrorImport } from "@/hooks/useExternalErrorImport";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function ExternalErrorImportPage() {
  const importer = useExternalErrorImport();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/workspace" },
        { label: "Lỗi bên ngoài" },
        { label: "Import dữ liệu lỗi" },
      ]}
      sidebarDefaultExpandedGroupKey="ccc-external-errors"
      sidebarDefaultActiveChildKey="external-error-import"
      rightAction={
        <div className="flex items-center gap-2">
          <Link
            href="/external-errors/dashboard"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <BarChart3 size={15} />
            Dashboard lỗi
          </Link>

          <Link
            href="/external-errors"
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ListChecks size={15} />
            Danh sách lỗi
          </Link>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-white px-4 py-3">
          <h1 className="text-sm font-semibold text-slate-800">Import dữ liệu lỗi bên ngoài</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Nhập dữ liệu thô đã xử lý xong. Backend sẽ clean và phân loại bằng AWS Bedrock nếu bật phân loại ngay.
          </p>
        </div>

        {(importer.error || importer.notice) && (
          <div
            className={`border-b px-4 py-2 text-xs ${
              importer.error
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {importer.error || importer.notice}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[360px_1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Tên file / batch</label>
                <input
                  value={importer.fileName}
                  onChange={(event) => importer.setFileName(event.target.value)}
                  placeholder="VD: errors_2026_06.xlsx"
                  className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
                />
              </div>

              <FilterSelect
                label="Nguồn import"
                value={importer.sourceType}
                onChange={importer.setSourceType}
                placeholder="Chọn nguồn"
                options={[
                  { label: "Excel", value: "EXCEL" },
                  { label: "API", value: "API" },
                  { label: "Nhập tay", value: "MANUAL" },
                ]}
              />

              <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={importer.classifyNow}
                  onChange={(event) => importer.setClassifyNow(event.target.checked)}
                />
                Phân loại ngay bằng LLM sau khi import
              </label>

              <button
                type="button"
                onClick={() => void importer.importRows()}
                disabled={importer.loading}
                className="flex h-9 w-full items-center justify-center gap-1 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
              >
                <Upload size={15} />
                {importer.loading ? "Đang import..." : "Import dữ liệu"}
              </button>

              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Bản này dùng JSON rows để kết nối backend trước. Sau khi ổn, có thể bổ sung đọc Excel trên frontend hoặc upload file thật.
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-md border border-slate-200 bg-white">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Dữ liệu raw JSON</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Field tương ứng: received_date, completed_date, source, device, result, content, cause, solution.
              </p>
            </div>

            <textarea
              value={importer.rawJson}
              onChange={(event) => importer.setRawJson(event.target.value)}
              spellCheck={false}
              className="h-[520px] w-full resize-none border-0 bg-[#0f172a] px-4 py-3 font-mono text-xs leading-5 text-slate-100 outline-none"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
