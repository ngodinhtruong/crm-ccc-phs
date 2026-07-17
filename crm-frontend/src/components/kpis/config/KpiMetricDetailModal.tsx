"use client";

import { X } from "lucide-react";

import { KpiPeriodMetricItem } from "@/types/kpi.type";

function EmptyText({ children }: { children?: string | null }) {
  if (!children) {
    return <span className="text-slate-400">Chưa có dữ liệu</span>;
  }

  return <span className="whitespace-pre-line">{children}</span>;
}


function getFrequencyLabel(value?: string | null) {
  if (value === "DAILY") return "Ngày";
  if (value === "WEEKLY") return "Tuần";
  if (value === "MONTHLY") return "Tháng";
  if (value === "QUARTERLY") return "Quý (3 tháng)";
  if (value === "HALF_YEARLY") return "6 tháng";
  if (value === "YEARLY") return "Năm";
  if (value === "ON_EVENT") return "Khi phát sinh";

  return value || "-";
}

function getTargetUnitLabel(value?: string | null) {
  if (value === "COUNT") return "Số lượng";
  if (value === "PERCENT") return "%";

  return value || "-";
}

function formatTargetValue(value?: string | null, unit?: string | null) {
  if (!value) return null;
  if (unit === "PERCENT") return `${value}%`;
  if (unit === "COUNT") return `${value} ${getTargetUnitLabel(unit)}`;

  return value;
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="text-sm leading-6 text-slate-700">{children}</div>
    </div>
  );
}

export function KpiMetricDetailModal({
  metric,
  onClose,
}: {
  metric: KpiPeriodMetricItem | null;
  onClose: () => void;
}) {
  if (!metric) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b bg-white px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase text-sky-600">
              {metric.metric_code} · {metric.group_code || metric.group}
            </div>
            <h2 className="mt-1 text-base font-semibold text-slate-800">
              {metric.metric_name}
            </h2>
            <div className="mt-1 text-xs text-slate-500">
              Trọng số: {metric.weight_percent}% · Tần suất: {getFrequencyLabel(metric.frequency)}
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

        <div className="max-h-[calc(88vh-86px)] space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4">
              <InfoBlock label="Chỉ tiêu số">
                <EmptyText>
                  {formatTargetValue(metric.target_value, metric.target_unit)}
                </EmptyText>
              </InfoBlock>
            </div>

            <div className="col-span-12 md:col-span-4">
              <InfoBlock label="Mục tiêu nghiệp vụ">
                <EmptyText>{metric.target_text}</EmptyText>
              </InfoBlock>
            </div>

            <div className="col-span-12 md:col-span-4">
              <InfoBlock label="Trạng thái">
                <span className="font-semibold">
                  {metric.is_active ? "Đang active" : "Đang tắt"}
                </span>
              </InfoBlock>
            </div>
          </div>

          {/* <InfoBlock label="Mô tả công việc">
            <EmptyText>{metric.work_description}</EmptyText>
          </InfoBlock> */}

          <InfoBlock label="Công thức / cách đo lường CRM">
            <EmptyText>{metric.measurement_formula}</EmptyText>
          </InfoBlock>
        </div>
      </div>
    </div>
  );
}
