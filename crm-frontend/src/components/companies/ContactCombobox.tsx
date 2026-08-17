import { CustomerListItem } from "@/types/customer.type";

export function ContactCombobox({
  value,
  selectedContact,
  open,
  contacts,
  onOpenChange,
  onSearchChange,
  onSelect,
  onClear,
}: {
  value: string;
  selectedContact: string;
  open: boolean;
  contacts: CustomerListItem[];
  onOpenChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelect: (contact: CustomerListItem) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <input
        value={value}
        onFocus={() => onOpenChange(true)}
        onBlur={() => {
          setTimeout(() => onOpenChange(false), 150);
        }}
        onChange={(event) => {
          onSearchChange(event.target.value);
          onOpenChange(true);
        }}
        placeholder="Nhập tên, số điện thoại, mã khách hàng..."
        className="h-9 w-full rounded border px-3 pr-9 text-xs outline-none focus:border-emerald-500"
      />

      {value && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
        >
          ×
        </button>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-10 z-40 max-h-60 overflow-y-auto rounded-md border bg-white shadow-lg">
          {contacts.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">
              Không tìm thấy người liên hệ phù hợp.
            </div>
          ) : (
            contacts.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(item);
                }}
                className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-emerald-50"
              >
                <div className="font-semibold text-slate-700">
                  {item.full_name}
                  {item.phone ? ` (${item.phone})` : ""}
                </div>

                <div className="mt-0.5 text-[11px] text-slate-500">
                  {[
                    item.customer_code,
                    item.account_number,
                    item.email,
                    item.company_name,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Khách hàng cá nhân"}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selectedContact && (
        <p className="mt-1 text-[11px] text-emerald-600">
          Đã chọn người liên hệ chính.
        </p>
      )}
    </div>
  );
}
