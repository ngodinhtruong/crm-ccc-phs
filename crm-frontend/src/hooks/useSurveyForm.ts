"use client";

import { useState } from "react";

import type { SurveySendStatus } from "@/types/survey.type";
import {
  monthOf,
  parseSurveyDate,
  parseSurveyTime,
} from "@/utils/survey-datetime.util";

export const DEFAULT_MESSAGE_TEMPLATE = "Đánh giá chất lượng dịch vụ";
export const DEFAULT_MESSAGE_TYPE = "Zalo ZNS";

export type SurveyFormValues = {
  customerName: string;
  phone: string;
  /** Người nhập tự gõ, chấp nhận dd/mm/yyyy. */
  sentDate: string;
  /** Người nhập tự gõ, chấp nhận hh:mm hoặc hh:mm:ss. */
  sentTime: string;
  sendStatus: SurveySendStatus;
  /** Chuỗi rỗng = chưa khảo sát; "0" = khách chấm 0 điểm. */
  ratingScore: string;
  ratingNote: string;
  ticketRefText: string;
  messageTemplate: string;
};

const EMPTY: SurveyFormValues = {
  customerName: "",
  phone: "",
  sentDate: "",
  sentTime: "",
  sendStatus: "SUCCESS",
  ratingScore: "",
  ratingNote: "",
  ticketRefText: "",
  messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
};

/**
 * State của một dòng khảo sát đang nhập hoặc đang sửa.
 *
 * Ngày và giờ giữ nguyên chuỗi người nhập gõ chứ không ép về Date ngay: đang
 * gõ dở "17/0" mà đã ép kiểu thì ô sẽ tự nhảy hoặc bị xoá dưới tay người
 * dùng. Chỉ diễn giải lúc đọc, và diễn giải hỏng thì coi như chưa có.
 */
export function useSurveyForm(initial?: Partial<SurveyFormValues>) {
  const [values, setValues] = useState<SurveyFormValues>({
    ...EMPTY,
    ...initial,
  });

  function setField<K extends keyof SurveyFormValues>(
    key: K,
    value: SurveyFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const parsedDate = parseSurveyDate(values.sentDate);
  const parsedTime = parseSurveyTime(values.sentTime);

  // Gửi hỏng thì khách không nhận được tin nên không thể có điểm.
  const ratingDisabled = values.sendStatus === "FAILED";

  return {
    values,
    setValues,
    setField,
    parsedDate,
    parsedTime,
    ratingDisabled,
    /** Tháng dùng làm phạm vi tìm ticket của khách. */
    month: monthOf(parsedDate),
    /** Ngày gõ vào không đọc được — khác với chưa gõ gì. */
    dateInvalid: values.sentDate.trim() !== "" && parsedDate === null,
    timeInvalid: values.sentTime.trim() !== "" && parsedTime === null,
    sentAt: parsedDate ? `${parsedDate}T${parsedTime || "00:00:00"}` : null,
    ratingValue:
      ratingDisabled || values.ratingScore === ""
        ? null
        : Number(values.ratingScore),
  };
}

export type SurveyFormState = ReturnType<typeof useSurveyForm>;
