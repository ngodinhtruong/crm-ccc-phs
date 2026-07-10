import { Eye, MoreVertical, Phone } from "lucide-react";

import { CustomerListItem } from "@/types/customer.type";
import {
  CustomerStatusBadge,
  CustomerVipBadge,
} from "@/components/customers/CustomerBadges";

export function CustomerTable({
  customers,
  loading,
  error,
}: {
  customers: CustomerListItem[];
  loading: boolean;
  error: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1580px] border-collapse text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-white text-slate-700">
            <th className="sticky left-0 z-10 w-[90px] bg-white px-3 font-semibold">
              Thao tác
            </th>
            <th className="w-[135px] px-3 font-semibold">Ngày mở tài khoản</th>
            <th className="w-[180px] px-3 font-semibold">Họ và tên</th>
            <th className="w-[140px] px-3 font-semibold">Di động</th>
            <th className="w-[160px] px-3 font-semibold">Số tài khoản</th>
            <th className="w-[160px] px-3 font-semibold">Công ty</th>
            <th className="w-[230px] px-3 font-semibold">Email</th>
            <th className="w-[145px] px-3 font-semibold">Phân loại VIP</th>
            <th className="w-[150px] px-3 font-semibold">Giao cho</th>
            <th className="w-[140px] px-3 font-semibold">Nguồn</th>
            <th className="w-[125px] px-3 font-semibold">Ngày sinh</th>
            <th className="w-[180px] px-3 font-semibold">Mô tả</th>
            <th className="w-[120px] px-3 font-semibold">Theo dõi</th>
            <th className="w-[130px] px-3 font-semibold">Tình trạng</th>
            <th className="w-[150px] px-3 font-semibold">Chi nhánh</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan={15} className="h-28 text-center text-slate-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          )}

          {error && (
            <tr>
              <td colSpan={15} className="h-28 px-4 text-center text-red-600">
                {error}
              </td>
            </tr>
          )}

          {!loading && !error && customers.length === 0 && (
            <tr>
              <td colSpan={15} className="h-28 text-center text-slate-500">
                Không có dữ liệu khách hàng.
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            customers.map((customer, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

              return (
                <tr
                  key={customer.id}
                  className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button type="button" title="Xem" className="hover:text-sky-600">
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        title="Thêm"
                        className="hover:text-sky-600"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-3">
                    {customer.opened_account_date || "-"}
                  </td>

                  <td className="px-3">
                    <span className="font-semibold text-sky-600">
                      {customer.full_name || "-"}
                    </span>
                  </td>

                  <td className="px-3">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <span>{customer.phone || "-"}</span>
                      {customer.phone && <Phone size={13} className="text-sky-500" />}
                    </div>
                  </td>

                  <td className="px-3">
                    <span className="line-clamp-2 break-all">
                      {customer.account_number || "-"}
                    </span>
                  </td>

                  <td className="px-3">
                    <span className="line-clamp-2">
                      {customer.company_name || "-"}
                    </span>
                  </td>

                  <td className="px-3">
                    <span className="text-sky-600">{customer.email || "-"}</span>
                  </td>

                  <td className="px-3">
                    <CustomerVipBadge value={customer.vip_type} />
                  </td>

                  <td className="px-3">
                    {customer.assigned_employee_name || "-"}
                  </td>

                  <td className="px-3">{customer.source_name || "-"}</td>

                  <td className="whitespace-nowrap px-3">
                    {customer.birth_date_display || "-"}
                  </td>

                  <td className="max-w-[180px] truncate px-3">
                    {customer.description_display || "-"}
                  </td>

                  <td className="px-3">
                    <span className="inline-flex h-6 min-w-16 items-center justify-center rounded bg-sky-100 px-2 text-xs font-semibold text-sky-700">
                      -
                    </span>
                  </td>

                  <td className="px-3">
                    <CustomerStatusBadge
                      value={customer.status_label || customer.status}
                    />
                  </td>

                  <td className="px-3">
                    <span className="font-medium text-slate-700">
                      {customer.branch_name || "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}