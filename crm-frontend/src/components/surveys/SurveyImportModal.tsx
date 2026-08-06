"use client";

import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Loader2, X } from "lucide-react";

import { surveyApi } from "@/apis/survey.api";
import type {
  SurveyImportResult,
  SurveyImportRow,
} from "@/types/survey.type";
import { formatDateTime } from "@/utils/date.util";
import { getErrorMessage } from "@/utils/error.util";

/**
 * Import file khảo sát theo hai bước: đọc file rồi mới ghi.
 *
 * Bước đọc không đụng vào DB — backend chỉ trả về các dòng kèm danh sách
 * ticket ứng viên. Người nhập gán ticket cho từng dòng rồi mới bấm ghi. Dòng
 * nào chưa gán thì bỏ qua, không ghi bừa vào ticket đoán được.
 */
export function SurveyImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SurveyImportRow[]>([]);
  const [picked, setPicked] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SurveyImportResult | null>(null);

  const readyCount = useMemo(
    () => Object.values(picked).filter(Boolean).length,
    [picked]
  );

  const pickFile = async (file?: File | null) => {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);
    setFileName(file.name);

    try {
      const preview = await surveyApi.importPreview(file);
      setRows(preview.results);
      // Chỉ điền sẵn dòng có đúng một ticket khả dụng; còn lại để trống cho
      // người nhập tự chọn.
      setPicked(
        Object.fromEntries(
          preview.results.map((row) => [row.row_number, row.suggested_ticket])
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Không đọc được file khảo sát"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    const payload = rows
      .filter((row) => picked[row.row_number])
      .map((row) => ({
        ticket: picked[row.row_number] as number,
        row_number: row.row_number,
        send_status: row.send_status,
        sent_at: row.sent_at,
        rating_score: row.rating_score ?? null,
        rating_note: row.rating_note || "",
        customer_name_text: row.customer_name_text || "",
        phone: row.phone || "",
        message_name: row.message_name || "",
        message_type: row.message_type || "",
        message_template: row.message_template || "",
        ticket_ref_text: row.ticket_ref_text || "",
      }));

    if (payload.length === 0) {
      setError("Chưa gán ticket cho dòng nào.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      setResult(await surveyApi.importCommit(payload));
      onImported();
    } catch (err) {
      setError(getErrorMessage(err, "Không ghi được kết quả khảo sát"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Import file khảo sát
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Đọc file trước, gán ticket cho từng dòng rồi mới ghi vào hệ thống.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b bg-slate-50 px-5 py-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="flex h-8 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={13} className="text-emerald-600" />
            )}
            Chọn file .xlsx
          </button>

          {fileName && (
            <span className="text-xs text-slate-600">
              {fileName} — đọc được{" "}
              <span className="font-bold text-slate-800">{rows.length}</span> dòng,
              đã gán ticket{" "}
              <span className="font-bold text-emerald-700">{readyCount}</span>
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {error && (
            <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}

          {result && (
            <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Đã ghi {result.created_count} dòng.
              {result.error_count > 0 && (
                <>
                  {" "}
                  {result.error_count} dòng lỗi:
                  <ul className="mt-1 list-inside list-disc">
                    {result.errors.slice(0, 5).map((item, index) => (
                      <li key={index}>
                        Dòng {item.row_number ?? "?"}: {item.detail}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {rows.length === 0 && !loading && (
            <p className="py-10 text-center text-xs text-slate-500">
              Chưa có dữ liệu. Chọn file khảo sát .xlsx để bắt đầu.
            </p>
          )}

          {rows.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr className="h-9">
                  <th className="px-2 font-semibold">Dòng</th>
                  <th className="px-2 font-semibold">Khách hàng</th>
                  <th className="px-2 font-semibold">Ngày gửi</th>
                  <th className="px-2 font-semibold">Tình trạng</th>
                  <th className="px-2 font-semibold">Rate</th>
                  <th className="px-2 font-semibold">Ticket</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const selectable = row.ticket_options.filter(
                    (item) => !item.has_survey
                  );

                  return (
                    <tr
                      key={row.row_number}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="px-2 py-2 text-slate-500">
                        {row.row_number}
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-semibold text-slate-800">
                          {row.customer_name_text || "—"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.phone || "—"}
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-slate-600">
                        {row.sent_at ? formatDateTime(row.sent_at) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            row.send_status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {row.send_status === "SUCCESS"
                            ? "Thành công"
                            : "Thất bại"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {row.rating_score ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        {selectable.length === 0 ? (
                          <span className="text-[11px] text-amber-700">
                            Không tìm được ticket khớp — bỏ qua dòng này
                          </span>
                        ) : (
                          <select
                            value={picked[row.row_number] ?? ""}
                            onChange={(e) =>
                              setPicked((current) => ({
                                ...current,
                                [row.row_number]: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }))
                            }
                            className="h-8 w-full min-w-[240px] rounded border border-slate-300 px-2 text-xs outline-none focus:border-sky-400"
                          >
                            <option value="">— Chưa gán, bỏ qua —</option>
                            {selectable.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.ticket_code} · {item.title || "(không tiêu đề)"}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <span className="text-xs text-slate-500">
            {rows.length > 0 &&
              `${readyCount}/${rows.length} dòng sẽ được ghi, còn lại bỏ qua.`}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={commit}
              disabled={saving || readyCount === 0}
              className="flex h-9 items-center gap-2 rounded bg-[#00713d] px-4 text-xs font-bold text-white hover:bg-[#005c32] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Ghi {readyCount} dòng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
