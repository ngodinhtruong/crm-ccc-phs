"use client";

import { ArrowUpRight, BarChart3, Ticket, Users } from "lucide-react";

import { GeneralDashboardOverview } from "@/types/dashboard.type";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
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

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value || 0)}%`;
}

export function DashboardSummaryCards({
  overview,
}: {
  overview: GeneralDashboardOverview;
}) {
  const activeCustomerRate = overview.total_customers
    ? (overview.active_customers / overview.total_customers) * 100
    : 0;

  const linkedTicketRate = overview.total_tickets
    ? ((overview.total_tickets - overview.unlinked_tickets) / overview.total_tickets) * 100
    : 0;

  const unlinkedTicketRate = overview.total_tickets
    ? (overview.unlinked_tickets / overview.total_tickets) * 100
    : 0;

  const cards = [
    {
      title: "Khách hàng",
      value: formatNumber(overview.total_customers),
      subValue: `${formatNumber(overview.active_customers)} KH có GD`,
      subText: `${formatPercent(activeCustomerRate)} tổng KH`,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      textColor: "text-blue-600 bg-blue-50",
      progress: activeCustomerRate,
    },
    {
      title: "CRM Tickets",
      value: formatNumber(overview.total_tickets),
      subValue: `${formatNumber(overview.unlinked_tickets)} unlinked`,
      subText: `${formatPercent(unlinkedTicketRate)} chưa liên kết`,
      icon: Ticket,
      color: "from-purple-500 to-pink-600",
      textColor: "text-purple-600 bg-purple-50",
      progress: linkedTicketRate,
    },
    {
      title: "Giao dịch",
      value: formatNumber(overview.total_transactions),
      subValue: "GTGD khớp",
      subText: `${formatCurrencyCompact(overview.matched_value)} VND`,
      icon: BarChart3,
      color: "from-amber-500 to-orange-600",
      textColor: "text-amber-600 bg-amber-50",
      progress: overview.total_transactions > 0 ? 100 : 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const progress = Math.min(Math.max(card.progress, 0), 100);

        return (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            {/* Background Accent Gradient */}
            <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${card.color}`} />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </p>
                <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">
                  {card.value}
                </h3>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.textColor}`}
              >
                <Icon size={20} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{card.subValue}</span>
              <span className="flex items-center gap-0.5 font-bold text-emerald-600">
                <ArrowUpRight size={14} />
                {card.subText}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${card.color} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
