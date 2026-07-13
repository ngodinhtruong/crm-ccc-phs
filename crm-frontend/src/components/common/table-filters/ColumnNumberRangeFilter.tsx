"use client";

type ColumnNumberRangeFilterProps = {
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
};

export function ColumnNumberRangeFilter({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder = "Từ",
  maxPlaceholder = "Đến",
}: ColumnNumberRangeFilterProps) {
  return (
    <div className="space-y-1">
      <input
        type="number"
        value={minValue}
        onChange={(event) => onMinChange(event.target.value)}
        placeholder={minPlaceholder}
        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-normal outline-none focus:border-sky-400"
      />

      <input
        type="number"
        value={maxValue}
        onChange={(event) => onMaxChange(event.target.value)}
        placeholder={maxPlaceholder}
        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-normal outline-none focus:border-sky-400"
      />
    </div>
  );
}