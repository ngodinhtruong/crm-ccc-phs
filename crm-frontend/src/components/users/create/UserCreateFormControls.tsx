"use client";

import type { ReactNode } from "react";

export function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold text-slate-700"
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[11px] leading-4 text-slate-500">{children}</p>;
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
  disabled = false,
  autoComplete,
}: {
  id?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      autoComplete={autoComplete}
      onChange={(event) => {
        if (readOnly || disabled) return;
        onChange?.(event.target.value);
      }}
      placeholder={placeholder}
      className={[
        "h-10 w-full rounded-md border px-3 text-sm text-slate-800 outline-none transition",
        "border-slate-300 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
        readOnly || disabled
          ? "cursor-not-allowed bg-slate-100 text-slate-600"
          : "bg-white",
      ].join(" ")}
    />
  );
}

export function SelectInput({
  id,
  value,
  onChange,
  children,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
    >
      {children}
    </select>
  );
}

export function CheckboxInput({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={[
        "flex items-start gap-3 rounded-md border p-3",
        checked ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>
        <span className="block text-xs font-semibold text-slate-700">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function ChoiceCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-lg border p-3 text-left transition",
        selected
          ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="flex items-center gap-2">
        <span
          className={[
            "flex h-4 w-4 items-center justify-center rounded-full border",
            selected ? "border-emerald-500" : "border-slate-300",
          ].join(" ")}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
        </span>
        <span className="text-xs font-bold text-slate-800">{title}</span>
      </span>
      <span className="mt-1.5 block pl-6 text-[11px] leading-4 text-slate-500">
        {description}
      </span>
    </button>
  );
}

export function ReadonlyValue({
  value,
  empty = "-",
}: {
  value?: ReactNode;
  empty?: string;
}) {
  return (
    <div className="flex min-h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
      {value || empty}
    </div>
  );
}
