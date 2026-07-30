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
    <div className="table-scroll-container">
      <table className="data-table w-full min-w-[2465px] border-collapse text-left text-sm">
        <thead>
          <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
            <th className="sticky left-0 z-20 w-[90px] min-w-[90px] bg-slate-50 px-4 font-semibold">
              Thao tác
            </th>
            <th className="w-[220px] min-w-[220px] px-4 font-semibold">Tên công ty</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Điện thoại</th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Số tài khoản</th>
            <th className="w-[170px] min-w-[170px] px-4 font-semibold">Ngày mở TK</th>
            <th className="w-[150px] min-w-[150px] px-4 font-semibold">Mã số thuế</th>
            <th className="w-[210px] min-w-[210px] px-4 font-semibold">Email</th>
            <th className="w-[180px] min-w-[180px] px-4 font-semibold">Website</th>
            <th className="w-[180px] min-w-[180px] px-4 font-semibold">
              Người liên hệ chính
            </th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Nguồn</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Đánh giá</th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Hạng thành viên</th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Giao cho</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Tình trạng</th>
            <th className="w-[220px] min-w-[220px] px-4 font-semibold">Địa chỉ</th>
          </tr>

          <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
            <th className="sticky left-0 z-20 bg-slate-50/70 px-3 py-2.5" />

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={companyState.companyName}
                onChange={companyState.setCompanyName}
                placeholder="Tên công ty"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={companyState.phone}
                onChange={companyState.setPhone}
                placeholder="SĐT"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={companyState.accountNumber}
                onChange={companyState.setAccountNumber}
                placeholder="Số TK"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnDateRangeFilter
                fromValue={companyState.openedAtFrom}
                toValue={companyState.openedAtTo}
                onFromChange={companyState.setOpenedAtFrom}
                onToChange={companyState.setOpenedAtTo}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={companyState.taxCode}
                onChange={companyState.setTaxCode}
                placeholder="MST"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={companyState.email}
                onChange={companyState.setEmail}
                placeholder="Email"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={companyState.website}
                onChange={companyState.setWebsite}
                placeholder="Website"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnTextFilter
                value={companyState.primaryContactName}
                onChange={companyState.setPrimaryContactName}
                placeholder="Liên hệ"
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={companyState.source}
                onChange={companyState.setSource}
                options={companyState.sources.map((item) => ({
                  label: item.source_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={companyState.rating}
                onChange={companyState.setRating}
                options={companyState.ratings.map((item) => ({
                  label: item.rating_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={companyState.membershipTier}
                onChange={companyState.setMembershipTier}
                options={companyState.membershipTiers.map((item) => ({
                  label: item.tier_name,
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-3 py-2.5">
              <ColumnSelectFilter
                value={companyState.assignedEmployee}
                onChange={companyState.setAssignedEmployee}
                options={companyState.employees.map((item) => ({
                  label: getEmployeeName(item),
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-3 py-2.5">
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

            <th className="px-3 py-2.5">
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
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";

              return (
                <tr
                  key={company.id}
                  className={`h-[46px] border-b border-slate-200 ${rowBg} transition-colors hover:bg-emerald-50`}
                >
                  <td className={`sticky left-0 z-10 px-4 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Xem"
                        onClick={() => companyState.goToDetail(company.id)}
                        className="hover:text-[#059669]"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        title="Thêm"
                        className="hover:text-[#059669]"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4">
                    <Link
                      href={`/companies/${company.id}`}
                      className="block truncate font-semibold text-[#059669] hover:underline"
                    >
                      {company.company_name || "-"}
                    </Link>
                  </td>

                  <td className="px-4 text-slate-700">
                    {company.phone || "-"}
                  </td>

                  <td className="px-4 text-slate-600">
                    <span className="block truncate">
                      {company.account_number || "-"}
                    </span>
                  </td>

                  <td className="px-4 text-slate-600">
                    {company.opened_at_display || company.opened_at || "-"}
                  </td>

                  <td className="px-4 text-slate-600">{company.tax_code || "-"}</td>

                  <td className="px-4">
                    <span className="block truncate text-[#059669]">{company.email || "-"}</span>
                  </td>

                  <td className="px-4">
                    <span className="block truncate text-[#059669]">
                      {company.website || "-"}
                    </span>
                  </td>

                  <td className="px-4 text-slate-700">
                    <span className="block truncate">
                      {company.primary_contact_name || "-"}
                    </span>
                  </td>

                  <td className="px-4 text-slate-600">{company.source_name || "-"}</td>

                  <td className="px-4 text-slate-600">{company.rating_name || "-"}</td>

                  <td className="px-4 text-slate-600">
                    <span className="block truncate">
                      {company.membership_tier_name || "-"}
                    </span>
                  </td>

                  <td className="px-4 text-slate-700">
                    <span className="block truncate">
                      {company.assigned_employee_name || "-"}
                    </span>
                  </td>

                  <td className="px-4">
                    <CompanyStatusBadge
                      value={company.status_label || company.status}
                    />
                  </td>

                  <td className="px-4">
                    <span className="block max-w-[220px] truncate text-slate-500">
                      {buildAddress(company)}
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