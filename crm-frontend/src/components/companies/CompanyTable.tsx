import Link from "next/link";
import { Eye, MoreVertical } from "lucide-react";

import { CompanyStatusBadge } from "@/components/companies/CompanyBadges";
import {
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
  TableState,
} from "@/components/common";
import { CompanyListItem } from "@/types/company.type";
import type { useCompanies } from "@/hooks/useCompanies";

function buildAddress(company: CompanyListItem) {
  return (
    [company.address, company.district, company.province, company.country]
      .filter(Boolean)
      .join(", ") || "-"
  );
}

function getEmployeeName(
  employee: ReturnType<typeof useCompanies>["employees"][number]
) {
  return (
    employee.full_name ||
    employee.employee_name ||
    employee.name ||
    `Nhân viên ${employee.id}`
  );
}

export function CompanyTable({
  companyState,
}: {
  companyState: ReturnType<typeof useCompanies>;
}) {
  const companies = companyState.companies;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1700px] border-collapse text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-white text-slate-700">
            <th className="sticky left-0 z-20 w-[90px] bg-white px-3 font-semibold">
              Thao tác
            </th>
            <th className="w-[220px] px-3 font-semibold">Tên công ty</th>
            <th className="w-[140px] px-3 font-semibold">Điện thoại</th>
            <th className="w-[160px] px-3 font-semibold">Số tài khoản</th>
            <th className="w-[135px] px-3 font-semibold">Ngày mở TK</th>
            <th className="w-[150px] px-3 font-semibold">Mã số thuế</th>
            <th className="w-[210px] px-3 font-semibold">Email</th>
            <th className="w-[180px] px-3 font-semibold">Website</th>
            <th className="w-[180px] px-3 font-semibold">
              Người liên hệ chính
            </th>
            <th className="w-[140px] px-3 font-semibold">Nguồn</th>
            <th className="w-[140px] px-3 font-semibold">Đánh giá</th>
            <th className="w-[160px] px-3 font-semibold">Hạng thành viên</th>
            <th className="w-[160px] px-3 font-semibold">Giao cho</th>
            <th className="w-[140px] px-3 font-semibold">Tình trạng</th>
            <th className="w-[220px] px-3 font-semibold">Địa chỉ</th>
          </tr>

          <tr className="border-b bg-[#f8fafc] align-top">
            <th className="sticky left-0 z-20 bg-[#f8fafc] px-2 py-2" />

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.companyName}
                onChange={companyState.setCompanyName}
                placeholder="Tên công ty"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.phone}
                onChange={companyState.setPhone}
                placeholder="SĐT"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.accountNumber}
                onChange={companyState.setAccountNumber}
                placeholder="Số TK"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnDateRangeFilter
                fromValue={companyState.openedAtFrom}
                toValue={companyState.openedAtTo}
                onFromChange={companyState.setOpenedAtFrom}
                onToChange={companyState.setOpenedAtTo}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.taxCode}
                onChange={companyState.setTaxCode}
                placeholder="MST"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.email}
                onChange={companyState.setEmail}
                placeholder="Email"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.website}
                onChange={companyState.setWebsite}
                placeholder="Website"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.primaryContactName}
                onChange={companyState.setPrimaryContactName}
                placeholder="Liên hệ"
              />
            </th>

            <th className="px-2 py-2">
              <ColumnSelectFilter
                value={companyState.source}
                onChange={companyState.setSource}
                options={companyState.sources.map((item) => ({
                  label: item.source_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnSelectFilter
                value={companyState.rating}
                onChange={companyState.setRating}
                options={companyState.ratings.map((item) => ({
                  label: item.rating_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnSelectFilter
                value={companyState.membershipTier}
                onChange={companyState.setMembershipTier}
                options={companyState.membershipTiers.map((item) => ({
                  label: item.tier_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnSelectFilter
                value={companyState.assignedEmployee}
                onChange={companyState.setAssignedEmployee}
                options={companyState.employees.map((item) => ({
                  label: getEmployeeName(item),
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnSelectFilter
                value={companyState.status}
                onChange={companyState.setStatus}
                options={[
                  {
                    label: "Đang hoạt động",
                    value: "ACTIVE",
                  },
                  {
                    label: "Ngừng hoạt động",
                    value: "INACTIVE",
                  },
                ]}
              />
            </th>

            <th className="px-2 py-2">
              <ColumnTextFilter
                value={companyState.address}
                onChange={companyState.setAddress}
                placeholder="Địa chỉ"
              />
            </th>
          </tr>
        </thead>

        <tbody>
          <TableState
            loading={companyState.loading}
            error={companyState.error}
            empty={
              !companyState.loading &&
              !companyState.error &&
              companies.length === 0
            }
            colSpan={15}
            emptyText="Không có dữ liệu công ty."
          />

          {!companyState.loading &&
            !companyState.error &&
            companies.map((company, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

              return (
                <tr
                  key={company.id}
                  className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Xem"
                        onClick={() => companyState.goToDetail(company.id)}
                        className="hover:text-sky-600"
                      >
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

                  <td className="px-3">
                    <Link
                      href={`/companies/${company.id}`}
                      className="font-semibold text-sky-600 hover:underline"
                    >
                      {company.company_name || "-"}
                    </Link>
                  </td>

                  <td className="whitespace-nowrap px-3">
                    {company.phone || "-"}
                  </td>

                  <td className="px-3">
                    <span className="line-clamp-2 break-all">
                      {company.account_number || "-"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3">
                    {company.opened_at_display || company.opened_at || "-"}
                  </td>

                  <td className="px-3">{company.tax_code || "-"}</td>

                  <td className="px-3">
                    <span className="text-sky-600">{company.email || "-"}</span>
                  </td>

                  <td className="px-3">
                    <span className="text-sky-600">
                      {company.website || "-"}
                    </span>
                  </td>

                  <td className="px-3">
                    {company.primary_contact_name || "-"}
                  </td>

                  <td className="px-3">{company.source_name || "-"}</td>

                  <td className="px-3">{company.rating_name || "-"}</td>

                  <td className="px-3">
                    {company.membership_tier_name || "-"}
                  </td>

                  <td className="px-3">
                    {company.assigned_employee_name || "-"}
                  </td>

                  <td className="px-3">
                    <CompanyStatusBadge
                      value={company.status_label || company.status}
                    />
                  </td>

                  <td className="max-w-[220px] truncate px-3">
                    {buildAddress(company)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}