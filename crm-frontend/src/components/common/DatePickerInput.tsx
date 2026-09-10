"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";

export type DatePickerInputProps = {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function DatePickerInput({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  className = "h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs outline-none focus:border-emerald-500",
}: DatePickerInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD -> dd/mm/yyyy for text display
  const displayValue = useMemo(() => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  }, [value]);

  const [textValue, setTextValue] = useState(displayValue);

  useEffect(() => {
    setTextValue(displayValue);
  }, [displayValue]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextValue(val);

    // Accept dd/mm/yyyy or d/m/yyyy format
    const match = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(val.trim());
    if (match) {
      const d = match[1].padStart(2, "0");
      const m = match[2].padStart(2, "0");
      const y = match[3];
      onChange(`${y}-${m}-${d}`);
    } else if (!val.trim()) {
      onChange("");
    }
  };

  const handleOpenPicker = () => {
    const el = hiddenInputRef.current;
    if (!el) return;
    try {
      if (typeof (el as any).showPicker === "function") {
        (el as any).showPicker();
        return;
      }
    } catch {
      // Fallback
    }
    el.click();
  };

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <input
        type="text"
        value={textValue}
        onChange={handleTextChange}
        placeholder={placeholder}
        className={`${className} pr-8 font-medium`}
      />

      <button
        type="button"
        onClick={handleOpenPicker}
        className="absolute right-2 text-slate-400 hover:text-emerald-600 focus:outline-none"
        title="Chọn ngày từ lịch"
        tabIndex={-1}
      >
        <Calendar size={14} />
      </button>

      <input
        ref={hiddenInputRef}
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="sr-only absolute bottom-0 left-0 h-0 w-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
