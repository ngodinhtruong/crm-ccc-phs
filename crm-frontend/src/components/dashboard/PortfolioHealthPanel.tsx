"use client";

import { useState } from "react";
import { HeartPulse, Info, X } from "lucide-react";

import { GeneralDashboardPortfolioHealth } from "@/types/dashboard.type";

type MetricConfig = {
  title: string;
  value: string;
  sub: string;
  formula: string;
  description: string;
  color: string;
  statusColor: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value || 0)}%`;
}

function formatCurrencyCompact(value: number) {
  if (!value) return "0";

  if (Math.abs(value) >= 1_000_000_000) {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000_000)} tỷ`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)} triệu`;
  }

  return new Intl.NumberFormat("vi-VN").format(value);
}


function getProgressWidth(value: string) {
  if (!value.endsWith("%")) return "100%";

  const numericValue = Number(value.replace("%", "").replace(",", "."));

  if (!Number.isFinite(numericValue)) return "0%";

  return `${Math.min(Math.max(numericValue, 0), 100)}%`;
}

export function PortfolioHealthPanel({
  data,
}: {
  data: GeneralDashboardPortfolioHealth;
}) {
  const [selectedMetric, setSelectedMetric] = useState<MetricConfig | null>(null);

  const metrics: MetricConfig[] = [
    {
      title: "ICP Score",
      value: formatPercent(data.icp_score),
      sub: `${formatNumber(data.grouped_customers)}/${formatNumber(
        data.total_customers_health
      )} KH được phân nhóm`,
      formula: "ICP Score = (Số KH đã phân nhóm ICP / Tổng số KH) * 100",
      description:
        "Đo lường tỷ lệ khách hàng đã được định danh nhóm khách hàng lý tưởng (ICP) để phục vụ chăm sóc cá nhân hóa.",
      color: "border-teal-100 bg-teal-50/30 hover:bg-teal-50/70 text-teal-700",
      statusColor: "bg-teal-500",
    },
    {
      title: "Avg LTV",
      value: formatCurrencyCompact(data.avg_ltv),
      sub: `Tổng phí ${formatCurrencyCompact(data.avg_ltv_fees)} / ${formatNumber(
        data.active_customers_ltv
      )} KH có GD`,
      formula: "Avg LTV = Tổng phí giao dịch / Số KH có phát sinh giao dịch",
      description:
        "Giá trị vòng đời trung bình theo phí giao dịch của một khách hàng có giao dịch trong kỳ.",
      color: "border-blue-100 bg-blue-50/30 hover:bg-blue-50/70 text-blue-700",
      statusColor: "bg-blue-500",
    },
    {
      title: "AAR (Tái KH)",
      value: formatPercent(data.aar),
      sub: `${formatNumber(data.reactivated_with_trades)}/${formatNumber(
        data.total_reactivated_records
      )} KH tái khớp`,
      formula:
        "AAR = (Số KH tái kích hoạt có giao dịch khớp lệnh / Tổng số KH tái kích hoạt) * 100",
      description:
        "Tỷ lệ tái kích hoạt thành công, phản ánh số lượng khách hàng cũ quay lại giao dịch trong kỳ.",
      color: "border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/70 text-indigo-700",
      statusColor: "bg-amber-500",
    },
    {
      title: "Churn (90ng)",
      value: formatPercent(data.churn),
      sub: `${formatNumber(data.churn_count)}/${formatNumber(
        data.total_customers_health
      )} KH chưa có GD trong kỳ`,
      formula: "Churn = (Số KH chưa phát sinh giao dịch / Tổng số KH) * 100",
      description:
        "Tỷ lệ khách hàng chưa phát sinh giao dịch trong phạm vi kỳ lọc hiện tại.",
      color: "border-rose-100 bg-rose-50/30 hover:bg-rose-50/70 text-rose-700",
      statusColor: "bg-rose-500",
    },
    {
      title: "Referral",
      value: formatPercent(data.referral),
      sub: `${formatNumber(data.referral_count)} KH giới thiệu / ${formatNumber(
        data.total_customers_health
      )} tổng KH`,
      formula: "Referral = (Số KH có nguồn giới thiệu / Tổng số KH) * 100",
      description:
        "Tỷ lệ khách hàng đến từ nguồn giới thiệu trong tập dữ liệu đang lọc.",
      color: "border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/70 text-emerald-700",
      statusColor: "bg-amber-500",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
            <HeartPulse size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Portfolio Health</h2>
            <p className="text-xs text-slate-400">
              Chỉ số sức khỏe danh mục khách hàng & vận hành lấy trực tiếp từ DB
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-400 ring-1 ring-slate-100">
          Nhấp vào thẻ để xem công thức
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedMetric(metric)}
            className={`flex cursor-pointer flex-col rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${metric.color}`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{metric.title}</span>
              <Info size={14} className="text-slate-400 group-hover:text-slate-600" />
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800">
                {metric.value}
              </span>
            </div>

            <span className="mt-2 line-clamp-2 text-[10px] font-medium text-slate-400">
              {metric.sub}
            </span>

            <div className="mt-4 h-1.5 w-full rounded-full bg-white/70">
              <div
                className={`h-full rounded-full ${metric.statusColor}`}
                style={{ width: getProgressWidth(metric.value) }}
              />
            </div>
          </button>
        ))}
      </div>

      {selectedMetric && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {selectedMetric.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Công thức và mô tả chỉ số
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMetric(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Giá trị hiện tại
                </p>
                <p className="mt-2 text-2xl font-black text-slate-800">
                  {selectedMetric.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{selectedMetric.sub}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Công thức
                </p>
                <p className="mt-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  {selectedMetric.formula}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Ý nghĩa
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedMetric.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
