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
    <div className="table-filter-stack">
      <input
        type="date"
        aria-label="Từ ngày"
        title="Từ ngày"
        value={fromValue}
        onChange={(event) => onFromChange(event.target.value)}
        className="table-filter-control table-filter-date h-8 rounded border border-slate-300 bg-white px-1.5 font-normal outline-none focus:border-sky-400"
      />

      <input
        type="date"
        aria-label="Đến ngày"
        title="Đến ngày"
        value={toValue}
        onChange={(event) => onToChange(event.target.value)}
        className="table-filter-control table-filter-date h-8 rounded border border-slate-300 bg-white px-1.5 font-normal outline-none focus:border-sky-400"
      />
    </div>
  );
}
