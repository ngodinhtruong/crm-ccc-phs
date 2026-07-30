"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Wrench,
} from "lucide-react";

import { SlaFilter } from "@/components/sla/SlaFilter";
import { SlaTable } from "@/components/sla/SlaTable";
import { useSlaPolicies } from "@/hooks/useSlaPolicies";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function SlaListPage() {
  const sla = useSlaPolicies();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "Danh mục SLA",
        },
      ]}
      contentClassName="pl-10"
      rightAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sla.goCreate}
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669]"
          >
            <Plus size={15} />
            Thêm SLA
          </button>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded border border-emerald-300 bg-white px-3 text-xs font-semibold text-[#059669] hover:bg-emerald-50"
          >
            <Download size={15} />
            Nhập dữ liệu
          </button>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-emerald-300 bg-white text-[#059669] hover:bg-emerald-50"
          >
            <Wrench size={15} />
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between border-b bg-white px-4">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Danh sách SLA
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý thời gian xử lý tiêu chuẩn theo danh mục ticket và đơn vị xử lý.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span>
              {sla.fromRecord} đến {sla.toRecord} của {sla.count}
            </span>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500 hover:bg-slate-50"
            >
              ...
            </button>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex h-12 items-center justify-center border-b bg-white px-4">
          <div className="inline-flex overflow-hidden rounded border border-emerald-300 text-xs font-semibold">
            <button
              type="button"
              onClick={() => sla.changeTab("active")}
              className={`h-8 px-5 ${
                sla.activeTab === "active"
                  ? "bg-[#10b981] text-white"
                  : "bg-white text-[#059669] hover:bg-emerald-50"
              }`}
            >
              SLA đang hoạt động
            </button>

            <button
              type="button"
              onClick={() => sla.changeTab("inactive")}
              className={`h-8 border-l border-emerald-300 px-5 ${
                sla.activeTab === "inactive"
                  ? "bg-[#10b981] text-white"
                  : "bg-white text-[#059669] hover:bg-emerald-50"
              }`}
            >
              SLA ngừng hoạt động
            </button>
          </div>
        </div>

        <SlaFilter
          q={sla.q}
          ticketCategory={sla.ticketCategory}
          processingUnit={sla.processingUnit}
          onQChange={sla.setQ}
          onTicketCategoryChange={sla.setTicketCategory}
          onProcessingUnitChange={sla.setProcessingUnit}
          onSearch={sla.search}
          onClear={sla.clearFilter}
        />

        <SlaTable
          items={sla.items}
          loading={sla.loading}
          error={sla.error}
        />
      </div>
    </DashboardLayout>
  );
}