"use client";

import {
  AlertCircle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  PhoneCall,
  Search,
  UserCheck,
  UserPlus,
} from "lucide-react";

import {
  SaCustomerAccountSuggestion,
  SaRecordFormController,
  SaRecordFormMode,
} from "@/types/sale-admin.type";

import {
  FieldLabel,
  SelectInput,
  TextInput,
  ToggleChip,
} from "./SaRecordCreateFormControls";

type SaRecordCreateController = SaRecordFormController;

function AccountSuggestionCombobox({
  create,
}: {
  create: SaRecordCreateController;
}) {
  const suggestions = create.accountSuggestions || [];
  const showDropdown =
    create.accountDropdownOpen &&
    !create.form.accountSelected &&
    (suggestions.length > 0 ||
      create.accountSuggestionLoading ||
      Boolean(create.accountSuggestionError) ||
      create.form.accountNo.trim().length >= 1);

  const renderSubtitle = (account: SaCustomerAccountSuggestion) => {
    const parts = [account.customer_name, account.branch_name, account.account_status]
      .filter(Boolean)
      .join(" · ");

    return parts || "Tài khoản khách hàng trong hệ thống";
  };

  return (
    <div className="relative">
      <div className="relative">
        <TextInput
          value={create.form.accountNo}
          onChange={create.handleAccountNoChange}
          onFocus={() => {
            if (!create.form.accountSelected && create.form.accountNo.trim().length >= 1) {
              create.setAccountDropdownOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              create.setAccountDropdownOpen(false);
            }, 120);
          }}
          placeholder="Nhập số TK hoặc tên KH..."
          autoComplete="off"
        />
        <div className="pointer-events-none absolute right-3 top-2.5 text-slate-400">
          <Search size={15} />
        </div>
      </div>

      {create.form.accountSelected && create.form.customerAccount && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>Đã xác nhận tài khoản trong hệ thống.</span>
        </div>
      )}

      {!create.form.accountSelected && create.form.accountNo.trim().length >= 1 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <AlertCircle size={14} className="text-amber-600" />
          <span>Vui lòng chọn tài khoản hợp lệ từ danh sách gợi ý.</span>
        </div>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[42px] z-40 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white shadow-xl">
          {create.accountSuggestionLoading && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-500">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#0097cf]" />
              Đang tìm kiếm tài khoản...
            </div>
          )}

          {create.accountSuggestionError && !create.accountSuggestionLoading && (
            <div className="px-3 py-2.5 text-xs text-red-600">
              {create.accountSuggestionError}
            </div>
          )}

          {!create.accountSuggestionLoading &&
            !create.accountSuggestionError &&
            suggestions.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-500">
                Không tìm thấy tài khoản trong hệ thống CRM.
              </div>
            )}

          {!create.accountSuggestionLoading &&
            suggestions.map((account) => (
              <button
                key={account.id}
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  create.selectCustomerAccountSuggestion(account);
                  create.setAccountDropdownOpen(false);
                }}
                className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-sky-50/70"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#007ead]">
                    {account.account_number}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-600">
                    {renderSubtitle(account)}
                  </p>
                </div>

                {account.membership_tier_name && (
                  <span className="shrink-0 rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-[#007ead]">
                    {account.membership_tier_name}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function SaRecordAccountSection({
  create,
}: {
  create: SaRecordCreateController;
}) {
  return (
    <section className="rounded-lg border border-slate-200 border-l-4 border-l-[#0097cf] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-sky-50 text-[#0097cf]">
          <UserCheck size={16} />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Thông tin Khách hàng & Tài khoản
          </h2>
          <p className="text-[11px] text-slate-500">
            Tìm kiếm và xác nhận thông tin tài khoản đã tồn tại trong hệ thống CRM
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <FieldLabel required>Số tài khoản lưu ký</FieldLabel>
          <AccountSuggestionCombobox create={create} />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Tên khách hàng</FieldLabel>
          <TextInput
            value={create.form.customerNameSnapshot}
            readOnly
            placeholder="Tự động điền khi chọn số TK"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Chi nhánh quản lý</FieldLabel>
          <TextInput
            value={create.form.branchNameSnapshot}
            readOnly
            placeholder="Tự động điền khi chọn số TK"
          />
        </div>

        <div className="col-span-12 md:col-span-6">
          <FieldLabel>Trạng thái tài khoản</FieldLabel>
          <SelectInput
            value={create.form.accountStatus}
            onChange={(value) => create.setField("accountStatus", value)}
            disabled={!create.form.accountSelected || create.accountStatusOptions.length === 0}
          >
            <option value="">
              {create.accountStatusOptions.length === 0
                ? "Chưa có danh mục trạng thái"
                : "-- Chọn trạng thái tài khoản --"}
            </option>

            {create.accountStatusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-6">
          <FieldLabel>Phân loại VIP</FieldLabel>
          <SelectInput
            value={create.form.vipClassification}
            onChange={(value) => create.setField("vipClassification", value)}
            disabled={!create.form.accountSelected || create.vipClassificationOptions.length === 0}
          >
            <option value="">
              {create.vipClassificationOptions.length === 0
                ? "Chưa có danh mục VIP"
                : "-- Không chọn --"}
            </option>

            {create.vipClassificationOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      {create.form.accountSelected && create.form.customerNameSnapshot && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-3 text-xs">
          <span className="font-semibold text-slate-600">Thông tin tóm tắt:</span>
          <span className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 font-bold text-slate-800 shadow-sm border border-slate-200">
            <Building2 size={13} className="text-[#0097cf]" />
            {create.form.customerNameSnapshot}
          </span>
          {create.form.branchNameSnapshot && (
            <span className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 font-medium text-slate-700 border border-slate-200">
              Chi nhánh: {create.form.branchNameSnapshot}
            </span>
          )}
          {create.form.accountStatus && (
            <span className="rounded bg-[#0097cf] px-2.5 py-1 font-semibold text-white">
              {create.form.accountStatus}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

export function SaRecordCallSection({
  create,
}: {
  create: SaRecordCreateController;
}) {
  return (
    <section className="rounded-lg border border-slate-200 border-l-4 border-l-[#0097cf] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-sky-50 text-[#0097cf]">
          <PhoneCall size={16} />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Kết quả & Đánh giá cuộc gọi
          </h2>
          <p className="text-[11px] text-slate-500">
            Ghi nhận thời gian, kết quả tương tác và đánh giá nhu cầu của khách hàng
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <FieldLabel required>Ngày gọi</FieldLabel>
          <TextInput
            type="date"
            value={create.form.callDate}
            onChange={(value) => create.setField("callDate", value)}
          />
        </div>

        <div className="col-span-12 md:col-span-2">
          <FieldLabel required>Lần follow</FieldLabel>
          <TextInput
            type="number"
            value={create.form.followNo}
            onChange={(value) => create.setField("followNo", value)}
            placeholder="1"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <FieldLabel required>Kết quả cuộc gọi</FieldLabel>
          <SelectInput
            value={create.form.callResult}
            onChange={(value) => create.setField("callResult", value)}
          >
            <option value="">
              {create.loadingMaster ? "Đang tải danh mục..." : "-- Chọn kết quả cuộc gọi --"}
            </option>

            {create.callResults.map((item) => (
              <option key={item.id} value={item.id}>
                {item.result_name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-2">
          <FieldLabel>Mức độ quan tâm</FieldLabel>
          <SelectInput
            value={create.form.interestLevel}
            onChange={(value) => create.setField("interestLevel", value)}
          >
            <option value="">-- Không chọn --</option>

            {create.interestLevels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.level_name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-2">
          <FieldLabel>Nhóm KH ICP</FieldLabel>
          <SelectInput
            value={create.form.icpGroup}
            onChange={(value) => create.setField("icpGroup", value)}
          >
            <option value="">-- Không chọn --</option>

            {create.icpGroups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icp_code} - {item.icp_name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-4">
          <ToggleChip
            checked={create.form.reactivation}
            onChange={(value) => create.setField("reactivation", value)}
            label="Tái kích hoạt tài khoản"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <ToggleChip
            checked={create.form.introducedProduct}
            onChange={(value) => create.setField("introducedProduct", value)}
            label="Giới thiệu sản phẩm dịch vụ"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <ToggleChip
            checked={create.form.supportInfo}
            onChange={(value) => create.setField("supportInfo", value)}
            label="Hỗ trợ thông tin tài khoản"
          />
        </div>
      </div>
    </section>
  );
}

export function SaRecordTransactionSection({
  create,
  mode = "create",
}: {
  create: SaRecordCreateController;
  mode?: SaRecordFormMode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 border-l-4 border-l-[#0097cf] bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-sky-50 text-[#0097cf]">
          <ArrowRightLeft size={16} />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Giao dịch & Bàn giao Môi giới
          </h2>
          <p className="text-[11px] text-slate-500">
            Ghi nhận số liệu giao dịch và thông tin chuyển giao chăm sóc cho môi giới
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Giá trị giao dịch dự kiến (VNĐ)</FieldLabel>
          <TextInput
            type="number"
            value={create.form.transactionValueSnapshot}
            onChange={(value) =>
              create.setField("transactionValueSnapshot", value)
            }
            placeholder="0"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Phí giao dịch dự kiến (VNĐ)</FieldLabel>
          <TextInput
            type="number"
            value={create.form.transactionFeeSnapshot}
            onChange={(value) =>
              create.setField("transactionFeeSnapshot", value)
            }
            placeholder="0"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Thực hiện bàn giao</FieldLabel>
          <ToggleChip
            checked={create.form.handoverToBroker}
            onChange={(value) => create.setField("handoverToBroker", value)}
            label="Bàn giao cho Môi giới"
          />
        </div>
      </div>

      {create.form.handoverToBroker && (
        <div className="rounded-md border border-sky-200 bg-sky-50/70 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#007ead]">
            <UserPlus size={16} />
            <span>THÔNG TIN BÀN GIAO MÔI GIỚI</span>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <FieldLabel required>Nhân viên môi giới nhận bàn giao</FieldLabel>
              <SelectInput
                value={create.form.brokerEmployee || create.form.brokerUser}
                onChange={(value) => create.setField("brokerEmployee", value)}
              >
                <option value="">-- Chọn môi giới nhận bàn giao --</option>
                {(create.employeeOptions || []).map((emp) => (
                  <option key={emp.value} value={emp.value}>
                    {emp.label}
                  </option>
                ))}
              </SelectInput>
            </div>

            <div className="col-span-12 md:col-span-6">
              <FieldLabel>Ghi chú bàn giao</FieldLabel>
              <TextInput
                value={create.form.brokerHandoverNote}
                onChange={(value) => create.setField("brokerHandoverNote", value)}
                placeholder="Ghi rõ lý do hoặc chỉ dẫn bàn giao..."
              />
            </div>
          </div>

          <p className="text-[11px] font-medium text-slate-600">
            * Lưu ý: Phí và giá trị giao dịch phát sinh kể từ thời điểm bàn giao sẽ được tính cho Môi giới đã chọn, không tính cho SA.
          </p>
        </div>
      )}

      <div>
        <FieldLabel>
          {mode === "edit" ? "Lý do chỉnh sửa" : "Ghi chú bổ sung"}
        </FieldLabel>

        <textarea
          value={create.form.note}
          onChange={(event) => create.setField("note", event.target.value)}
          rows={3}
          placeholder={
            mode === "edit"
              ? "Nhập lý do chỉnh sửa SA Record (nếu có)..."
              : "Nhập ghi chú chi tiết về cuộc gọi hoặc yêu cầu của khách hàng..."
          }
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs outline-none transition-colors focus:border-[#0097cf] focus:ring-2 focus:ring-[#0097cf]/20"
        />
      </div>
    </section>
  );
}
