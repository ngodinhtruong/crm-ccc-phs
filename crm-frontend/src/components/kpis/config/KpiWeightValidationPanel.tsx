"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { KpiWeightValidation } from "@/types/kpi.type";

export function KpiWeightValidationPanel({
  validation,
}: {
  validation: KpiWeightValidation | null;
}) {
  if (!validation) return null;

  if (validation.valid) {
    return null;
  }

  return (
    <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-700">
      <div className="flex items-center gap-2 font-semibold">
        <AlertCircle size={15} className="text-red-600 shrink-0" />
        <span>Cấu hình trọng số chưa hợp lệ</span>
      </div>

      <ul className="mt-1 list-disc space-y-0.5 pl-6 text-[11px]">
        {validation.errors.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
