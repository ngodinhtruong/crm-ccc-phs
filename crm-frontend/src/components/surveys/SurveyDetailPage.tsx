"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Ticket as TicketIcon } from "lucide-react";

import { surveyApi } from "@/apis/survey.api";
import {
  SurveyCustomerFields,
  SurveyResultFields,
  SURVEY_INPUT_CLASS,
} from "@/components/surveys/SurveyFields";
import {
  TicketFormField,
  TicketFormSection,
} from "@/components/tickets/TicketFormField";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { useSurveyForm, type SurveyFormValues } from "@/hooks/useSurveyForm";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { SurveyAuditLog, SurveyLog } from "@/types/survey.type";
import { getErrorMessage } from "@/utils/error.util";
import { hasPermission } from "@/utils/permission.util";
import {
  formatSurveyDateTime,
  splitSentAt,
} from "@/utils/survey-datetime.util";

const SURVEY_UPDATE_PERMISSION = "SURVEY_UPDATE";

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
};

function toFormValues(log: SurveyLog): SurveyFormValues {
  const { date, time } = splitSentAt(log.sent_at);

  return {
    // Ưu tiên tên đã gõ lúc nhập, không lấy tên khách trong CRM: file khảo
    // sát hay ghi "Hằng", "Cường" và người nhập cần thấy đúng thứ đã lưu.
    customerName: log.customer_name_text || log.customer_name || "",
    phone: log.phone || "",
    sentDate: date,
    sentTime: time,
    sendStatus: log.send_status,
    ratingScore:
      log.rating_score === null || log.rating_score === undefined
        ? ""
        : String(log.rating_score),
    ratingNote: log.rating_note || "",
    ticketRefText: log.ticket_ref_text || "",
    messageTemplate: log.message_template || "",
  };
}

/** Giá trị trong nhật ký về dạng người đọc được. */
function auditValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return field === "rating_score" ? "chưa chấm" : "(trống)";
  }

  if (field === "send_status") {
    return STATUS_LABELS[String(value)] || String(value);
  }

  if (field === "sent_at") {
    return formatSurveyDateTime(String(value));
  }

  if (field === "rating_score") {
    return `${value}/5`;
  }

  return String(value);
}

function TicketCard({ log }: { log: SurveyLog }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <TicketIcon size={14} className="mt-0.5 shrink-0 text-slate-400" />

      <div className="min-w-0">
        <Link
          href={`/tickets/${log.ticket}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline"
        >
          {log.ticket_code}
          <ExternalLink size={11} />
        </Link>

        <p className="text-xs text-slate-700">{log.ticket_title || ""}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Nhập bởi {log.created_by_name || "—"} ·{" "}
          {log.entry_source === "IMPORT" ? "Import Excel" : "Nhập tay"}
        </p>
      </div>
    </div>
  );
}

/** Một dòng chỉ đọc, canh cùng lưới nhãn với ô nhập để hai chế độ khớp nhau. */
function ReadonlyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[240px_1fr] items-center">
      <span className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
        {label}
      </span>
      <div className="pl-3 text-xs text-slate-800">{children}</div>
    </div>
  );
}

function SurveyView({ log }: { log: SurveyLog }) {
  const rating =
    log.rating_score === null || log.rating_score === undefined ? null : log.rating_score;

  return (
    <>
      <TicketFormSection title="Khách hàng và thời điểm gửi">
        <div className="grid grid-cols-1 gap-x-20 gap-y-1 lg:grid-cols-2">
          <ReadonlyField label="Khách hàng">
            <span className="font-semibold">
              {log.customer_name_text || log.customer_name || "—"}
            </span>
          </ReadonlyField>

          <ReadonlyField label="Số điện thoại">{log.phone || "—"}</ReadonlyField>

          <ReadonlyField label="Thời điểm gửi">
            {formatSurveyDateTime(log.sent_at)}
          </ReadonlyField>

          <ReadonlyField label="Loại tin nhắn">
            {log.message_type || "—"}
          </ReadonlyField>
        </div>
      </TicketFormSection>

      <TicketFormSection title="Kết quả khảo sát">
        <div className="grid grid-cols-1 gap-x-20 gap-y-1 lg:grid-cols-2">
          <ReadonlyField label="Tình trạng">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                log.send_status === "SUCCESS"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {log.send_status_label}
            </span>
          </ReadonlyField>

          <ReadonlyField label="Rate">
            {/* null = chưa khảo sát, khác hẳn với chấm 0 điểm. */}
            {rating === null ? (
              <span className="text-slate-400">chưa chấm</span>
            ) : (
              <span className="font-bold">{rating}/5</span>
            )}
          </ReadonlyField>

          <ReadonlyField label="Mẫu tin nhắn">
            {log.message_template || "—"}
          </ReadonlyField>

          <ReadonlyField label="Ticket (ghi trong file)">
            {log.ticket_ref_text || "—"}
          </ReadonlyField>
        </div>

        <div className="mt-1">
          <ReadonlyField label="Mô tả rate">
            {log.rating_note || "—"}
          </ReadonlyField>
        </div>
      </TicketFormSection>
    </>
  );
}

function AuditTrail({ logs }: { logs: SurveyAuditLog[] }) {
  return (
    <TicketFormSection title="Lịch sử chỉnh sửa">
      {logs.length === 0 && (
        <p className="text-xs text-slate-500">Chưa có thay đổi nào.</p>
      )}

      <ol className="space-y-2">
        {logs.map((entry) => (
          <li
            key={entry.id}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  entry.action_type === "CREATE"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {entry.action_label}
              </span>

              <span className="font-semibold text-slate-800">
                {entry.changed_by_name || "—"}
              </span>

              <span className="text-slate-500">
                {formatSurveyDateTime(entry.changed_at)}
              </span>

              {entry.note && <span className="text-slate-500">· {entry.note}</span>}
            </div>

            {entry.changed_fields &&
              Object.entries(entry.changed_fields).length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {Object.entries(entry.changed_fields).map(([field, change]) => (
                    <li key={field} className="text-[11px] text-slate-600">
                      <span className="font-semibold">{change.label}:</span>{" "}
                      <span className="text-rose-600 line-through">
                        {auditValue(field, change.old)}
                      </span>{" "}
                      →{" "}
                      <span className="font-semibold text-emerald-700">
                        {auditValue(field, change.new)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
          </li>
        ))}
      </ol>
    </TicketFormSection>
  );
}

function SurveyEditForm({
  log,
  onSaved,
  onCancel,
}: {
  log: SurveyLog;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const form = useSurveyForm(toFormValues(log));

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!form.parsedDate) {
      setError("Chưa nhập được ngày gửi. Gõ theo dạng 17/07/2026.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await surveyApi.update(log.id, {
        send_status: form.values.sendStatus,
        sent_at: form.sentAt,
        rating_score: form.ratingValue,
        rating_note: form.values.ratingNote,
        customer_name_text: form.values.customerName,
        phone: form.values.phone,
        message_template: form.values.messageTemplate,
        ticket_ref_text: form.values.ticketRefText,
        note,
      });

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được thay đổi"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <SurveyCustomerFields form={form} setField={form.setField} />

      <SurveyResultFields form={form} setField={form.setField} />

      <TicketFormSection title="Lý do sửa">
        <TicketFormField label="Ghi chú">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Vì sao phải sửa dòng này — lưu vào lịch sử"
            className={SURVEY_INPUT_CLASS}
          />
        </TicketFormField>
      </TicketFormSection>

      {error && (
        <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}

      <div className="fixed bottom-0 left-10 right-0 z-20 flex h-14 items-center justify-center gap-3 border-t bg-white">
        <button
          type="submit"
          disabled={saving}
          className="flex h-9 items-center gap-2 rounded bg-emerald-500 px-7 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Lưu thay đổi
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded px-4 text-xs font-semibold text-red-500 hover:bg-red-50"
        >
          Hủy bỏ
        </button>
      </div>
    </form>
  );
}

/**
 * Xem một kết quả khảo sát, và sửa khi cần.
 *
 * Mở ra là chế độ xem: phần lớn lượt vào đây chỉ để tra lại khách này đã chấm
 * mấy điểm, mà mở thẳng vào form sửa thì rất dễ lỡ tay đổi rồi lưu.
 *
 * Tải xong mới dựng form: `useSurveyForm` nhận giá trị ban đầu lúc mount, đổ
 * dữ liệu vào sau bằng effect thì phải đồng bộ state hai lần và người dùng
 * kịp nhìn thấy ô trống nhấp nháy.
 */
export function SurveyDetailPage({ surveyId }: { surveyId: number }) {
  const router = useRouter();
  const { currentUser } = useCurrentUserPermissions();
  const canEdit = hasPermission(currentUser, SURVEY_UPDATE_PERMISSION);

  const [log, setLog] = useState<SurveyLog | null>(null);
  const [audits, setAudits] = useState<SurveyAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [detail, history] = await Promise.all([
          surveyApi.detail(surveyId),
          surveyApi.auditLogs(surveyId),
        ]);

        if (cancelled) return;

        setLog(detail);
        setAudits(history);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Không tải được kết quả khảo sát"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [surveyId, reloadKey]);

  return (
    <DashboardLayout
      /*
       * Breadcrumb là vết đi lại (TRANG CHỦ > Tickets > 310726001 > ...), nên
       * để mã ticket ở nút cuối thì trên màn hình có hai mã ticket cạnh nhau:
       * một mã của trang vừa ghé qua, một mã của khảo sát này. Đọc nhầm là
       * tưởng lưu sai ticket. Mã ticket thật nằm ở thẻ ticket bên dưới.
       */
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Khảo sát", href: "/surveys" },
        { label: "Kết quả khảo sát" },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {audits.length} lần ghi nhận
          </span>

          {log && canEdit && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-8 items-center gap-1.5 rounded bg-[#00713d] px-3 text-xs font-bold text-white hover:bg-[#005c32]"
            >
              <Pencil size={13} />
              Sửa
            </button>
          )}

          {!editing && (
            <button
              type="button"
              onClick={() => router.push("/surveys")}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quay lại
            </button>
          )}
        </div>
      }
    >
      {loading && (
        <div className="rounded-md border bg-white px-4 py-3 text-sm text-slate-500">
          Đang tải kết quả khảo sát...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {log && (
        <div className={editing ? "pb-20" : undefined}>
          <TicketFormSection title="Ticket của kết quả khảo sát này">
            <TicketCard log={log} />

            {editing && (
              <p className="mt-2 text-[11px] text-slate-500">
                Không đổi được ticket của một dòng đã nhập: chuyển sang ticket
                khác thì điểm CSAT của cả hai ticket đều sai. Nhập nhầm ticket
                thì đổi tình trạng dòng này thành Thất bại rồi nhập lại dòng
                mới.
              </p>
            )}
          </TicketFormSection>

          {editing ? (
            <SurveyEditForm
              key={log.id}
              log={log}
              onSaved={() => {
                setEditing(false);
                reload();
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <SurveyView log={log} />
          )}

          <AuditTrail logs={audits} />
        </div>
      )}
    </DashboardLayout>
  );
}
