import { SelectOption } from "@/types/company.type";
import {
  getCompanyOptionName,
  getEmployeeMeta,
} from "@/utils/company-option.util";

export function EmployeeCombobox({
  value,
  selectedEmployee,
  open,
  employees,
  onOpenChange,
  onSearchChange,
  onSelect,
  onClear,
}: {
  value: string;
  selectedEmployee: string;
  open: boolean;
  employees: SelectOption[];
  onOpenChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelect: (employee: SelectOption) => void;
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
        placeholder="Nhập tên, mã nhân viên, chi nhánh..."
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
          {employees.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">
              Không tìm thấy nhân viên phù hợp.
            </div>
          ) : (
            employees.map((item) => (
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
                  {getCompanyOptionName(item, [
                    "full_name",
                    "employee_name",
                    "name",
                    "username",
                  ])}
                </div>

                <div className="mt-0.5 text-[11px] text-slate-500">
                  {getEmployeeMeta(item)}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selectedEmployee && (
        <p className="mt-1 text-[11px] text-emerald-600">
          Đã chọn nhân viên phụ trách.
        </p>
      )}
    </div>
  );
}