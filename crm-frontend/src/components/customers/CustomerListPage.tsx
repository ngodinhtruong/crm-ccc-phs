"use client";

import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";

import { CustomerTable } from "@/components/customers/CustomerTable";
import { TablePagination } from "@/components/common";
import { useCustomers } from "@/hooks/useCustomers";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export function CustomerListPage() {
  const customers = useCustomers();

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: "TRANG CHỦ",
          href: "/",
        },
        {
          label: "Khách hàng",
          href: "/customers",
        },
        {
          label: "Customers",
        },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <Link
            href="/customers/create"
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#059669]"
          >
            <Plus size={15} />
            Thêm khách hàng
          </Link>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded border border-emerald-300 bg-white px-3 text-xs font-semibold text-[#059669] hover:bg-emerald-50"
          >
            <Upload size={15} />
            Nhập dữ liệu
          </button>

          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded border border-emerald-300 bg-white px-3 text-xs font-semibold text-[#059669] hover:bg-emerald-50"
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
              Danh sách khách hàng
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý thông tin khách hàng, tài khoản, chi nhánh và trạng thái.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TablePagination
              fromRecord={customers.fromRecord}
              toRecord={customers.toRecord}
              count={customers.count}
              page={customers.page}
              totalPages={customers.totalPages}
              loading={customers.loading}
              onPrevious={customers.previousPage}
              onNext={customers.nextPage}
            />

            <button
              type="button"
              onClick={customers.clearFilter}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        {customers.masterError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {customers.masterError}
          </div>
        )}

        <CustomerTable customerState={customers} />
      </div>
    </DashboardLayout>
  );
}