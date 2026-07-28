"use client";

import type { FocusEventHandler, KeyboardEventHandler, ReactNode } from "react";
import { Check } from "lucide-react";

export function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
      {children}
      {required && <span className="ml-1 font-bold text-red-500">*</span>}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
  onFocus,
  onBlur,
  onKeyDown,
  autoComplete = "off",
  inputMode,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      autoComplete={autoComplete}
      inputMode={inputMode}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onChange={(event) => {
        if (readOnly) return;
        onChange?.(event.currentTarget.value);
      }}
      placeholder={placeholder}
      className={[
        "h-9 w-full rounded-md border text-xs outline-none transition-colors px-3",
        "focus:border-[#0097cf] focus:ring-2 focus:ring-[#0097cf]/20",
        readOnly
          ? "cursor-not-allowed border-slate-200 bg-slate-100 font-medium text-slate-600"
          : "border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 hover:border-slate-400",
      ].join(" ")}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={[
        "h-9 w-full rounded-md border text-xs outline-none transition-colors px-3",
        "focus:border-[#0097cf] focus:ring-2 focus:ring-[#0097cf]/20",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 font-medium text-slate-500"
          : "border-slate-300 bg-white text-slate-800 hover:border-slate-400",
      ].join(" ")}
    >
      {children}
    </select>
  );
}

export function CheckboxInput({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[#0097cf] focus:ring-[#0097cf]"
      />
      {label}
    </label>
  );
}

export function ToggleChip({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-xs transition-all",
        checked
          ? "border-[#0097cf] bg-[#0097cf] font-semibold text-white shadow-sm"
          : "border-slate-300 bg-slate-50/70 font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-100",
      ].join(" ")}
    >
      <span>{label}</span>
      <div
        className={[
          "flex h-4 w-4 items-center justify-center rounded",
          checked ? "bg-white/20 text-white" : "border border-slate-300 bg-white text-transparent",
        ].join(" ")}
      >
        <Check size={12} strokeWidth={3} />
      </div>
    </button>
  );
}
