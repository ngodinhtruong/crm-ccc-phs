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
    <div className="table-filter-stack">
      <input
        type="number"
        value={minValue}
        onChange={(event) => onMinChange(event.target.value)}
        placeholder={minPlaceholder}
        className="table-filter-control h-8 rounded border border-slate-300 bg-white px-2 font-normal outline-none focus:border-sky-400"
      />

      <input
        type="number"
        value={maxValue}
        onChange={(event) => onMaxChange(event.target.value)}
        placeholder={maxPlaceholder}
        className="table-filter-control h-8 rounded border border-slate-300 bg-white px-2 font-normal outline-none focus:border-sky-400"
      />
    </div>
  );
}
