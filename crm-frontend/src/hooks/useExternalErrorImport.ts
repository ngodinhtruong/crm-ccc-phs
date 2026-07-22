"use client";

import { ChangeEvent, useState } from "react";

import { externalErrorService } from "@/services/external-error.service";
import {
  ExternalErrorExcelImportResponse,
} from "@/types/external-error.type";
import { getErrorMessage } from "@/utils/error.util";

export function useExternalErrorImport() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [autoClassify, setAutoClassify] = useState(true);
  const [result, setResult] =
    useState<ExternalErrorExcelImportResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setResult(null);
    setError("");
    setNotice("");
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError("");
    setNotice("");
  };

  const importExcel = async () => {
    if (!file) {
      setError("Vui lòng chọn file Excel .xlsx hoặc .xlsm.");
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xlsm")) {
      setError("Chỉ hỗ trợ file Excel .xlsx hoặc .xlsm.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotice("");
      setResult(null);

      const response = await externalErrorService.importExcel({
        file,
        sheet_name: sheetName,
        auto_classify: autoClassify,
      });

      setResult(response);

      const queuedMessage = response.import_summary.classification_queued
        ? " Celery đã nhận task phân loại lỗi và nguyên nhân."
        : "";

      setNotice(
        `Import thành công ${response.import_summary.imported_rows} dòng vào batch ${response.batch.batch_code}.${queuedMessage}`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Import file Excel thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return {
    file,
    sheetName,
    setSheetName,
    autoClassify,
    setAutoClassify,
    result,
    loading,
    error,
    notice,
    selectFile,
    clearFile,
    importExcel,
  };
}
