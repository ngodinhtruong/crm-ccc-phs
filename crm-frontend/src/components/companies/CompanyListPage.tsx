"use client";

import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";

import { CompanyTable } from "@/components/companies/CompanyTable";
import { TablePagination } from "@/components/common";
import { useCompanies } from "@/hooks/useCompanies";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function CompanyListPage() {
  const companies = useCompanies();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "Khách hàng",
        },
        {
          label: "Công ty",
        },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <Link
            href="/companies/create"
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd]"
          >
            <Plus size={15} />
            Thêm công ty
          </Link>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50"
          >
            <Upload size={15} />
            Nhập dữ liệu
          </button>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50"
          >
            <Download size={15} />
            Xuất dữ liệu
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between border-b bg-white px-4">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Danh sách công ty
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý thông tin công ty, người liên hệ chính, tài khoản và trạng thái.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TablePagination
              fromRecord={companies.fromRecord}
              toRecord={companies.toRecord}
              count={companies.count}
              page={companies.page}
              totalPages={companies.totalPages}
              loading={companies.loading}
              onPrevious={companies.previousPage}
              onNext={companies.nextPage}
            />

            <button
              type="button"
              onClick={companies.clearFilter}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        {companies.masterError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {companies.masterError}
          </div>
        )}

        <CompanyTable companyState={companies} />
      </div>
    </DashboardLayout>
  );
}