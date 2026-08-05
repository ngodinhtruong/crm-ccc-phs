"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { externalErrorService } from "@/services/external-error.service";
import {
  ExternalErrorBatch,
  ExternalErrorCauseGroup,
  ExternalErrorCode,
  ExternalErrorGroup,
  ExternalErrorListParams,
  ExternalErrorRecord,
} from "@/types/external-error.type";
import { getYearToCurrentDateRange } from "@/utils/date.util";
import { getErrorMessage } from "@/utils/error.util";

const PAGE_SIZE = 20;

export function useExternalErrors() {
  const [records, setRecords] = useState<ExternalErrorRecord[]>([]);
  const [batches, setBatches] = useState<ExternalErrorBatch[]>([]);
  const [groups, setGroups] = useState<ExternalErrorGroup[]>([]);
  const [errorCodes, setErrorCodes] = useState<ExternalErrorCode[]>([]);
  const [causeGroups, setCauseGroups] = useState<ExternalErrorCauseGroup[]>([]);

  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const [dateField, setDateFieldState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("ext_err_list_dateField") || "received_date";
    }
    return "received_date";
  });
  const [dateFrom, setDateFromState] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("ext_err_list_dateFrom");
      if (saved) return saved;
    }
    return getYearToCurrentDateRange().dateFrom;
  });
  const [dateTo, setDateToState] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("ext_err_list_dateTo");
      if (saved) return saved;
    }
    return getYearToCurrentDateRange().dateTo;
  });

  const setDateField = (value: string) => {
    setDateFieldState(value);
    if (typeof window !== "undefined") sessionStorage.setItem("ext_err_list_dateField", value);
  };

  const setDateFrom = (value: string) => {
    setDateFromState(value);
    if (typeof window !== "undefined") sessionStorage.setItem("ext_err_list_dateFrom", value);
  };

  const setDateTo = (value: string) => {
    setDateToState(value);
    if (typeof window !== "undefined") sessionStorage.setItem("ext_err_list_dateTo", value);
  };
  const [source, setSource] = useState("");
  const [device, setDevice] = useState("");
  const [errorGroup, setErrorGroup] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [issue, setIssue] = useState("");
  const [status, setStatus] = useState("");
  const [batch, setBatch] = useState("");
  const [needReview, setNeedReview] = useState("");
  const [causeText, setCauseText] = useState("");
  const [causeGroup, setCauseGroup] = useState("");
  const [causeStatus, setCauseStatus] = useState("");
  const [causeNeedReview, setCauseNeedReview] = useState("");

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const debouncedTextFilters = useDebounce(
    useMemo(
      () => ({ q, issue, causeText }),
      [causeText, issue, q]
    ),
    500
  );

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const fromRecord = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toRecord = Math.min(page * PAGE_SIZE, count);

  const availableErrorCodes = useMemo(
    () =>
      errorCodes.filter(
        (item) =>
          !errorGroup || String(item.group) === errorGroup
      ),
    [errorCodes, errorGroup]
  );

  const buildParams = useCallback(
    (pageValue: number): ExternalErrorListParams => ({
      page: String(pageValue),
      page_size: String(PAGE_SIZE),
      q: debouncedTextFilters.q,
      issue: debouncedTextFilters.issue,
      date_field: dateField,
      date_from: dateFrom,
      date_to: dateTo,
      source,
      device,
      error_group_code:
        groups.find((item) => String(item.id) === errorGroup)
          ?.group_code || "",
      error_code:
        errorCodes.find((item) => String(item.id) === errorCode)
          ?.error_code || "",
      status,
      batch,
      need_review: needReview,
      cause_text: debouncedTextFilters.causeText,
      cause_group_code:
        causeGroups.find((item) => String(item.id) === causeGroup)
          ?.cause_code || "",
      cause_status: causeStatus,
      cause_need_review: causeNeedReview,
    }),
    [
      batch,
      causeGroup,
      causeGroups,
      causeNeedReview,
      causeStatus,
      dateField,
      dateFrom,
      dateTo,
      debouncedTextFilters.causeText,
      debouncedTextFilters.issue,
      debouncedTextFilters.q,
      device,
      errorCode,
      errorCodes,
      errorGroup,
      groups,
      needReview,
      source,
      status,
    ]
  );

  const loadRecords = useCallback(
    async (pageValue: number) => {
      try {
        setLoading(true);
        setError("");

        const response = await externalErrorService.getRecords(
          buildParams(pageValue)
        );

        setRecords(response.results || []);
        setCount(response.count || 0);
      } catch (err) {
        setError(getErrorMessage(err, "Không tải được danh sách lỗi"));
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  const loadCatalogs = useCallback(async () => {
    try {
      setCatalogLoading(true);

      const [batchData, groupData, codeData, causeGroupData] =
        await Promise.all([
          externalErrorService.getBatches(),
          externalErrorService.getGroups(),
          externalErrorService.getErrorCodes(),
          externalErrorService.getCauseGroups({ is_active: true }),
        ]);

      setBatches(batchData);
      setGroups(groupData);
      setErrorCodes(codeData);
      setCauseGroups(causeGroupData);
    } catch {
      setBatches([]);
      setGroups([]);
      setErrorCodes([]);
      setCauseGroups([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const search = () => {
    setPage(1);
    void loadRecords(1);
  };

  const clearFilter = () => {
    const currentYearRange = getYearToCurrentDateRange();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ext_err_list_dateField");
      sessionStorage.removeItem("ext_err_list_dateFrom");
      sessionStorage.removeItem("ext_err_list_dateTo");
    }

    setQ("");
    setDateField("received_date");
    setDateFrom(currentYearRange.dateFrom);
    setDateTo(currentYearRange.dateTo);
    setSource("");
    setDevice("");
    setErrorGroup("");
    setErrorCode("");
    setIssue("");
    setStatus("");
    setBatch("");
    setNeedReview("");
    setCauseText("");
    setCauseGroup("");
    setCauseStatus("");
    setCauseNeedReview("");
    setPage(1);
  };

  const reload = () => {
    void loadRecords(page);
    void loadCatalogs();
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
      await externalErrorService.classifyCauseRecord(id, force);
      setNotice("Đã phân loại lại lỗi và nguyên nhân.");
      await loadRecords(page);
    } catch (err) {
      setError(getErrorMessage(err, "Phân loại lỗi thất bại"));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRecord = async (
    id: number,
    errorCodeId: number
  ) => {
    try {
      setActionLoading(true);
      setNotice("");
      setError("");

      await externalErrorService.confirmRecord(id, errorCodeId);
      setNotice("Đã xác nhận mã lỗi.");
      await loadRecords(page);
    } catch (err) {
      setError(getErrorMessage(err, "Xác nhận mã lỗi thất bại"));
    } finally {
      setActionLoading(false);
    }
  };

  const bulkClassifyMatching = async (force = false) => {
    try {
      setActionLoading(true);
      setNotice("");
      setError("");

      const res = await externalErrorService.bulkClassify({
        all_matching: true,
        force,
      });

      setNotice(
        res.detail || `Đã đẩy tác vụ Phân loại tất cả các dòng vào hàng chờ Celery.`
      );
      await loadRecords(page);
    } catch (err) {
      setError(
        getErrorMessage(err, "Phân loại hàng loạt thất bại")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const bulkClassifySelected = async (ids: number[], force = false) => {
    if (ids.length === 0) return;
    try {
      setActionLoading(true);
      setNotice("");
      setError("");

      const res = await externalErrorService.bulkClassify({
        ids,
        force,
      });

      setNotice(
        res.detail || `Đã đẩy tác vụ Phân loại ${ids.length} dòng được chọn vào hàng chờ Celery.`
      );
      await loadRecords(page);
    } catch (err) {
      setError(
        getErrorMessage(err, "Phân loại các dòng đã chọn thất bại")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const classifyBatch = async (batchId: number) => {
    try {
      setActionLoading(true);
      setNotice("");
      setError("");

      const result = await externalErrorService.classifyBatch(batchId);
      setNotice(result.detail || `Đã đẩy tác vụ Phân loại Batch #${batchId} vào hàng chờ Celery.`);
      await loadRecords(page);
      await loadCatalogs();
    } catch (err) {
      setError(getErrorMessage(err, "Đẩy tác vụ phân loại qua Celery thất bại"));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    setPage(1);
    void loadRecords(1);
  }, [loadRecords]);

  useEffect(() => {
    if (
      errorCode &&
      !availableErrorCodes.some(
        (item) => String(item.id) === errorCode
      )
    ) {
      setErrorCode("");
    }
  }, [availableErrorCodes, errorCode]);

  return {
    records,
    batches,
    groups,
    errorCodes,
    causeGroups,
    availableErrorCodes,
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
    errorGroup,
    setErrorGroup,
    errorCode,
    setErrorCode,
    issue,
    setIssue,
    status,
    setStatus,
    batch,
    setBatch,
    needReview,
    setNeedReview,
    causeText,
    setCauseText,
    causeGroup,
    setCauseGroup,
    causeStatus,
    setCauseStatus,
    causeNeedReview,
    setCauseNeedReview,

    loading,
    catalogLoading,
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
    bulkClassifySelected,
    classifyBatch,
  };
}
