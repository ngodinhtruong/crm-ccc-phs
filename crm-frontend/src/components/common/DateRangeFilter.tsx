"use client";

type DateRangeFilterProps = {
  fromLabel?: string;
  toLabel?: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export function DateRangeFilter({
  fromLabel = "Từ ngày",
  toLabel = "Đến ngày",
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          {fromLabel}
        </label>

        <input
          type="date"
          value={fromValue}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          {toLabel}
        </label>

        <input
          type="date"
          value={toValue}
          onChange={(event) => onToChange(event.target.value)}
          className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400"
        />
      </div>
    </>
  );
}