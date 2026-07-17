"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Tag, User } from "lucide-react";

import { chatbotTicketApi } from "@/apis/chatbot-ticket.api";
import { customerApi } from "@/apis/customer.api";
import { ticketApi } from "@/apis/ticket.api";
import { CustomerTicketsTab } from "@/components/customers/CustomerTicketsTab";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { CustomerDetail } from "@/types/customer.type";

type TabKey =
  | "overview"
  | "detail"
  | "activity_log"
  | "activities"
  | "emails"
  | "tickets"
  | "documents"
  | "calls";

const TABS: { key: TabKey; label: string; ready: boolean }[] = [
  { key: "overview", label: "Tổng quan", ready: false },
  { key: "detail", label: "Chi tiết", ready: true },
  { key: "activity_log", label: "Nhật ký", ready: false },
  { key: "activities", label: "Hoạt động", ready: false },
  { key: "emails", label: "Emails", ready: false },
  { key: "tickets", label: "Ticket", ready: true },
  { key: "documents", label: "Tài liệu", ready: false },
  { key: "calls", label: "Lịch sử cuộc gọi", ready: false },
];

/** Một dòng thông tin: nhãn bên trái, giá trị bên phải (giống ảnh CRM) */
function Field({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  const empty =
    children === null || children === undefined || children === "";

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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-xs text-slate-400">Chức năng đang phát triển.</p>
    </div>
  );
}

export function CustomerDetailPage({ id }: { id: number }) {
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("detail");
  const [ticketCount, setTicketCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setCustomer(await customerApi.getCustomerById(id));
    } catch {
      setError("Không tải được thông tin khách hàng.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Đếm ticket để hiện badge trên tab — gồm cả ticket thường lẫn ticket chatbot
  useEffect(() => {
    let active = true;

    Promise.all([
      ticketApi
        .getTickets({ customer: String(id), page_size: "1" })
        .catch(() => null),
      chatbotTicketApi.getList({ customer: id, page_size: 1 }).catch(() => null),
    ]).then(([crm, bot]) => {
      if (!active) return;

      if (!crm && !bot) {
        setTicketCount(null);
        return;
      }

      setTicketCount((crm?.count ?? 0) + (bot?.count ?? 0));
    });

    return () => {
      active = false;
    };
  }, [id]);

  const isVip = (customer?.vip_type || "").toUpperCase() === "VIP";

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "KHÁCH HÀNG", href: "/customers" },
        { label: "Tất cả", href: "/customers" },
        { label: customer?.full_name || "Chi tiết" },
      ]}
      rightAction={
        <button
          type="button"
          onClick={() => router.push("/customers")}
          className="flex h-8 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={14} />
          Quay lại
        </button>
      }
    >
      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-600">
          {error}
        </div>
      )}

      {customer && (
        <div className="flex flex-col gap-3">
          {/* ── Header: avatar + tên + liên hệ ── */}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                <User size={30} />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-slate-800">
                  {customer.salutation ? `${customer.salutation} ` : ""}
                  {customer.full_name}
                </h1>

                {customer.phone && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                    {customer.phone}
                    <Phone size={12} className="text-sky-500" />
                  </div>
                )}

                <div className="mt-1 flex items-center gap-1.5 text-xs text-sky-600">
                  <MapPin size={12} />
                  Xem bản đồ
                </div>

                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:underline"
                >
                  <Tag size={12} />
                  Gán Tag
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isVip && (
                  <span className="rounded bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white">
                    VIP
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative px-4 py-3 text-xs font-medium transition ${
                    tab === t.key
                      ? "text-sky-600 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-sky-500"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                  {t.key === "tickets" && ticketCount !== null && (
                    <span className="ml-1.5 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {ticketCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Nội dung tab ── */}
          {tab === "detail" && (
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
                        <Phone size={11} className="text-sky-500" />
                      </span>
                    )}
                  </Field>
                  <Field label="Ngày mở tài khoản">
                    {customer.opened_account_date}
                  </Field>

                  <Field label="Email">
                    {customer.email && (
                      <span className="text-sky-600">{customer.email}</span>
                    )}
                  </Field>
                  <Field label="Môi giới">
                    {customer.assigned_employee_name}
                  </Field>

                  <Field label="Công ty">{customer.company_name}</Field>
                  <Field label="Khảo sát" />

                  <Field label="Phân loại VIP">
                    {customer.vip_type && (
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold text-white ${
                          isVip ? "bg-amber-400" : "bg-sky-500"
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
                  <Field label="Mã hệ thống core">
                    {customer.external_customer_id}
                  </Field>

                  <Field label="Xếp hạng">{customer.rating_name}</Field>
                  <Field label="Hạng thành viên">
                    {customer.membership_tier_name}
                  </Field>
                </div>
                <Field label="Mô tả">{customer.description}</Field>
              </Section>
            </div>
          )}

          {tab === "tickets" && <CustomerTicketsTab customerId={id} />}

          {tab !== "detail" && tab !== "tickets" && (
            <ComingSoon label={TABS.find((t) => t.key === tab)?.label || ""} />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
