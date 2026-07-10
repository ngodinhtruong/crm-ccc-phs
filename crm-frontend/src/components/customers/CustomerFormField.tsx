import { CalendarDays } from "lucide-react";

export function CustomerFormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
      <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

export function CustomerDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex">
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 flex-1 rounded-l border px-3 text-xs outline-none focus:border-sky-400"
      />

      <div className="flex h-9 w-9 items-center justify-center rounded-r border-y border-r bg-slate-100 text-slate-600">
        <CalendarDays size={14} />
      </div>
    </div>
  );
}