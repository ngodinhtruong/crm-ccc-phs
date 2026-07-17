"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { externalErrorService } from "@/services/external-error.service";
import {
  ExternalErrorChartResponse,
  ExternalErrorListParams,
  ExternalErrorRecurringIssue,
  ExternalErrorSummary,
  ExternalErrorWidget,
} from "@/types/external-error.type";

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as { response?: { status?: number; data?: unknown }; message?: string };
  const detail = error?.response?.data ? JSON.stringify(error.response.data) : error?.message;
  return `${fallback}. Status: ${error?.response?.status || "unknown"} - ${detail || "Không rõ lỗi"}`;
}

export type ExternalErrorDashboardCharts = {
  byDevice?: ExternalErrorChartResponse;
  bySource?: ExternalErrorChartResponse;
  byErrorType?: ExternalErrorChartResponse;
  trend?: ExternalErrorChartResponse;
  stackedMonthDevice?: ExternalErrorChartResponse;
  causeDonut?: ExternalErrorChartResponse;
  stackedDeviceErrorType?: ExternalErrorChartResponse;
};

export function useExternalErrorDashboard() {
  const [dateField, setDateField] = useState("received_date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [source, setSource] = useState("");
  const [device, setDevice] = useState("");
  const [errorType, setErrorType] = useState("");
  const [status, setStatus] = useState("");
  const [needReview, setNeedReview] = useState("");
  const [q, setQ] = useState("");

  const [summary, setSummary] = useState<ExternalErrorSummary | null>(null);
  const [charts, setCharts] = useState<ExternalErrorDashboardCharts>({});
  const [recurringIssues, setRecurringIssues] = useState<ExternalErrorRecurringIssue[]>([]);
  const [widgets, setWidgets] = useState<ExternalErrorWidget[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo<ExternalErrorListParams>(
    () => ({
      date_field: dateField,
      date_from: dateFrom,
      date_to: dateTo,
      source,
      device,
      error_type: errorType,
      status,
      need_review: needReview,
      q,
    }),
    [dateField, dateFrom, dateTo, device, errorType, needReview, q, source, status]
  );

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        summaryData,
        byDevice,
        bySource,
        byErrorType,
        trend,
        stackedMonthDevice,
        causeDonut,
        stackedDeviceErrorType,
        recurring,
        widgetData,
      ] = await Promise.all([
        externalErrorService.getSummary(params),
        externalErrorService.getChart({ ...params, chart_type: "BAR", group_by: "device", limit: 10 }),
        externalErrorService.getChart({ ...params, chart_type: "DONUT", group_by: "source", limit: 8 }),
        externalErrorService.getChart({ ...params, chart_type: "BAR", group_by: "error_type", limit: 10 }),
        externalErrorService.getChart({ ...params, chart_type: "LINE", interval: "month" }),
        externalErrorService.getChart({ ...params, chart_type: "STACKED_BAR", group_by: "month", breakdown_by: "device" }),
        externalErrorService.getChart({ ...params, chart_type: "DONUT", group_by: "cause", limit: 8 }),
        externalErrorService.getChart({ ...params, chart_type: "STACKED_HORIZONTAL_BAR", group_by: "device", breakdown_by: "error_type" }),
        externalErrorService.getRecurring({ ...params, min_count: "2", limit: "10" }),
        externalErrorService.getWidgets(),
      ]);

      setSummary(summaryData);
      setCharts({
        byDevice,
        bySource,
        byErrorType,
        trend,
        stackedMonthDevice,
        causeDonut,
        stackedDeviceErrorType,
      });
      setRecurringIssues(recurring.data || []);
      setWidgets(widgetData || []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được Dashboard lỗi"));
    } finally {
      setLoading(false);
    }
  }, [params]);

  const clearFilter = () => {
    setDateField("received_date");
    setDateFrom("");
    setDateTo("");
    setSource("");
    setDevice("");
    setErrorType("");
    setStatus("");
    setNeedReview("");
    setQ("");
  };

  const sourceOptions = useMemo(
    () => (summary?.by_source || []).map((item) => ({ label: item.label, value: item.label })),
    [summary]
  );

  const deviceOptions = useMemo(
    () => (summary?.by_device || []).map((item) => ({ label: item.label, value: item.label })),
    [summary]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return {
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
    status,
    setStatus,
    needReview,
    setNeedReview,
    q,
    setQ,
    params,
    summary,
    charts,
    recurringIssues,
    widgets,
    sourceOptions,
    deviceOptions,
    loading,
    error,
    reload: loadDashboard,
    clearFilter,
  };
}
