"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { ekycApi } from "@/apis/ekyc.api";
import { EkycImportResponse } from "@/types/ekyc.type";

export function EkycImportView() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<EkycImportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await ekycApi.downloadTemplate();
    } catch {
      setErrorMsg("Không thể tải file mẫu. Vui lòng thử lại sau.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setErrorMsg("Vui lòng chọn 1 file Excel (.xlsx hoặc .xls)");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await ekycApi.importExcel(file);
      setResult(res);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "Lỗi trong quá trình import file Excel. Vui lòng kiểm tra cấu trúc file.";
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              IMPORT DANH SÁCH eKYC TỪ EXCEL
            </h2>
            <p className="text-xs text-slate-500">
              Tải lên danh sách hàng loạt bản ghi cuộc gọi eKYC từ tập tin Excel
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {downloadingTemplate ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span>Tải file Excel mẫu</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <AlertCircle size={20} className="text-rose-600" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Drag & drop file area */}
        <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center hover:bg-slate-50">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <FileSpreadsheet size={28} />
          </div>
          {file ? (
            <div>
              <p className="text-sm font-bold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
              >
                Chọn file khác
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Kéo thả file Excel vào đây hoặc{" "}
                <span className="text-emerald-600 underline">bấm để chọn file</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Hỗ trợ tập tin .xlsx hoặc .xls (Tối đa 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/ekyc")}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || uploading}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UploadCloud size={16} />
            )}
            <span>Thực hiện Import</span>
          </button>
        </div>
      </div>

      {/* Kết quả Import */}
      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-800">
            KẾT QUẢ IMPORT
          </h3>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="text-xs font-medium text-emerald-700">
                Thành công
              </span>
              <p className="text-2xl font-bold text-emerald-900">
                {result.success_count} bản ghi
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <span className="text-xs font-medium text-rose-700">
                Không thành công / Lỗi
              </span>
              <p className="text-2xl font-bold text-rose-900">
                {result.error_count} bản ghi
              </p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold text-rose-700">
                CHI TIẾT LỖI DÒNG:
              </h4>
              <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-rose-600 space-y-1">
                {result.errors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => router.push("/ekyc")}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Xem danh sách eKYC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
