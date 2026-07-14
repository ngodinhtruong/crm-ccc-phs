"use client";

import { KpiWeightValidation } from "@/types/kpi.type";

export function KpiWeightValidationPanel({
  validation,
}: {
  validation: KpiWeightValidation | null;
}) {
  if (!validation) return null;

  if (validation.valid) {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
        Cấu hình trọng số KPI hợp lệ.
      </div>
    );
  }

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
      <div className="font-semibold">Cấu hình trọng số chưa hợp lệ.</div>

      <ul className="mt-2 list-disc space-y-1 pl-5">
        {validation.errors.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
