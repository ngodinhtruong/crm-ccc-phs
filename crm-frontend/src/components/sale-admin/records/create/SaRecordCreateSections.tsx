
"use client";

import {
  SaCustomerAccountSuggestion,
  SaRecordFormController,
  SaRecordFormMode,
} from "@/types/sale-admin.type";
import {
  CheckboxInput,
  FieldLabel,
  SelectInput,
  TextInput,
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
        placeholder="Nhập số TK hoặc tên KH"
        autoComplete="off"
      />

      {create.form.accountSelected && create.form.customerAccount && (
        <p className="mt-1 text-[11px] font-medium text-emerald-600">
          Đã chọn tài khoản hợp lệ trong hệ thống.
        </p>
      )}

      {!create.form.accountSelected && create.form.accountNo.trim().length >= 1 && (
        <p className="mt-1 text-[11px] text-amber-600">
          Vui lòng bấm chọn một tài khoản từ danh sách gợi ý.
        </p>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[42px] z-40 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white shadow-xl">
          {create.accountSuggestionLoading && (
            <div className="px-3 py-2 text-xs text-slate-500">
              Đang tìm tài khoản...
            </div>
          )}

          {create.accountSuggestionError && !create.accountSuggestionLoading && (
            <div className="px-3 py-2 text-xs text-red-500">
              {create.accountSuggestionError}
            </div>
          )}

          {!create.accountSuggestionLoading &&
            !create.accountSuggestionError &&
            suggestions.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-500">
                Không tìm thấy tài khoản trong hệ thống.
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
                className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left hover:bg-sky-50"
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
                  <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-[#007ead] ring-1 ring-sky-100">
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
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
        Thông tin tài khoản
      </h2>

      <div className="rounded-md border border-sky-100 bg-sky-50/40 px-3 py-2 text-xs text-slate-600 mb-3">
        SA Record chỉ cho phép ghi nhận với tài khoản đã có trong CRM. Nhập số TK hoặc tên khách hàng, sau đó chọn từ danh sách gợi ý.
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-4">
          <FieldLabel required>Số TK KH</FieldLabel>
          <AccountSuggestionCombobox create={create} />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Tên khách hàng</FieldLabel>
          <TextInput
            value={create.form.customerNameSnapshot}
            readOnly
            placeholder="Tự động sau khi chọn số TK"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Chi nhánh</FieldLabel>
          <TextInput
            value={create.form.branchNameSnapshot}
            readOnly
            placeholder="Tự động sau khi chọn số TK"
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
                : "Chọn trạng thái"}
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
                : "Không chọn"}
            </option>

            {create.vipClassificationOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>
    </section>
  );
}

export function SaRecordCallSection({
  create,
}: {
  create: SaRecordCreateController;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
        Thông tin cuộc gọi
      </h2>

      <div className="grid grid-cols-12 gap-3">
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
              {create.loadingMaster ? "Đang tải..." : "Chọn kết quả"}
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
            <option value="">Không chọn</option>

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
            <option value="">Không chọn</option>

            {create.icpGroups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icp_code} - {item.icp_name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-3">
          <CheckboxInput
            checked={create.form.reactivation}
            onChange={(value) => create.setField("reactivation", value)}
            label="Cờ hiệu tái kích hoạt"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <CheckboxInput
            checked={create.form.introducedProduct}
            onChange={(value) => create.setField("introducedProduct", value)}
            label="Giới thiệu sản phẩm"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <CheckboxInput
            checked={create.form.supportInfo}
            onChange={(value) => create.setField("supportInfo", value)}
            label="Hỗ trợ thông tin"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <CheckboxInput
            checked={create.form.referredRm}
            onChange={(value) => create.setField("referredRm", value)}
            label="Chuyển RM/MG"
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
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
        Giao dịch và bàn giao
      </h2>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-3">
          <FieldLabel>Giá trị giao dịch</FieldLabel>
          <TextInput
            type="number"
            value={create.form.transactionValueSnapshot}
            onChange={(value) =>
              create.setField("transactionValueSnapshot", value)
            }
            placeholder="Điền sau khi xác nhận tái kích hoạt"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <FieldLabel>Phí giao dịch</FieldLabel>
          <TextInput
            type="number"
            value={create.form.transactionFeeSnapshot}
            onChange={(value) =>
              create.setField("transactionFeeSnapshot", value)
            }
            placeholder="Điền sau khi xác nhận tái kích hoạt"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <CheckboxInput
            checked={create.form.handoverToBroker}
            onChange={(value) => create.setField("handoverToBroker", value)}
            label="Bàn giao môi giới"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <FieldLabel>Ghi chú bàn giao</FieldLabel>
          <TextInput
            value={create.form.brokerHandoverNote}
            onChange={(value) => create.setField("brokerHandoverNote", value)}
            placeholder="Ghi chú bàn giao"
          />
        </div>

        <div className="col-span-12">
          <FieldLabel>
            {mode === "edit" ? "Lý do chỉnh sửa" : "Ghi chú"}
          </FieldLabel>

          <textarea
            value={create.form.note}
            onChange={(event) => create.setField("note", event.target.value)}
            rows={4}
            placeholder={
              mode === "edit"
                ? "Nhập lý do chỉnh sửa. Có thể để trống."
                : "Nhập ghi chú tự do..."
            }
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
          />
        </div>
      </div>
    </section>
  );
}
