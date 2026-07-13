"use client";

import { UserAssigneeCombobox } from "@/components/common/UserAssigneeCombobox";
import {
  TicketFormField,
  TicketFormSection,
} from "@/components/tickets/TicketFormField";
import { UseTicketCreateReturn } from "@/hooks/useTicketCreate";
import {
  getContactTypeLabel,
  getTicketOptionName,
} from "@/utils/ticket-option.util";

export function TicketCreateForm({
  ticket,
}: {
  ticket: UseTicketCreateReturn;
}) {
  const { form, setField } = ticket;

  return (
    <form onSubmit={ticket.submit} className="pb-20">
      <TicketFormSection title="Thông tin Ticket" className="z-40">
        <div className="grid grid-cols-1 gap-x-20 gap-y-3 lg:grid-cols-2">
          <TicketFormField label="Danh mục hỗ trợ" required>
            <select
              value={form.supportCategory}
              onChange={(event) => ticket.changeSupportCategory(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn danh mục hỗ trợ</option>
              {ticket.supportCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTicketOptionName(item, ["category_name", "support_category_name", "name"])}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Phân loại" required>
            <select
              value={form.classification}
              onChange={(event) => setField("classification", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn phân loại</option>
              {ticket.filteredClassifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTicketOptionName(item, ["classification_name", "name"])}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Tình trạng" required>
            <select
              value={form.status}
              onChange={(event) => setField("status", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn tình trạng</option>
              {ticket.statuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTicketOptionName(item, ["status_name", "name"])}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Mức độ ưu tiên" required>
            <select
              value={form.priority}
              onChange={(event) => setField("priority", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn mức độ ưu tiên</option>
              {ticket.priorities.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTicketOptionName(item, ["priority_name", "name"])}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Phân công xử lý">
            <select
              value={form.assignedUnit}
              onChange={(event) => setField("assignedUnit", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn đơn vị xử lý</option>
              {ticket.processingUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTicketOptionName(item, ["unit_name", "processing_unit_name", "name"])}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Nguồn" required>
            <select
              value={form.source}
              onChange={(event) => setField("source", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn nguồn</option>
              {ticket.sources.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTicketOptionName(item, ["source_name", "name"])}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Chi nhánh xử lý" required>
            <select
              value={form.handlingBranch}
              onChange={(event) => setField("handlingBranch", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn chi nhánh xử lý</option>
              {ticket.branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTicketOptionName(item, ["branch_name", "name"])}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Giao cho" required>
            <UserAssigneeCombobox
              users={ticket.assigneeUsers}
              value={form.ownerUser}
              label={form.ownerUserLabel}
              placeholder="Nhập email người được giao..."
              onChange={(userId, nextLabel) => {
                setField("ownerUser", userId);
                setField("ownerUserLabel", nextLabel);
              }}
            />
          </TicketFormField>
        </div>
      </TicketFormSection>

      <TicketFormSection title="Thông tin liên hệ" className="z-30">
        <div className="grid grid-cols-1 gap-x-20 gap-y-3 lg:grid-cols-2">
          <TicketFormField label="Công ty">
            <select
              value={form.company}
              onChange={(event) => void ticket.changeCompany(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn công ty</option>
              {ticket.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Loại KH">
            <input
              value={getContactTypeLabel(form.contactType)}
              readOnly
              className="h-9 w-full rounded border border-slate-300 bg-slate-50 px-3 text-xs outline-none"
            />
          </TicketFormField>

          <TicketFormField label="Người liên hệ">
            <select
              value={form.customer}
              onChange={(event) => void ticket.changeCustomer(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn người liên hệ</option>
              {ticket.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name} {customer.email ? `- ${customer.email}` : ""}
                </option>
              ))}
            </select>
          </TicketFormField>

          <TicketFormField label="Số tài khoản">
            <input
              value={form.accountNumber}
              readOnly
              className="h-9 w-full rounded border border-slate-300 bg-slate-50 px-3 text-xs outline-none"
            />
          </TicketFormField>

          <TicketFormField label="Di động">
            <input
              value={form.mobile}
              onChange={(event) => setField("mobile", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            />
          </TicketFormField>

          <TicketFormField label="Email">
            <input
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            />
          </TicketFormField>
        </div>
      </TicketFormSection>

      <TicketFormSection title="Quản lý SLA" className="z-20">
        <div className="grid grid-cols-1 gap-x-20 gap-y-3 lg:grid-cols-2">
          <TicketFormField label="Danh mục SLA" required>
            <select
              value={form.slaPolicy}
              onChange={(event) => ticket.changeSlaPolicy(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn danh mục SLA</option>

              {ticket.filteredSlaPolicies.map((sla) => (
                <option key={sla.id} value={sla.id}>
                  {sla.sla_name || sla.sla_code || `SLA-${sla.id}`}
                </option>
              ))}
            </select>

            <p className="mt-1 text-[11px] text-slate-500">
              Chọn danh mục hỗ trợ sẽ tự lọc SLA. Chọn SLA sẽ tự load danh mục hỗ trợ và phân công xử lý.
            </p>
          </TicketFormField>
        </div>
      </TicketFormSection>

      <TicketFormSection title="Thông tin mô tả" className="z-10">
        <TicketFormField label="Nội dung yêu cầu" required>
          <textarea
            value={form.requestContent}
            onChange={(event) => setField("requestContent", event.target.value)}
            rows={4}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
          />
        </TicketFormField>
      </TicketFormSection>

      <TicketFormSection title="Giải pháp xử lý" className="z-0">
        <TicketFormField label="Hướng xử lý">
          <textarea
            value={form.handlingSolution}
            onChange={(event) => setField("handlingSolution", event.target.value)}
            rows={4}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
          />
        </TicketFormField>
      </TicketFormSection>

      <TicketFormSection title="Phản hồi ticket" className="z-0">
        <TicketFormField label="Phản hồi">
          <textarea
            value={form.finalResponse}
            onChange={(event) => setField("finalResponse", event.target.value)}
            rows={6}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
          />
        </TicketFormField>
      </TicketFormSection>

      <div className="fixed bottom-0 left-10 right-0 z-20 flex h-14 items-center justify-center gap-3 border-t bg-white">
        <button
          type="submit"
          disabled={ticket.saving}
          className="h-9 rounded bg-emerald-500 px-7 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ticket.saving ? "Đang lưu..." : "Lưu"}
        </button>

        <button
          type="button"
          onClick={ticket.cancel}
          className="h-9 rounded px-4 text-xs font-semibold text-red-500 hover:bg-red-50"
        >
          Hủy bỏ
        </button>
      </div>
    </form>
  );
}