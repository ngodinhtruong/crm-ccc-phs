import { Eye, MoreVertical, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
  TableState,
} from "@/components/common";
import {
  CustomerStatusBadge,
  CustomerVipBadge,
} from "@/components/customers/CustomerBadges";
import { isLinkedCustomer, maskEmail, maskPhone } from "@/utils/mask-data.util";
import type { useCustomers } from "@/hooks/useCustomers";

function getBranchName(branch: ReturnType<typeof useCustomers>["branches"][number]) {
  return branch.branch_name || branch.name || `Chi nhánh ${branch.id}`;
}

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

  return (
    <div className="table-scroll-container">
      <table className="data-table w-full min-w-[2315px] border-collapse text-left text-sm">
        <thead>
          <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
            <th className="sticky left-0 z-20 w-[90px] min-w-[90px] bg-slate-50 px-4 font-semibold">
              Thao tác
            </th>
            <th className="w-[170px] min-w-[170px] px-4 font-semibold">Ngày mở tài khoản</th>
            <th className="w-[180px] min-w-[180px] px-4 font-semibold">Họ và tên</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Di động</th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Số tài khoản</th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Công ty</th>
            <th className="w-[230px] min-w-[230px] px-4 font-semibold">Email</th>
            <th className="w-[145px] min-w-[145px] px-4 font-semibold">Phân loại VIP</th>
            <th className="w-[150px] min-w-[150px] px-4 font-semibold">Giao cho</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Nguồn</th>
            <th className="w-[170px] min-w-[170px] px-4 font-semibold">Ngày sinh</th>
            <th className="w-[180px] min-w-[180px] px-4 font-semibold">Mô tả</th>
            <th className="w-[120px] min-w-[120px] px-4 font-semibold">Theo dõi</th>
            <th className="w-[130px] min-w-[130px] px-4 font-semibold">Tình trạng</th>
            <th className="w-[150px] min-w-[150px] px-4 font-semibold">Chi nhánh</th>
          </tr>

          <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
            <th className="sticky left-0 z-20 bg-slate-50/70 px-3 py-2.5" />

            <th className="px-3 py-2.5">
              <ColumnDateRangeFilter
                fromValue={customerState.openedAccountFrom}
                toValue={customerState.openedAccountTo}
                onFromChange={customerState.setOpenedAccountFrom}
                onToChange={customerState.setOpenedAccountTo}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.fullName}
                onChange={customerState.setFullName}
                placeholder="Tên KH"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.phone}
                onChange={customerState.setPhone}
                placeholder="Di động"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.accountNumber}
                onChange={customerState.setAccountNumber}
                placeholder="Số TK"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.companyName}
                onChange={customerState.setCompanyName}
                placeholder="Công ty"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.email}
                onChange={customerState.setEmail}
                placeholder="Email"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={customerState.membershipTier}
                onChange={customerState.setMembershipTier}
                options={customerState.membershipTiers.map((item) => ({
                  label: item.tier_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.assignedEmployeeName}
                onChange={customerState.setAssignedEmployeeName}
                placeholder="Giao cho"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={customerState.source}
                onChange={customerState.setSource}
                options={customerState.sources.map((item) => ({
                  label: item.source_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnDateRangeFilter
                fromValue={customerState.dateOfBirthFrom}
                toValue={customerState.dateOfBirthTo}
                onFromChange={customerState.setDateOfBirthFrom}
                onToChange={customerState.setDateOfBirthTo}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={customerState.description}
                onChange={customerState.setDescription}
                placeholder="Mô tả"
              />
            </th>

            <th className="px-3 py-2.5" />

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={customerState.status}
                onChange={customerState.setStatus}
                options={[
                  {
                    label: "Chính thức",
                    value: "ACTIVE",
                  },
                  {
                    label: "Ngừng hoạt động",
                    value: "INACTIVE",
                  },
                  {
                    label: "Tiềm năng",
                    value: "POTENTIAL",
                  },
                ]}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={customerState.branch}
                onChange={customerState.setBranch}
                options={customerState.branches.map((item) => ({
                  label: getBranchName(item),
                  value: String(item.id),
                }))}
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
            colSpan={15}
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

                  <td className="align-middle whitespace-nowrap px-4 text-slate-600">
                    {customer.opened_account_date || "-"}
                  </td>

                  <td className="align-middle px-4">
                    <span className="block truncate font-semibold text-[#059669]">
                      {customer.full_name || "-"}
                    </span>
                  </td>

                  <td className="align-middle px-4">
                    {(() => {
                      const phoneVal = maskPhone(customer.phone, isLinkedCustomer(customer.account_number));
                      return (
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-slate-700">
                          <span>{phoneVal}</span>
                          {phoneVal !== "-" && <Phone size={14} className="shrink-0 text-emerald-500" />}
                        </div>
                      );
                    })()}
                  </td>

                  <td className="align-middle whitespace-nowrap px-4 text-slate-600">
                    <span className="block truncate">
                      {customer.account_number || "-"}
                    </span>
                  </td>

                  <td className="align-middle px-4 text-slate-700">
                    <span className="block truncate">
                      {customer.company_name || "-"}
                    </span>
                  </td>

                  <td className="align-middle px-4">
                    <span className="block truncate text-[#059669]">
                      {maskEmail(customer.email, isLinkedCustomer(customer.account_number)) || "-"}
                    </span>
                  </td>

                  <td className="align-middle whitespace-nowrap px-4">
                    <CustomerVipBadge value={customer.vip_type} />
                  </td>

                  <td className="align-middle px-4 text-slate-700">
                    <span className="block truncate">
                      {customer.assigned_employee_name || "-"}
                    </span>
                  </td>

                  <td className="align-middle whitespace-nowrap px-4 text-slate-600">
                    {customer.source_name || "-"}
                  </td>

                  <td className="align-middle whitespace-nowrap px-4 text-slate-600">
                    {customer.birth_date_display || "-"}
                  </td>

                  <td className="align-middle px-4 text-slate-500">
                    <span className="block max-w-[180px] truncate">
                      {customer.description_display || "-"}
                    </span>
                  </td>

                  <td className="align-middle px-4">
                    <span className="inline-flex h-7 min-w-16 items-center justify-center whitespace-nowrap rounded-md bg-emerald-100 px-2.5 text-xs font-semibold text-emerald-700">
                      -
                    </span>
                  </td>

                  <td className="align-middle whitespace-nowrap px-4">
                    <CustomerStatusBadge
                      value={customer.status_label || customer.status}
                    />
                  </td>

                  <td className="align-middle px-4">
                    <span className="block truncate font-medium text-slate-700">
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