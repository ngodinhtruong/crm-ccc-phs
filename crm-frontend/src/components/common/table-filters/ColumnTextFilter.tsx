"use client";

type ColumnTextFilterProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
};

export function ColumnTextFilter({
  value,
  onChange,
  placeholder,
  type = "text",
}: ColumnTextFilterProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-normal outline-none focus:border-sky-400"
    />
  );
}