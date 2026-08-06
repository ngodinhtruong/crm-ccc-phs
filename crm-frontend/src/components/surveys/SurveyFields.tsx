"use client";

import {
  TicketFormField,
  TicketFormSection,
} from "@/components/tickets/TicketFormField";
import type { SurveyFormState, SurveyFormValues } from "@/hooks/useSurveyForm";
import type { SurveySendStatus } from "@/types/survey.type";
import { formatSurveyDate } from "@/utils/survey-datetime.util";

export const SURVEY_INPUT_CLASS =
  "h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500";

const TEXTAREA_CLASS =
  "w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-500";

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-slate-500">{children}</p>;
}

function Warning({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-rose-600">{children}</p>;
}

/**
 * Khách hàng và thời điểm gửi.
 *
 * Ngày giờ là ô chữ tự do: người nhập đang chép "17/07/2026" và "08:55:06"
 * từ file khảo sát mở bên cạnh, ô chọn lịch bắt bấm chuột nên chậm hơn gõ.
 */
export function SurveyCustomerFields({
  form,
  setField,
}: {
  form: SurveyFormState;
  setField: <K extends keyof SurveyFormValues>(
    key: K,
    value: SurveyFormValues[K]
  ) => void;
}) {
  const { values } = form;

  return (
    <TicketFormSection title="Khách hàng và thời điểm gửi">
      <div className="grid grid-cols-1 gap-x-20 gap-y-3 lg:grid-cols-2">
        <TicketFormField label="Khách hàng" required>
          <input
            value={values.customerName}
            onChange={(event) => setField("customerName", event.target.value)}
            placeholder="Tên khách hàng như trong file khảo sát"
            className={SURVEY_INPUT_CLASS}
          />
        </TicketFormField>

        <TicketFormField label="Số điện thoại">
          <input
            value={values.phone}
            onChange={(event) => setField("phone", event.target.value)}
            placeholder="0913334686"
            className={SURVEY_INPUT_CLASS}
          />
        </TicketFormField>

        <TicketFormField label="Ngày bắt đầu gửi" required>
          <input
            value={values.sentDate}
            onChange={(event) => setField("sentDate", event.target.value)}
            placeholder="17/07/2026"
            inputMode="numeric"
            className={SURVEY_INPUT_CLASS}
          />
          {form.dateInvalid ? (
            <Warning>Chưa đọc được ngày. Gõ theo dạng 17/07/2026.</Warning>
          ) : (
            form.parsedDate && (
              <Hint>Ngày gửi: {formatSurveyDate(form.parsedDate)}</Hint>
            )
          )}
        </TicketFormField>

        <TicketFormField label="Thời gian bắt đầu gửi">
          <input
            value={values.sentTime}
            onChange={(event) => setField("sentTime", event.target.value)}
            placeholder="08:55:06"
            inputMode="numeric"
            className={SURVEY_INPUT_CLASS}
          />
          {form.timeInvalid ? (
            <Warning>Chưa đọc được giờ. Gõ theo dạng 08:55 hoặc 08:55:06.</Warning>
          ) : (
            form.parsedTime && <Hint>Giờ gửi: {form.parsedTime}</Hint>
          )}
        </TicketFormField>
      </div>
    </TicketFormSection>
  );
}

/** Tình trạng gửi, điểm và các cột còn lại của file khảo sát. */
export function SurveyResultFields({
  form,
  setField,
}: {
  form: SurveyFormState;
  setField: <K extends keyof SurveyFormValues>(
    key: K,
    value: SurveyFormValues[K]
  ) => void;
}) {
  const { values, ratingDisabled } = form;

  return (
    <TicketFormSection title="Kết quả khảo sát">
      <div className="grid grid-cols-1 gap-x-20 gap-y-3 lg:grid-cols-2">
        <TicketFormField label="Tình trạng" required>
          <select
            value={values.sendStatus}
            onChange={(event) =>
              setField("sendStatus", event.target.value as SurveySendStatus)
            }
            className={SURVEY_INPUT_CLASS}
          >
            <option value="SUCCESS">Thành công</option>
            <option value="FAILED">Thất bại</option>
          </select>
        </TicketFormField>

        <TicketFormField label="Rate">
          <select
            value={values.ratingScore}
            onChange={(event) => setField("ratingScore", event.target.value)}
            disabled={ratingDisabled}
            className={`${SURVEY_INPUT_CLASS} disabled:bg-slate-100 disabled:text-slate-400`}
          >
            <option value="">Chưa khảo sát</option>
            {[0, 1, 2, 3, 4, 5].map((score) => (
              <option key={score} value={score}>
                {score} điểm
              </option>
            ))}
          </select>
        </TicketFormField>

        <TicketFormField label="Mẫu tin nhắn">
          <input
            value={values.messageTemplate}
            onChange={(event) => setField("messageTemplate", event.target.value)}
            className={SURVEY_INPUT_CLASS}
          />
        </TicketFormField>

        <TicketFormField label="Ticket (ghi trong file)">
          <input
            value={values.ticketRefText}
            onChange={(event) => setField("ticketRefText", event.target.value)}
            placeholder="Hỗ trợ Giao dịch"
            className={SURVEY_INPUT_CLASS}
          />
        </TicketFormField>
      </div>

      <div className="mt-3">
        <TicketFormField label="Mô tả rate">
          <textarea
            value={values.ratingNote}
            onChange={(event) => setField("ratingNote", event.target.value)}
            rows={3}
            className={TEXTAREA_CLASS}
          />
        </TicketFormField>
      </div>

      {ratingDisabled && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Gửi thất bại thì khách chưa nhận được tin nên không có điểm. Ticket này
          vẫn được gửi khảo sát lại sau.
        </p>
      )}
    </TicketFormSection>
  );
}
