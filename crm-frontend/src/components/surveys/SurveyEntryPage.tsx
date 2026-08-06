"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { surveyApi } from "@/apis/survey.api";
import {
  SurveyCustomerFields,
  SurveyResultFields,
} from "@/components/surveys/SurveyFields";
import { TicketPicker } from "@/components/surveys/TicketPicker";
import { TicketFormSection } from "@/components/tickets/TicketFormField";
import {
  DEFAULT_MESSAGE_TYPE,
  useSurveyForm,
  type SurveyFormValues,
} from "@/hooks/useSurveyForm";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getErrorMessage } from "@/utils/error.util";

// Ba trường này quyết định danh sách ticket tìm được, đổi chúng thì ticket
// đang chọn không còn đúng nữa.
const SEARCH_FIELDS: Array<keyof SurveyFormValues> = [
  "customerName",
  "phone",
  "sentDate",
];

/**
 * Nhập tay một kết quả khảo sát, theo đúng các cột của file khảo sát.
 *
 * Là một trang riêng chứ không phải popup: người nhập phải vừa dò tên khách,
 * vừa đọc danh sách ticket trong tháng rồi mới chọn được, làm trong hộp thoại
 * chật thì danh sách ticket bị cuộn trong một khung nhỏ và rất dễ chọn nhầm.
 */
export function SurveyEntryPage() {
  const router = useRouter();
  const form = useSurveyForm();

  const [ticketId, setTicketId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const setField: typeof form.setField = (key, value) => {
    form.setField(key, value);

    if (SEARCH_FIELDS.includes(key)) {
      setTicketId(null);
    }
  };

  const save = async (keepEntering: boolean) => {
    if (!ticketId) {
      setError("Chưa chọn ticket cho kết quả khảo sát này.");
      return;
    }

    if (!form.parsedDate) {
      setError("Chưa nhập được ngày gửi. Gõ theo dạng 17/07/2026.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved("");

    try {
      await surveyApi.create({
        ticket: ticketId,
        send_status: form.values.sendStatus,
        sent_at: form.sentAt,
        // Để trống nghĩa là chưa khảo sát, khác với chấm 0 điểm.
        rating_score: form.ratingValue,
        rating_note: form.values.ratingNote,
        customer_name_text: form.values.customerName,
        phone: form.values.phone,
        message_type: DEFAULT_MESSAGE_TYPE,
        message_template: form.values.messageTemplate,
        ticket_ref_text: form.values.ticketRefText,
      });

      if (!keepEntering) {
        router.push("/surveys");
        return;
      }

      // Nhập cả đợt thì thường cùng ngày gửi và cùng mẫu tin nhắn, giữ lại
      // hai trường đó để khỏi phải gõ lại từng dòng.
      setSaved(`Đã lưu khảo sát của ${form.values.customerName || "khách hàng"}.`);
      setTicketId(null);
      form.setValues((current) => ({
        ...current,
        customerName: "",
        phone: "",
        sendStatus: "SUCCESS",
        ratingScore: "",
        ratingNote: "",
        ticketRefText: "",
      }));
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được kết quả khảo sát"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Khảo sát", href: "/surveys" },
        { label: "Nhập khảo sát" },
      ]}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
        className="pb-20"
      >
        <SurveyCustomerFields form={form} setField={setField} />

        <TicketFormSection title="Ticket của khách trong tháng gửi">
          <TicketPicker
            customerName={form.values.customerName}
            phone={form.values.phone}
            month={form.month}
            value={ticketId}
            onChange={setTicketId}
          />
        </TicketFormSection>

        <SurveyResultFields form={form} setField={setField} />

        {saved && (
          <p className="mb-3 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 size={14} />
            {saved}
          </p>
        )}

        {error && (
          <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {error}
          </p>
        )}

        <div className="fixed bottom-0 left-10 right-0 z-20 flex h-14 items-center justify-center gap-3 border-t bg-white">
          <button
            type="submit"
            disabled={saving || !ticketId}
            className="flex h-9 items-center gap-2 rounded bg-emerald-500 px-7 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Lưu
          </button>

          <button
            type="button"
            onClick={() => void save(true)}
            disabled={saving || !ticketId}
            className="h-9 rounded border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Lưu và nhập tiếp
          </button>

          <button
            type="button"
            onClick={() => router.push("/surveys")}
            className="h-9 rounded px-4 text-xs font-semibold text-red-500 hover:bg-red-50"
          >
            Hủy bỏ
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
