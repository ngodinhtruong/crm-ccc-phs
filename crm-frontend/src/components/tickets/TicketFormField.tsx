import { ReactNode } from "react";
import { ChevronUp } from "lucide-react";

export function TicketFormSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative mb-3 overflow-visible rounded-md border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex h-10 items-center gap-2 border-b px-4 text-sm font-semibold text-slate-800">
        <ChevronUp size={14} />
        {title}
      </div>

      <div className="overflow-visible p-4">{children}</div>
    </section>
  );
}

export function TicketFormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative grid grid-cols-[240px_1fr] items-center overflow-visible">
      <label className="bg-slate-50 px-3 py-3 text-right text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative overflow-visible pl-3">{children}</div>
    </div>
  );
}