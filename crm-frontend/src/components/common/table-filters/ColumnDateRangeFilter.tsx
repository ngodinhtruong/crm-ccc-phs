"use client";

type ColumnDateRangeFilterProps = {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export function ColumnDateRangeFilter({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: ColumnDateRangeFilterProps) {
  return (
    <div className="space-y-1">
      <input
        type="date"
        value={fromValue}
        onChange={(event) => onFromChange(event.target.value)}
        className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-[10px] font-normal outline-none focus:border-sky-400"
      />

      <input
        type="date"
        value={toValue}
        onChange={(event) => onToChange(event.target.value)}
        className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-[10px] font-normal outline-none focus:border-sky-400"
      />
    </div>
  );
}