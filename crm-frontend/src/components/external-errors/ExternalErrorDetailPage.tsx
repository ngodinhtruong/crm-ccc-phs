"use client";

import Link from "next/link";
import { ArrowLeft, History, Pencil, RefreshCw, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { externalErrorService } from "@/services/external-error.service";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  ExternalErrorRecord,
  ExternalErrorRecordAuditLog,
  PROCESSING_STATUS_OPTIONS,
} from "@/types/external-error.type";
import {
  CLASSIFICATION_STATUS_LABEL,
  formatConfidence,
  formatDateTime,
  statusBadgeClass,
} from "./ExternalErrorUtils";

export function normalizeProcessingStatus(value: string | null | undefined): string {
  if (!value) return "Tiếp nhận";
  const str = String(value).trim();
  if (!str) return "Tiếp nhận";

  const lower = str.toLowerCase();
  if (lower.includes("đang") || lower.includes("processing") || lower.includes("in_progress")) {
    return "Đang xử lý";
  }
  if (
    lower.includes("đã") ||
    lower.includes("khắc phục") ||
    lower.includes("hoàn thành") ||
    lower.includes("xử lý xong") ||
    lower.includes("resolved") ||
    lower.includes("done") ||
    lower.includes("fixed") ||
    lower.includes("closed")
  ) {
    return "Đã xử lý";
  }
  if (lower.includes("tiếp nhận") || lower.includes("mới") || lower.includes("received") || lower.includes("new")) {
    return "Tiếp nhận";
  }
  return str;
}

export function ExternalErrorDetailPage({ recordId }: { recordId: string }) {
  const [record, setRecord] = useState<ExternalErrorRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<ExternalErrorRecordAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State for edit mode
  const [form, setForm] = useState({
    received_date: "",
    completed_date: "",
    raw_source: "",
    raw_device: "",
    raw_result: "Tiếp nhận",
    raw_content: "",
    raw_cause: "",
    raw_solution: "",
  });

  const syncFormFromRecord = (data: ExternalErrorRecord) => {
    setForm({
      received_date: data.received_date ? data.received_date.slice(0, 16) : "",
      completed_date: data.completed_date ? data.completed_date.slice(0, 16) : "",
      raw_source: data.raw_source || data.clean_source || "",
      raw_device: data.raw_device || data.clean_device || "",
      raw_result: normalizeProcessingStatus(data.raw_result || data.clean_result),
      raw_content: data.raw_content || data.clean_content || "",
      raw_cause: data.raw_cause || data.clean_cause || "",
      raw_solution: data.raw_solution || data.clean_solution || "",
    });
  };

  const fetchRecord = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [data, logs] = await Promise.all([
        externalErrorService.getRecord(recordId),
        externalErrorService.getAuditLogs(recordId).catch(() => []),
      ]);
      setRecord(data);
      setAuditLogs(logs);
      syncFormFromRecord(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Không thể tải thông tin chi tiết lỗi."
      );
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    void fetchRecord();
  }, [fetchRecord]);

  const handleStartEdit = () => {
    if (record) {
      syncFormFromRecord(record);
    }
    setEditing(true);
  };

  const handleClassify = async () => {
    if (!record) return;
    try {
      setClassifying(true);
      const updated = await externalErrorService.classifyRecord(record.id, true);
      setRecord(updated);
      syncFormFromRecord(updated);
      const freshLogs = await externalErrorService.getAuditLogs(recordId).catch(() => []);
      setAuditLogs(freshLogs);
    } catch (err: any) {
      alert("Phân loại lại thất bại: " + (err?.message || "Lỗi không xác định"));
    } finally {
      setClassifying(false);
    }
  };

  const handleSave = async () => {
    if (!record) return;
    try {
      setSaving(true);
      const updated = await externalErrorService.updateRecord(record.id, {
        raw_source: form.raw_source,
        raw_device: form.raw_device,
        raw_result: form.raw_result,
        raw_content: form.raw_content,
        raw_cause: form.raw_cause,
        raw_solution: form.raw_solution,
      });
      setRecord(updated);
      syncFormFromRecord(updated);
      setEditing(false);
      const freshLogs = await externalErrorService.getAuditLogs(recordId).catch(() => []);
      setAuditLogs(freshLogs);
    } catch (err: any) {
      alert("Cập nhật thất bại: " + (err?.message || "Lỗi không xác định"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Lỗi bên ngoài", href: "/external-errors" },
        { label: `Chi tiết lỗi #${recordId}` },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              disabled={loading || !record}
              className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#059669] disabled:opacity-50"
            >
              <Pencil size={14} />
              Chỉnh sửa
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#059669] disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={14} />
                Hủy
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleClassify}
            disabled={classifying || loading || !record || editing}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={classifying ? "animate-spin" : ""} />
            Phân loại lại
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
        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-xs">
            Đang tải thông tin lỗi...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-600 shadow-xs">
            {error}
          </div>
        )}

        {!loading && record && (
          <>
            {/* Header info */}
            <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold text-slate-900">
                    Chi tiết lỗi bên ngoài #{record.id}
                  </h1>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Ngày tạo: <span className="font-semibold text-slate-700">{formatDateTime(record.created_at)}</span>
                    {record.batch_code && ` • Batch: ${record.batch_code}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded px-2.5 py-1 text-xs font-bold ${statusBadgeClass(record.classification_status)}`}>
                    Phân loại Lỗi: {CLASSIFICATION_STATUS_LABEL[record.classification_status] || record.classification_status}
                  </span>
                  <span className={`inline-flex rounded px-2.5 py-1 text-xs font-bold ${statusBadgeClass(record.cause_classification_status)}`}>
                    Phân loại Nguyên nhân: {CLASSIFICATION_STATUS_LABEL[record.cause_classification_status] || record.cause_classification_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Dữ liệu 8 trường */}
            <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
              <h2 className="mb-4 border-b border-slate-200 pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                Dữ liệu ghi nhận (8 Trường Import)
              </h2>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <ContrastField label="Ngày nhận" value={formatDateTime(record.received_date)} />
                <ContrastField label="Ngày hoàn thành" value={formatDateTime(record.completed_date)} />
                <ContrastField
                  label="Nguồn"
                  value={editing ? form.raw_source : (record.raw_source || record.clean_source || "-")}
                  isEditing={editing}
                  onChange={(v) => setForm({ ...form, raw_source: v })}
                />
                <ContrastField
                  label="Thiết bị"
                  value={editing ? form.raw_device : (record.raw_device || record.clean_device || "-")}
                  isEditing={editing}
                  onChange={(v) => setForm({ ...form, raw_device: v })}
                />
                <ContrastSelectField
                  label="Trạng thái xử lý"
                  value={editing ? form.raw_result : normalizeProcessingStatus(record.raw_result || record.clean_result)}
                  isEditing={editing}
                  onChange={(v) => setForm({ ...form, raw_result: v })}
                  options={PROCESSING_STATUS_OPTIONS}
                  className="sm:col-span-2 lg:col-span-4"
                />
              </div>

              <div className="mt-5 space-y-4">
                <ContrastTextArea
                  label="Nội dung lỗi (Văn bản gốc)"
                  value={editing ? form.raw_content : (record.raw_content || record.clean_content || "-")}
                  isEditing={editing}
                  onChange={(v) => setForm({ ...form, raw_content: v })}
                  accentColor="amber"
                />
                <ContrastTextArea
                  label="Nguyên nhân (Văn bản gốc)"
                  value={editing ? form.raw_cause : (record.raw_cause || record.clean_cause || "-")}
                  isEditing={editing}
                  onChange={(v) => setForm({ ...form, raw_cause: v })}
                  accentColor="blue"
                />
                <ContrastTextArea
                  label="Giải pháp khắc phục (Văn bản gốc)"
                  value={editing ? form.raw_solution : (record.raw_solution || record.clean_solution || "-")}
                  isEditing={editing}
                  onChange={(v) => setForm({ ...form, raw_solution: v })}
                  accentColor="emerald"
                />
              </div>
            </div>

            {/* Phân loại AI */}
            <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
              <h2 className="mb-4 border-b border-slate-200 pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                Kết quả phân loại tự động (AI / Rules)
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Error Code Card */}
                <div className="rounded-lg border border-slate-300 bg-[#f8fafc] p-4 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                    Phân loại Mã lỗi (Error Code)
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nhóm lỗi:</span>
                    <span className="font-bold text-slate-900">
                      {record.error_group_name ? `${record.error_group_code} - ${record.error_group_name}` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Mã lỗi:</span>
                    {record.error_code_value ? (
                      <span className="inline-flex rounded bg-emerald-600 px-2 py-0.5 font-bold text-white shadow-2xs">
                        {record.error_code_value} - {record.error_code_name}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-medium shrink-0">Vấn đề chuẩn hóa:</span>
                    <span className="font-semibold text-slate-800 text-right ml-2">{record.normalized_issue || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-slate-500 font-medium">Độ tin cậy AI:</span>
                    <span className="font-bold text-slate-900">{formatConfidence(record.classification_confidence)}</span>
                  </div>
                </div>

                {/* Cause Group Card */}
                <div className="rounded-lg border border-slate-300 bg-[#f8fafc] p-4 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                    Phân loại Nhóm nguyên nhân (Cause Group)
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nhóm nguyên nhân:</span>
                    <span className="font-bold text-slate-900">
                      {record.cause_group_name ? `${record.cause_group_code} - ${record.cause_group_name}` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-medium shrink-0">Nguyên nhân chuẩn hóa:</span>
                    <span className="font-semibold text-slate-800 text-right ml-2">{record.normalized_cause || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-slate-500 font-medium">Độ tin cậy AI:</span>
                    <span className="font-bold text-slate-900">{formatConfidence(record.cause_classification_confidence)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Logs Section */}
            <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
              <h2 className="mb-4 border-b border-slate-200 pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <History size={15} className="text-slate-600" />
                Lịch sử thay đổi & Audit Log ({auditLogs.length})
              </h2>

              {auditLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">
                  Chưa có nhật ký chỉnh sửa cho bản ghi này.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border border-slate-200 bg-[#f8fafc] p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {log.action_type === "CREATE"
                              ? "Tạo mới"
                              : log.action_type === "UPDATE"
                              ? "Cập nhật"
                              : log.action_type === "DELETE"
                              ? "Xóa"
                              : "Phân loại AI"}
                          </span>
                          {log.changed_by_username && (
                            <span className="text-slate-500">
                              bởi <strong className="text-slate-700">{log.changed_by_username}</strong>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateTime(log.changed_at)}
                        </span>
                      </div>

                      {log.note && (
                        <div className="mt-1.5 text-slate-600 italic">
                          Ghi chú: {log.note}
                        </div>
                      )}

                      {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                            Các trường thay đổi:
                          </div>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {Object.entries(log.changed_fields).map(([field, diff]) => (
                              <div
                                key={field}
                                className="rounded bg-white p-1.5 border border-slate-200 text-[11px]"
                              >
                                <span className="font-bold text-slate-700">{field}: </span>
                                <span className="text-red-600 line-through mr-1">
                                  {String(diff.old ?? "-")}
                                </span>
                                <span className="text-emerald-700 font-semibold">
                                  → {String(diff.new ?? "-")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ContrastField({
  label,
  value,
  isEditing,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  isEditing?: boolean;
  onChange?: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-300 bg-[#f8fafc] p-3 ${className}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      {isEditing && onChange ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      ) : (
        <div className="mt-1 text-xs font-bold text-slate-900 break-words">{value || "-"}</div>
      )}
    </div>
  );
}

function ContrastSelectField({
  label,
  value,
  isEditing,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  isEditing?: boolean;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const normalizedVal = normalizeProcessingStatus(value);
  const hasValueInOptions = options.some((opt) => opt.value === normalizedVal);
  const effectiveOptions = hasValueInOptions
    ? options
    : [{ value: normalizedVal, label: normalizedVal }, ...options];

  return (
    <div className={`rounded-lg border border-slate-300 bg-[#f8fafc] p-3 ${className}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      {isEditing && onChange ? (
        <select
          value={normalizedVal}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
        >
          {effectiveOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="mt-1 text-xs font-bold text-slate-900 break-words">
          <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
            {normalizedVal}
          </span>
        </div>
      )}
    </div>
  );
}

function ContrastTextArea({
  label,
  value,
  isEditing,
  onChange,
  accentColor = "slate",
}: {
  label: string;
  value: string;
  isEditing?: boolean;
  onChange?: (v: string) => void;
  accentColor?: "amber" | "blue" | "emerald" | "slate";
}) {
  const accentBorderClass =
    accentColor === "amber"
      ? "border-l-4 border-l-amber-500"
      : accentColor === "blue"
      ? "border-l-4 border-l-blue-500"
      : accentColor === "emerald"
      ? "border-l-4 border-l-emerald-500"
      : "border-l-4 border-l-slate-400";

  return (
    <div>
      <div className="mb-1.5 text-xs font-bold text-slate-800">{label}</div>
      {isEditing && onChange ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        />
      ) : (
        <div className={`min-h-16 rounded-md border border-slate-300 bg-white p-3.5 text-xs font-medium text-slate-900 leading-relaxed whitespace-pre-wrap shadow-2xs ${accentBorderClass}`}>
          {value || "-"}
        </div>
      )}
    </div>
  );
}
