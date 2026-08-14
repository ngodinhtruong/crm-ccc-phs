"use client";

import { Phone } from "lucide-react";

import type { CustomerDetail } from "@/types/customer.type";

/** Một dòng thông tin: nhãn bên trái, giá trị bên phải (giống ảnh CRM) */
function Field({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  const empty = children === null || children === undefined || children === "";

  return (
    <div className="flex gap-4 px-4 py-2.5">
      <div className="w-[150px] shrink-0 text-right text-xs text-slate-500">
        {label}
      </div>
      <div className="min-w-0 flex-1 text-xs text-slate-800">
        {empty ? <span className="text-slate-300">—</span> : children}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
        {title}
      </div>
      <div className="divide-y divide-slate-50 py-1">{children}</div>
    </div>
  );
}

/**
 * Toàn bộ thông tin hồ sơ của một khách hàng, chia theo nhóm.
 *
 * Tách khỏi ``CustomerDetailPage`` để màn Customer 360 dùng lại được cùng một
 * khối: hai nơi hiển thị cùng bộ thông tin thì phải cùng một nguồn, chép ra
 * hai bản là mỗi lần thêm trường lại quên sửa một chỗ.
 */
export function CustomerDetailFields({
  customer,
}: {
  customer: CustomerDetail;
}) {
  const isVip = (customer.vip_type || "").toUpperCase() === "VIP";

  return (
    <div className="flex flex-col gap-3">
      <Section title="Thông tin chung">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Field label="Họ và tên đệm">{customer.full_name}</Field>
          <Field label="Tên">{customer.full_name}</Field>

          <Field label="CMND/CCCD">{customer.identity_number}</Field>
          <Field label="Loại">{customer.customer_type_name}</Field>

          <Field label="Ngày sinh">
            {customer.birth_date_display || customer.date_of_birth}
          </Field>
          <Field label="Giới tính">{customer.gender}</Field>

          <Field label="Số tài khoản">{customer.account_number}</Field>
          <Field label="Chi nhánh">{customer.branch_name}</Field>

          <Field label="Di động">
            {customer.phone && (
              <span className="inline-flex items-center gap-1">
                {customer.phone}
                <Phone size={11} className="text-emerald-500" />
              </span>
            )}
          </Field>
          <Field label="Ngày mở tài khoản">{customer.opened_account_date}</Field>

          <Field label="Email">
            {customer.email && (
              <span className="text-[#059669]">{customer.email}</span>
            )}
          </Field>
          <Field label="Môi giới">{customer.assigned_employee_name}</Field>

          <Field label="Công ty">{customer.company_name}</Field>
          <Field label="Khảo sát" />

          <Field label="Phân loại VIP">
            {customer.vip_type && (
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold text-white ${
                  isVip ? "bg-amber-400" : "bg-[#10b981]"
                }`}
              >
                {customer.vip_type}
              </span>
            )}
          </Field>
          <Field label="Tình trạng">
            {customer.status_label && (
              <span className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                {customer.status_label}
              </span>
            )}
          </Field>
        </div>
      </Section>

      {/* Chưa có cột trong DB → để trống, chờ dữ liệu sau */}
      <Section title="Thông tin sử dụng app">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Field label="Tình trạng đăng nhập app" />
          <Field label="Kênh đăng nhập" />
        </div>
      </Section>

      <Section title="Thông tin địa chỉ">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Field label="Địa chỉ">{customer.address}</Field>
          <Field label="Quận/Huyện">{customer.district}</Field>

          <Field label="Tỉnh/ TP">{customer.province}</Field>
          <Field label="Quốc gia">{customer.country}</Field>

          <Field label="Phường/Xã">{customer.ward}</Field>
          <Field label="Nguồn khách">{customer.source_name}</Field>
        </div>
      </Section>

      <Section title="Thông tin khác">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Field label="Mã khách hàng">{customer.customer_code}</Field>
          <Field label="Mã hệ thống core">{customer.external_customer_id}</Field>

          <Field label="Xếp hạng">{customer.rating_name}</Field>
          <Field label="Hạng thành viên">{customer.membership_tier_name}</Field>
        </div>
        <Field label="Mô tả">{customer.description}</Field>
      </Section>
    </div>
  );
}
