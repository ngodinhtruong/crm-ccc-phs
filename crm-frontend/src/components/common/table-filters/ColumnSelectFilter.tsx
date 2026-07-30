"use client";

export type ColumnSelectOption = {
  label: string;
  value: string;
};

type ColumnSelectFilterProps = {
  value: string;
  onChange: (value: string) => void;
  options: ColumnSelectOption[];
  placeholder?: string;
};

export function ColumnSelectFilter({
  value,
  onChange,
  options,
  placeholder = "Tất cả",
}: ColumnSelectFilterProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      title={
        value
          ? options.find((option) => option.value === value)?.label
          : placeholder
      }
      className="table-filter-control h-8 cursor-pointer rounded border border-slate-300 bg-white px-2 pr-7 font-normal outline-none focus:border-sky-400"
    >
      <option value="">{placeholder}</option>

      {options.map((option) => (
        <option key={`${option.value}-${option.label}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
