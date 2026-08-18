import { Eye, MoreVertical, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

import { ColumnTextFilter, TableState } from "@/components/common";
import { isLinkedCustomer, maskEmail, maskPhone } from "@/utils/mask-data.util";
import type { useCustomers } from "@/hooks/useCustomers";

export function CustomerTable({
  customerState,
  onRowClick,
}: {
  customerState: ReturnType<typeof useCustomers>;
  /**
   * Thay hành vi mặc định khi bấm một dòng.
   *
   * Màn Customer 360 mở số liệu ngay tại chỗ; bỏ trống thì vẫn điều hướng
   * sang /customers/{id} như cũ.
   */
  onRowClick?: (id: number) => void;
}) {
  const router = useRouter();
  const customers = customerState.customers;

  const openDetail = (id: number) =>
    onRowClick ? onRowClick(id) : router.push(`/customers/${id}`);

  const getAccountOrContactDisplay = (customer: (typeof customers)[number]) => {
    if (
      customer.account_number &&
      customer.account_number.trim() !== "" &&
      customer.account_number.trim() !== "-"
    ) {
      return (
        <span className="font-semibold text-slate-800">
          {customer.account_number}
        </span>
      );
    }

    // Nếu không có số tài khoản, hiện sdt hoặc email
    const isLinked = isLinkedCustomer(customer.account_number);
    const phoneVal = maskPhone(customer.phone, isLinked);
    if (phoneVal && phoneVal !== "-") {
      return (
        <div className="flex items-center gap-1.5 whitespace-nowrap text-slate-700">
          <span>{phoneVal}</span>
          <Phone size={14} className="shrink-0 text-emerald-500" />
        </div>
      );
    }

    const emailVal = maskEmail(customer.email, isLinked);
    if (emailVal && emailVal !== "-") {
      return (
        <span className="text-[#059669]">
          {emailVal}
        </span>
      );
    }

    return <span className="text-slate-400">-</span>;
  };

  return (
    <div className="table-scroll-container">
      <table className="data-table w-full border-collapse text-left text-sm">
        <thead>
          <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
            <th className="sticky left-0 z-20 w-[90px] min-w-[90px] bg-slate-50 px-4 font-semibold">
              Thao tác
            </th>
            <th className="w-[45%] px-4 font-semibold">Họ và tên</th>
            <th className="px-4 font-semibold">Số tài khoản</th>
          </tr>

          <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
            <th className="sticky left-0 z-20 bg-slate-50/70 px-3 py-2.5" />

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.fullName}
                onChange={customerState.setFullName}
                placeholder="Tìm họ và tên"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.accountNumber}
                onChange={customerState.setAccountNumber}
                placeholder="Tìm số tài khoản"
              />
            </th>
          </tr>
        </thead>

        <tbody>
          <TableState
            loading={customerState.loading}
            error={customerState.error}
            empty={
              !customerState.loading &&
              !customerState.error &&
              customers.length === 0
            }
            colSpan={3}
            emptyText="Không có dữ liệu khách hàng."
          />

          {!customerState.loading &&
            !customerState.error &&
            customers.map((customer, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";

              return (
                <tr
                  key={customer.id}
                  onClick={() => openDetail(customer.id)}
                  className={`h-[46px] cursor-pointer border-b border-slate-200 ${rowBg} transition-colors hover:bg-emerald-50`}
                >
                  <td className={`sticky left-0 z-10 align-middle px-4 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetail(customer.id);
                        }}
                        className="hover:text-[#059669]"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        title="Thêm"
                        onClick={(event) => event.stopPropagation()}
                        className="hover:text-[#059669]"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>

                  <td className="align-middle px-4">
                    <span className="block truncate font-semibold text-[#059669]">
                      {customer.full_name || "-"}
                    </span>
                  </td>

                  <td className="align-middle px-4">
                    {getAccountOrContactDisplay(customer)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}