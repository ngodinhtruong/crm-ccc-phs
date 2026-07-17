"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { externalErrorService } from "@/services/external-error.service";
import {
  ExternalErrorBatch,
  ExternalErrorListParams,
  ExternalErrorRecord,
} from "@/types/external-error.type";

const PAGE_SIZE = 20;

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as { response?: { status?: number; data?: unknown }; message?: string };
  const detail = error?.response?.data ? JSON.stringify(error.response.data) : error?.message;
  return `${fallback}. Status: ${error?.response?.status || "unknown"} - ${detail || "Không rõ lỗi"}`;
}

export function useExternalErrors() {
  const [records, setRecords] = useState<ExternalErrorRecord[]>([]);
  const [batches, setBatches] = useState<ExternalErrorBatch[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const [dateField, setDateField] = useState("received_date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [source, setSource] = useState("");
  const [device, setDevice] = useState("");
  const [errorType, setErrorType] = useState("");
  const [issue, setIssue] = useState("");
  const [status, setStatus] = useState("");
  const [batch, setBatch] = useState("");
  const [needReview, setNeedReview] = useState("");

  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const textFilters = useMemo(
    () => ({ q, issue }),
    [q, issue]
  );
  const debouncedTextFilters = useDebounce(textFilters, 500);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const fromRecord = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toRecord = Math.min(page * PAGE_SIZE, count);

  const buildParams = useCallback(
    (pageValue: number): ExternalErrorListParams => ({
      page: String(pageValue),
      q: debouncedTextFilters.q,
      issue: debouncedTextFilters.issue,
      date_field: dateField,
      date_from: dateFrom,
      date_to: dateTo,
      source,
      device,
      error_type: errorType,
      status,
      batch,
      need_review: needReview,
    }),
    [batch, dateField, dateFrom, dateTo, debouncedTextFilters.issue, debouncedTextFilters.q, device, errorType, needReview, source, status]
  );

  const loadRecords = useCallback(
    async (pageValue: number) => {
      try {
        setLoading(true);
        setError("");
        const data = await externalErrorService.getRecords(buildParams(pageValue));
        setRecords(data.results || []);
        setCount(data.count || 0);
      } catch (err) {
        setError(getErrorMessage(err, "Không tải được danh sách lỗi"));
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  const loadBatches = useCallback(async () => {
    try {
      setBatchLoading(true);
      const data = await externalErrorService.getBatches();
      setBatches(data || []);
    } catch {
      setBatches([]);
    } finally {
      setBatchLoading(false);
    }
  }, []);

  const search = () => {
    setPage(1);
    void loadRecords(1);
  };

  const clearFilter = () => {
    setQ("");
    setDateField("received_date");
    setDateFrom("");
    setDateTo("");
    setSource("");
    setDevice("");
    setErrorType("");
    setIssue("");
    setStatus("");
    setBatch("");
    setNeedReview("");
    setPage(1);
  };

  const reload = () => {
    void loadRecords(page);
    void loadBatches();
  };

  const goPrevious = () => {
    const nextPage = Math.max(1, page - 1);
    setPage(nextPage);
    void loadRecords(nextPage);
  };

  const goNext = () => {
    const nextPage = Math.min(totalPages, page + 1);
    setPage(nextPage);
    void loadRecords(nextPage);
  };

  const classifyRecord = async (id: number, force = false) => {
    try {
      setActionLoading(true);
      setNotice("");
      setError("");
      await externalErrorService.classifyRecord(id, force);
      setNotice("Đã phân loại lại dòng lỗi.");
      await loadRecords(page);
    } catch (err) {
      setError(getErrorMessage(err, "Phân loại lỗi thất bại"));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRecord = async (id: number) => {
    try {
      setActionLoading(true);
      setNotice("");
      setError("");
      await externalErrorService.confirmRecord(id);
      setNotice("Đã xác nhận phân loại lỗi.");
      await loadRecords(page);
    } catch (err) {
      setError(getErrorMessage(err, "Xác nhận phân loại thất bại"));
    } finally {
      setActionLoading(false);
    }
  };

  const bulkClassifyMatching = async (force = false) => {
    try {
      setActionLoading(true);
      setNotice("");
      setError("");
      const stats = await externalErrorService.bulkClassify({ all_matching: true, force });
      setNotice(`Đã gửi phân loại các dòng đang lọc. Kết quả: ${JSON.stringify(stats)}`);
      await loadRecords(page);
    } catch (err) {
      setError(getErrorMessage(err, "Phân loại hàng loạt thất bại"));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    void loadRecords(1);
    setPage(1);
  }, [dateField, dateFrom, dateTo, source, device, errorType, status, batch, needReview, debouncedTextFilters, loadRecords]);

  return {
    records,
    batches,
    count,
    page,
    totalPages,
    fromRecord,
    toRecord,
    q,
    setQ,
    dateField,
    setDateField,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    source,
    setSource,
    device,
    setDevice,
    errorType,
    setErrorType,
    issue,
    setIssue,
    status,
    setStatus,
    batch,
    setBatch,
    needReview,
    setNeedReview,
    loading,
    batchLoading,
    actionLoading,
    error,
    notice,
    search,
    clearFilter,
    reload,
    goPrevious,
    goNext,
    classifyRecord,
    confirmRecord,
    bulkClassifyMatching,
  };
}
