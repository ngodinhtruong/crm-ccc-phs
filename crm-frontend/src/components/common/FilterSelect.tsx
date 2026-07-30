"use client";

type FilterSelectOption = {
  label: string;
  value: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
};

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Tất cả",
}: FilterSelectProps) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 max-w-full truncate rounded border border-slate-300 bg-white px-2 pr-7 text-xs outline-none focus:border-emerald-500"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}