"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useState } from "react";

import { externalErrorService } from "@/services/external-error.service";
import { ExternalErrorRawImportRow } from "@/types/external-error.type";

const sampleRows = JSON.stringify(
  [
    {
      received_date: "01/06/2026",
      completed_date: "02/06/2026",
      source: "Khách hàng",
      device: "Mobile App",
      result: "Đã xử lý",
      content: "Không nhận được mã OTP khi mở eKYC",
      cause: "Lỗi bước xác thực OTP",
      solution: "Kiểm tra luồng gửi OTP",
    },
  ],
  null,
  2
);

export function useExternalErrorImport() {
  const [fileName, setFileName] = useState("");
  const [sourceType, setSourceType] = useState("EXCEL");
  const [classifyNow, setClassifyNow] = useState(false);
  const [rawJson, setRawJson] = useState(sampleRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const importRows = async () => {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const parsed = JSON.parse(rawJson) as ExternalErrorRawImportRow[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("Dữ liệu import phải là JSON array và có ít nhất một dòng.");
        return;
      }

      const batch = await externalErrorService.importRaw({
        file_name: fileName,
        source_type: sourceType,
        classify_now: classifyNow,
        rows: parsed,
      });

      setNotice(`Import thành công batch ${batch.batch_code} với ${batch.total_rows} dòng.`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("JSON không hợp lệ. Kiểm tra dấu ngoặc, dấu phẩy và tên field.");
      } else {
        setError(getErrorMessage(err, "Import dữ liệu lỗi thất bại"));
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    fileName,
    setFileName,
    sourceType,
    setSourceType,
    classifyNow,
    setClassifyNow,
    rawJson,
    setRawJson,
    loading,
    error,
    notice,
    importRows,
  };
}
