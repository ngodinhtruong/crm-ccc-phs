"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Upload,
} from "lucide-react";

import { CustomerTable } from "@/components/customers/CustomerTable";
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
        },
        {
          label: "Customers",
        },
      ]}
      rightAction={
        <div className="flex items-center gap-2">
          <Link
            href="/customers/create"
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd]"
          >
            <Plus size={15} />
            Thêm khách hàng
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
              Danh sách khách hàng
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý thông tin khách hàng, tài khoản, chi nhánh và trạng thái.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span>
              {customers.fromRecord} đến {customers.toRecord} của{" "}
              <span className="font-semibold">{customers.count}</span>
            </span>

            <button
              type="button"
              onClick={customers.clearFilter}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Xóa lọc
            </button>

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