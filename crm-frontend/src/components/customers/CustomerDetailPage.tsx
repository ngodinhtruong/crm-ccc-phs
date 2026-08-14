"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Tag, User } from "lucide-react";

import { chatbotTicketApi } from "@/apis/chatbot-ticket.api";
import { customerApi } from "@/apis/customer.api";
import { ticketApi } from "@/apis/ticket.api";
import { Customer360Panel } from "@/components/customers/Customer360Panel";
import { CustomerDetailFields } from "@/components/customers/CustomerDetailFields";
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
  { key: "overview", label: "Tổng quan", ready: true },
  { key: "detail", label: "Chi tiết", ready: true },
  { key: "activity_log", label: "Nhật ký", ready: false },
  { key: "activities", label: "Hoạt động", ready: false },
  { key: "emails", label: "Emails", ready: false },
  { key: "tickets", label: "Ticket", ready: true },
  { key: "documents", label: "Tài liệu", ready: false },
  { key: "calls", label: "Lịch sử cuộc gọi", ready: false },
];

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
                    <Phone size={12} className="text-emerald-500" />
                  </div>
                )}

                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#059669]">
                  <MapPin size={12} />
                  Xem bản đồ
                </div>

                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#059669] hover:underline"
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
                      ? "text-[#059669] after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-[#10b981]"
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
          {tab === "detail" && <CustomerDetailFields customer={customer} />}

          {tab === "tickets" && <CustomerTicketsTab customerId={id} />}

          {tab === "overview" && <Customer360Panel customerId={id} embedded />}

          {tab !== "detail" && tab !== "tickets" && tab !== "overview" && (
            <ComingSoon label={TABS.find((t) => t.key === tab)?.label || ""} />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
