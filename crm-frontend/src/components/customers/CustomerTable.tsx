import { Eye, MoreVertical, Phone } from "lucide-react";

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
import type { useCustomers } from "@/hooks/useCustomers";

function getBranchName(branch: ReturnType<typeof useCustomers>["branches"][number]) {
  return branch.branch_name || branch.name || `Chi nhánh ${branch.id}`;
}

export function CustomerTable({
  customerState,
}: {
  customerState: ReturnType<typeof useCustomers>;
}) {
  const customers = customerState.customers;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1700px] border-collapse text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-white text-slate-700">
            <th className="sticky left-0 z-20 w-[90px] bg-white px-3 font-semibold">
              Thao tác
            </th>
            <th className="w-[150px] px-3 font-semibold">Ngày mở tài khoản</th>
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

          <tr className="border-b bg-[#f8fafc] align-top">
            <th className="sticky left-0 z-20 bg-[#f8fafc] px-2 py-2" />

            <th className="px-2 py-2">
              <ColumnDateRangeFilter
                fromValue={customerState.openedAccountFrom}
                toValue={customerState.openedAccountTo}
                onFromChange={customerState.setOpenedAccountFrom}
                onToChange={customerState.setOpenedAccountTo}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={customerState.fullName}
                onChange={customerState.setFullName}
                placeholder="Tên KH"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={customerState.phone}
                onChange={customerState.setPhone}
                placeholder="Di động"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={customerState.accountNumber}
                onChange={customerState.setAccountNumber}
                placeholder="Số TK"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={customerState.companyName}
                onChange={customerState.setCompanyName}
                placeholder="Công ty"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={customerState.email}
                onChange={customerState.setEmail}
                placeholder="Email"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnSelectFilter
                value={customerState.membershipTier}
                onChange={customerState.setMembershipTier}
                options={customerState.membershipTiers.map((item) => ({
                  label: item.tier_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={customerState.assignedEmployeeName}
                onChange={customerState.setAssignedEmployeeName}
                placeholder="Giao cho"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnSelectFilter
                value={customerState.source}
                onChange={customerState.setSource}
                options={customerState.sources.map((item) => ({
                  label: item.source_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnDateRangeFilter
                fromValue={customerState.dateOfBirthFrom}
                toValue={customerState.dateOfBirthTo}
                onFromChange={customerState.setDateOfBirthFrom}
                onToChange={customerState.setDateOfBirthTo}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={customerState.description}
                onChange={customerState.setDescription}
                placeholder="Mô tả"
              />
            </th>

            <th className="px-2 py-2" />

            <th className="px-2 py-2">
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

            <th className="px-2 py-2">
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