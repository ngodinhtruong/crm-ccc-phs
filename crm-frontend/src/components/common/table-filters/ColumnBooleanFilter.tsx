"use client";

import { ColumnSelectFilter } from "./ColumnSelectFilter";

type ColumnBooleanFilterProps = {
  value: string;
  onChange: (value: string) => void;
  trueLabel?: string;
  falseLabel?: string;
};

export function ColumnBooleanFilter({
  value,
  onChange,
  trueLabel = "Có",
  falseLabel = "Không",
}: ColumnBooleanFilterProps) {
  return (
    <ColumnSelectFilter
      value={value}
      onChange={onChange}
      options={[
        {
          label: trueLabel,
          value: "true",
        },
        {
          label: falseLabel,
          value: "false",
        },
      ]}
    />
  );
}