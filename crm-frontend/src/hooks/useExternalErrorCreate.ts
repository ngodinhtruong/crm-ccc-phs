"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { externalErrorService } from "@/services/external-error.service";
import { ExternalErrorRecord } from "@/types/external-error.type";
import { getErrorMessage } from "@/utils/error.util";

type FormState = {
  receivedDate: string;
  completedDate: string;
  source: string;
  device: string;
  result: string;
  content: string;
  autoClassify: boolean;
};

function toLocalDateTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

const initialForm = (): FormState => ({
  receivedDate: toLocalDateTimeInputValue(new Date()),
  completedDate: "",
  source: "",
  device: "",
  result: "",
  content: "",
  autoClassify: true,
});

export function useExternalErrorCreate() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [createdRecord, setCreatedRecord] =
    useState<ExternalErrorRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canSubmit = useMemo(
    () => Boolean(form.receivedDate && form.content.trim()),
    [form.content, form.receivedDate]
  );

  const setField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const reset = () => {
    setForm(initialForm());
    setCreatedRecord(null);
    setError("");
    setNotice("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setError("Ngày nhận và Nội dung là bắt buộc.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const record = await externalErrorService.createRecord({
        received_date: form.receivedDate,
        completed_date: form.completedDate || undefined,
        source: form.source.trim(),
        device: form.device.trim(),
        result: form.result.trim(),
        content: form.content.trim(),
        auto_classify: form.autoClassify,
      });

      setCreatedRecord(record);
      setNotice(
        record.classification_status === "FAILED"
          ? "Đã tạo lỗi nhưng phân loại tự động thất bại. Có thể phân loại lại trong danh sách."
          : "Đã tạo lỗi và xử lý phân loại tự động."
      );
    } catch (err) {
      setError(getErrorMessage(err, "Thêm lỗi thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const goToList = () => router.push("/external-errors");

  return {
    form,
    setField,
    canSubmit,
    createdRecord,
    saving,
    error,
    notice,
    submit,
    reset,
    goToList,
  };
}
