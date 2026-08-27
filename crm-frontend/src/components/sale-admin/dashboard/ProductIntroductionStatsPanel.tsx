"use client";

import React, { useState } from "react";
import { Package, Users, Award, Building2, User, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export type ProductStatItem = {
  product_name: string;
  product_id: number | null;
  count: number;
  unique_customers: number;
  top_branch: string;
  top_sa: string;
  branch_breakdown?: Array<{ branch_name: string; count: number }>;
  sa_breakdown?: Array<{ sa_name: string; count: number }>;
};

export type ProductIntroductionStatsData = {
  total_introduced_records: number;
  total_unique_customers: number;
  top_products: ProductStatItem[];
};

export function ProductIntroductionStatsPanel({
  data,
}: {
  data?: ProductIntroductionStatsData | null;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!data || !data.top_products || data.top_products.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
            <Package size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Thống kê Giới thiệu Sản phẩm
            </h3>
            <p className="text-xs text-slate-500">Ghi nhận sản phẩm dịch vụ giới thiệu tới khách hàng</p>
          </div>
        </div>
        <div className="py-8 text-center text-xs text-slate-500">
          Chưa có dữ liệu giới thiệu sản phẩm trong kỳ này.
        </div>
      </div>
    );
  }

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#059669]">
            <Package size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              Thống kê Top Sản phẩm Giới thiệu
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
                <Sparkles size={12} /> Cập nhật theo kỳ
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Thống kê các sản phẩm được giới thiệu nhiều nhất kèm theo Chi nhánh & SA xuất sắc
            </p>
          </div>
        </div>

        {/* Quick Summary Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
            <Package size={15} className="text-[#059669]" />
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Tổng lượt giới thiệu</p>
              <p className="text-xs font-bold text-slate-800">{data.total_introduced_records}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 border border-emerald-100">
            <Users size={15} className="text-[#059669]" />
            <div>
              <p className="text-[10px] text-emerald-700 font-medium">KH tiếp cận SP</p>
              <p className="text-xs font-bold text-[#059669]">{data.total_unique_customers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products Cards List */}
      <div className="grid grid-cols-1 gap-3">
        {data.top_products.map((prod, idx) => {
          const isExpanded = expandedIndex === idx;
          const rankColor =
            idx === 0
              ? "bg-amber-500 text-white"
              : idx === 1
              ? "bg-slate-400 text-white"
              : idx === 2
              ? "bg-amber-700 text-white"
              : "bg-slate-200 text-slate-700";

          return (
            <div
              key={idx}
              className={`rounded-lg border transition-all ${
                isExpanded ? "border-emerald-300 bg-emerald-50/20 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                onClick={() => toggleExpand(idx)}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankColor}`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate text-xs font-bold text-slate-900">
                      {prod.product_name}
                    </h4>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Building2 size={12} className="text-slate-400" />
                        Top CN: <strong className="text-slate-700">{prod.top_branch}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <User size={12} className="text-slate-400" />
                        Top SA: <strong className="text-slate-700">{prod.top_sa}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#059669]">
                      {prod.count} <span className="text-[10px] font-normal text-slate-500">lượt</span>
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {prod.unique_customers} KH duy nhất
                    </p>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 grid grid-cols-12 gap-4">
                  {/* Branch Breakdown */}
                  <div className="col-span-12 md:col-span-6">
                    <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Building2 size={13} className="text-[#059669]" /> Chi nhánh giới thiệu nhiều nhất
                    </h5>
                    <div className="space-y-1.5">
                      {(prod.branch_breakdown || []).map((b, bIdx) => (
                        <div
                          key={bIdx}
                          className="flex items-center justify-between rounded bg-white px-2.5 py-1 text-xs border border-slate-100"
                        >
                          <span className="text-slate-700 font-medium">{b.branch_name}</span>
                          <span className="font-bold text-[#059669]">{b.count} lượt</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SA Breakdown */}
                  <div className="col-span-12 md:col-span-6">
                    <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Award size={13} className="text-[#059669]" /> SA giới thiệu nhiều nhất
                    </h5>
                    <div className="space-y-1.5">
                      {(prod.sa_breakdown || []).map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between rounded bg-white px-2.5 py-1 text-xs border border-slate-100"
                        >
                          <span className="text-slate-700 font-medium">{s.sa_name}</span>
                          <span className="font-bold text-[#059669]">{s.count} lượt</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
