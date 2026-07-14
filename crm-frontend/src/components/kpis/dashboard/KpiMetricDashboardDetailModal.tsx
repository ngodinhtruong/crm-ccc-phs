"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { kpiDashboardService } from "@/services/kpi-dashboard.service";
import {
  KpiDashboardParams,
  KpiMetricContributionResponse,
  KpiProgressMetric,
} from "@/types/kpi-dashboard.type";
import {
  formatDateTime,
  formatNumber,
  getFrequencyLabel,
  getProgressBadgeClass,
  getProgressColorClass,
  getProgressLabel,
  getUnitLabel,
} from "./KpiDashboardUtils";

type DetailTab = "overview" | "records";

function InfoCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">
        {label}
      </div>
      <div className="text-sm leading-6 text-slate-700">{children || "-"}</div>
    </div>
  );
}

function EmptyText({ children }: { children?: string | null }) {
  if (!children) return <span className="text-slate-400">Chưa có dữ liệu</span>;

  return <span className="whitespace-pre-line">{children}</span>;
}

function BoolBadge({ active, label }: { active?: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex rounded-md px-2 py-1 text-[11px] font-semibold",
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function ProgressBar({ item }: { item: KpiProgressMetric }) {
  const width = item.progressPercent === null ? 0 : Math.min(item.progressPercent, 100);

  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">Tiến độ thực tế / chỉ tiêu</span>
        <span className="font-bold text-slate-800">
          {item.progressPercent === null ? "-" : `${Math.round(item.progressPercent)}%`}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${getProgressColorClass(item.progressStatus)}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Thực tế: <b className="text-slate-700">{item.displayActual}</b>
        </span>
        <span>
          Chỉ tiêu: <b className="text-slate-700">{item.displayTarget}</b>
        </span>
        <span
          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${getProgressBadgeClass(
            item.progressStatus
          )}`}
        >
          {getProgressLabel(item.progressStatus)}
        </span>
        <span>
          Khoảng tính: <b className="text-slate-700">{item.windowLabel || "-"}</b>
        </span>
      </div>
    </div>
  );
}

function ContributionRecordsTab({
  item,
  contributionParams,
}: {
  item: KpiProgressMetric;
  contributionParams: KpiDashboardParams;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<KpiMetricContributionResponse | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!contributionParams.period || !contributionParams.profile_code) {
        setError("Thiếu kỳ KPI hoặc bộ KPI để tải record đóng góp.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await kpiDashboardService.getMetricContributions({
          ...contributionParams,
          metric: String(item.metric.id),
        });

        if (!ignore) {
          setData(response);
        }
      } catch (err) {
        const apiError = err as {
          response?: { data?: { detail?: string } | Record<string, unknown> };
          message?: string;
        };

        const detail = apiError.response?.data
          ? JSON.stringify(apiError.response.data)
          : apiError.message;

        if (!ignore) {
          setError(`Không tải được record đóng góp. ${detail || ""}`);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [contributionParams, item.metric.id]);

  const records = data?.records || [];
  const summary = data?.summary;

  if (loading) {
    return (
      <div className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Đang tải record đóng góp...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoCell label="Khoảng tính">
          {summary?.window_start_date && summary?.window_end_date
            ? `${summary.window_start_date} → ${summary.window_end_date}`
            : summary?.window_label || "-"}
        </InfoCell>
        <InfoCell label="Tổng record nguồn">
          {formatNumber(summary?.total_record_count)}
        </InfoCell>
        <InfoCell label="Record đóng góp hiển thị">
          {formatNumber(summary?.contributing_record_count)}
        </InfoCell>
      </div>

      {summary?.active_post_reactivation_account_nos?.length ? (
        <div className="rounded border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-700">
          Tài khoản tái kích hoạt có giao dịch: {summary.active_post_reactivation_account_nos.join(", ")}
        </div>
      ) : null}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex h-10 items-center justify-between border-b bg-white px-3">
          <div className="text-xs font-semibold text-slate-700">
Danh sách SA Record đóng góp vào chỉ tiêu
          </div>
          <div className="text-[11px] text-slate-500">
Chỉ hiển thị record thật sự được tính vào kết quả KPI
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] border-collapse text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-white text-slate-700">
                <th className="w-[120px] px-3 font-semibold">Ngày gọi</th>
                <th className="w-[130px] px-3 font-semibold">Mã record</th>
                <th className="w-[150px] px-3 font-semibold">Số TK</th>
                <th className="w-[220px] px-3 font-semibold">Khách hàng</th>
                <th className="w-[170px] px-3 font-semibold">Kết quả gọi</th>
                <th className="w-[170px] px-3 font-semibold">ICP</th>
                <th className="w-[90px] px-3 font-semibold">Follow</th>
                <th className="w-[230px] px-3 font-semibold">Cờ nghiệp vụ</th>
                <th className="w-[130px] px-3 font-semibold">Phí GD</th>
                <th className="w-[170px] px-3 font-semibold">Đóng góp</th>
                <th className="w-[260px] px-3 font-semibold">Ghi chú</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record, index) => {
                const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

                return (
                  <tr
                    key={record.id}
                    className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                  >
                    <td className="whitespace-nowrap px-3">
                      {formatDateTime(record.call_date)}
                    </td>
                    <td className="px-3 font-semibold text-sky-600">
                      {record.record_code || `#${record.id}`}
                    </td>
                    <td className="px-3">{record.account_no || "-"}</td>
                    <td className="px-3">
                      <div className="font-medium text-slate-700">
                        {record.customer_name_snapshot || "-"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {record.branch_name_snapshot || record.pic_name_snapshot || "-"}
                      </div>
                    </td>
                    <td className="px-3">
                      {record.call_result_name || record.call_result_code || "-"}
                    </td>
                    <td className="px-3">
                      {record.icp_group_name || record.icp_group_code || "-"}
                    </td>
                    <td className="px-3">{record.follow_no ?? "-"}</td>
                    <td className="px-3">
                      <div className="flex flex-wrap gap-1">
                        <BoolBadge active={record.reactivation} label="Tái kích hoạt" />
                        <BoolBadge active={record.referred_rm || record.handover_to_broker} label="Referral/RM" />
                        <BoolBadge active={record.introduced_product} label="SP" />
                      </div>
                    </td>
                    <td className="px-3">
                      {formatNumber(record.transaction_fee_snapshot)}
                    </td>
                    <td className="px-3">
                      <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        {record.contribution_label}
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-3">
                      {record.note || record.contribution_reason || "-"}
                    </td>
                  </tr>
                );
              })}

              {records.length === 0 && (
                <tr>
                  <td colSpan={11} className="h-24 text-center text-slate-500">
Chưa có SA Record nào thật sự đóng góp vào chỉ tiêu này trong khoảng tính.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function KpiMetricDashboardDetailModal({
  item,
  contributionParams,
  onClose,
}: {
  item: KpiProgressMetric | null;
  contributionParams: KpiDashboardParams;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    if (item) {
      setActiveTab("overview");
    }
  }, [item]);

  const tabs = useMemo(
    () => [
      { key: "overview" as const, label: "Tổng quan chỉ tiêu" },
      { key: "records" as const, label: "Record đóng góp" },
    ],
    []
  );

  if (!item) return null;

  const progressLabel =
    item.progressPercent === null ? "-" : `${Math.round(item.progressPercent)}%`;
  const updatedAt =
    item.result?.calculated_at || item.result?.scored_at || item.result?.updated_at;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase text-sky-600">
              {item.metric.metric_code} · {item.sourceType === "AUTO" ? "CRM tự động" : "Admin nhập"}
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-800">
              {item.metric.metric_name}
            </h2>
            <div className="mt-1 text-xs text-slate-500">
              Nhóm: {item.metric.group_code || item.metric.group} · Tần suất: {getFrequencyLabel(item.metric.frequency)} · Đơn vị: {getUnitLabel(item.metric.target_unit)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b bg-white px-5 pt-3">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "border-b-2 px-3 pb-3 text-xs font-semibold",
                  active
                    ? "border-[#0097cf] text-[#0097cf]"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="max-h-[calc(88vh-138px)] space-y-4 overflow-y-auto p-5">
          {activeTab === "overview" && (
            <>
              <ProgressBar item={item} />

              <div className="overflow-hidden rounded border border-slate-200">
                <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="h-10 border-b bg-white text-slate-700">
                      <th className="px-3 font-semibold">Mã KPI</th>
                      <th className="px-3 font-semibold">Tên KPI</th>
                      <th className="px-3 font-semibold">Nguồn</th>
                      <th className="px-3 font-semibold">Tần suất</th>
                      <th className="px-3 font-semibold">Đơn vị</th>
                      <th className="px-3 font-semibold">Thực tế</th>
                      <th className="px-3 font-semibold">Chỉ tiêu</th>
                      <th className="px-3 font-semibold">Tiến độ</th>
                      <th className="px-3 font-semibold">Trạng thái</th>
                      <th className="px-3 font-semibold">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-14 border-b bg-[#f8fafc]">
                      <td className="px-3 font-semibold text-sky-600">
                        {item.metric.metric_code}
                      </td>
                      <td className="px-3 font-semibold text-slate-800">
                        {item.metric.metric_name}
                      </td>
                      <td className="px-3">
                        {item.sourceType === "AUTO" ? "CRM tự động" : "Admin nhập"}
                      </td>
                      <td className="px-3">{getFrequencyLabel(item.metric.frequency)}</td>
                      <td className="px-3">{getUnitLabel(item.metric.target_unit)}</td>
                      <td className="px-3 font-semibold text-slate-800">
                        {item.displayActual}
                      </td>
                      <td className="px-3">{item.displayTarget}</td>
                      <td className="px-3 font-semibold">{progressLabel}</td>
                      <td className="px-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${getProgressBadgeClass(
                            item.progressStatus
                          )}`}
                        >
                          {getProgressLabel(item.progressStatus)}
                        </span>
                      </td>
                      <td className="px-3 text-slate-500">{formatDateTime(updatedAt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                  <InfoCell label="Khoảng tính thực tế">
                    {item.windowLabel || "-"}
                  </InfoCell>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <InfoCell label="Mẫu số / tổng nguồn">
                    {formatNumber(item.denominatorValue)}
                  </InfoCell>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <InfoCell label="Record đóng góp">
                    {formatNumber(item.contributingRecordCount)}
                  </InfoCell>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-6">
                  <InfoCell label="Mô tả công việc">
                    <EmptyText>{item.metric.work_description}</EmptyText>
                  </InfoCell>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InfoCell label="Mục tiêu nghiệp vụ">
                    <EmptyText>{item.metric.target_text}</EmptyText>
                  </InfoCell>
                </div>

                <div className="col-span-12">
                  <InfoCell label="Công thức / cách đo lường CRM">
                    <EmptyText>{item.metric.measurement_formula}</EmptyText>
                  </InfoCell>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InfoCell label="Ghi chú kết quả">
                    <EmptyText>{item.result?.note}</EmptyText>
                  </InfoCell>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InfoCell label="Người nhập / thời điểm nhập điểm">
                    <EmptyText>
                      {item.result?.scored_by_user_name ||
                        formatDateTime(item.result?.scored_at)}
                    </EmptyText>
                  </InfoCell>
                </div>
              </div>
            </>
          )}

          {activeTab === "records" && (
            <ContributionRecordsTab
              item={item}
              contributionParams={contributionParams}
            />
          )}
        </div>
      </div>
    </div>
  );
}
