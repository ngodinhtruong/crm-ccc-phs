"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Save } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";

export function KpiPeriodHeader({ config }: { config: KpiConfigController }) {
  const now = useMemo(() => new Date(), []);

  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [activate, setActivate] = useState(true);

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">
            Cấu hình KPI Sale Admin
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Quản lý nhóm KPI, chỉ tiêu KPI, trọng số, gate conditions và bậc thưởng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={config.reloadPeriodDetail}
            className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Tải lại
          </button>

          {config.canManage && (
            <button
              type="button"
              onClick={config.saveWeights}
              disabled={config.saving || !config.periodDetail}
              className="inline-flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={14} />
              Lưu trọng số
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 px-4 py-3">
        <div className="col-span-12 md:col-span-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Kỳ KPI
          </label>
          <select
            value={config.selectedPeriodId}
            onChange={(event) => config.setSelectedPeriodId(event.target.value)}
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
          >
            <option value="">Chọn kỳ KPI</option>
            {config.periods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.period_code} - {item.period_name} ({item.status})
              </option>
            ))}
          </select>
        </div>

        {config.canManage && (
          <>
            <div className="col-span-6 md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Năm
              </label>
              <input
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Tháng
              </label>
              <input
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
              />
            </div>

            <div className="col-span-6 flex items-end md:col-span-2">
              <label className="flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={activate}
                  onChange={(event) => setActivate(event.target.checked)}
                />
                Active
              </label>
            </div>

            <div className="col-span-6 flex items-end md:col-span-2">
              <button
                type="button"
                onClick={() =>
                  config.createMonthlyPeriod(Number(year), Number(month), activate)
                }
                disabled={config.saving}
                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded bg-orange-500 px-3 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                <Plus size={14} />
                Tạo kỳ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}