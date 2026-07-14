"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";
import { KpiScoreDirection } from "@/types/kpi.type";

export function KpiMetricsTab({ config }: { config: KpiConfigController }) {
  const [groupId, setGroupId] = useState("");
  const [definitionId, setDefinitionId] = useState("");
  const [metricCode, setMetricCode] = useState("");
  const [metricName, setMetricName] = useState("");

  const selectedDefinition = config.metricDefinitions.find(
    (item) => String(item.id) === definitionId
  );

  const addMetric = async () => {
    if (!groupId || !definitionId || !metricCode.trim()) return;

    await config.addMetric({
      group: Number(groupId),
      metric_definition: Number(definitionId),
      metric_code: metricCode.trim().toUpperCase(),
      metric_name: metricName.trim() || selectedDefinition?.metric_name || "",
      sort_order: config.metricRows.length + 1,
    });

    setGroupId("");
    setDefinitionId("");
    setMetricCode("");
    setMetricName("");
  };

  return (
    <div className="space-y-4 p-4">
      {config.canManage && (
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 text-xs font-bold uppercase text-slate-500">
            Thêm chỉ tiêu KPI
          </div>

          <div className="grid grid-cols-12 gap-2">
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-2"
            >
              <option value="">Chọn nhóm</option>
              {config.groupRows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.group_code} - {item.group_name}
                </option>
              ))}
            </select>

            <select
              value={definitionId}
              onChange={(event) => setDefinitionId(event.target.value)}
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-3"
            >
              <option value="">Chọn KPI master</option>
              {config.metricDefinitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.metric_code} - {item.metric_name}
                </option>
              ))}
            </select>

            <input
              value={metricCode}
              onChange={(event) => setMetricCode(event.target.value)}
              placeholder="Mã kỳ, VD: A7 / B11"
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-2"
            />

            <input
              value={metricName}
              onChange={(event) => setMetricName(event.target.value)}
              placeholder="Tên hiển thị trong kỳ"
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-3"
            />

            <button
              type="button"
              onClick={addMetric}
              className="col-span-12 inline-flex h-9 items-center justify-center gap-1 rounded bg-orange-500 px-3 text-xs font-semibold text-white hover:bg-orange-600 md:col-span-2"
            >
              <Plus size={14} />
              Thêm KPI
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            KPI mới được tạo với trọng số 0% và trạng thái tắt. Sau đó bật và chia lại trọng số bằng nút Lưu trọng số.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-slate-50 text-slate-600">
                <th className="px-3">Mã</th>
                <th className="px-3">Nhóm</th>
                <th className="px-3">Tên KPI</th>
                <th className="px-3">Loại</th>
                <th className="px-3">Formula</th>
                <th className="px-3">Target</th>
                <th className="px-3">Trọng số %</th>
                <th className="px-3">STT</th>
                <th className="px-3">Active</th>
                <th className="px-3">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {config.metricRows.map((item) => (
                <tr key={item.id} className="h-12 border-b align-top">
                  <td className="px-3 py-2 font-semibold">{item.metric_code}</td>
                  <td className="px-3 py-2">{item.group_code}</td>

                  <td className="px-3 py-2">
                    <input
                      value={item.metric_name}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setMetricField(
                          item.id,
                          "metric_name",
                          event.target.value
                        )
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">{item.input_type}</td>
                  <td className="px-3 py-2">{item.formula_key || "-"}</td>

                  <td className="px-3 py-2">
                    <input
                      value={item.target_value || ""}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setMetricField(
                          item.id,
                          "target_value",
                          event.target.value
                        )
                      }
                      className="h-8 w-28 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={item.weight_percent}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setMetricField(
                          item.id,
                          "weight_percent",
                          event.target.value
                        )
                      }
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  

                  <td className="px-3 py-2">
                    <input
                      value={item.sort_order}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setMetricField(
                          item.id,
                          "sort_order",
                          Number(event.target.value)
                        )
                      }
                      className="h-8 w-20 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setMetricField(
                          item.id,
                          "is_active",
                          event.target.checked
                        )
                      }
                    />
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!config.canManage}
                        onClick={() => config.saveMetric(item)}
                        className="h-7 rounded border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 disabled:opacity-50"
                      >
                        Lưu thông tin
                      </button>

                      <button
                        type="button"
                        disabled={!config.canManage}
                        onClick={() => config.markMetricInactive(item.id)}
                        className="h-7 rounded border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                      >
                        Tắt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {config.metricRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-4 text-center text-slate-500">
                    Chưa có chỉ tiêu KPI.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {config.canManage && (
        <div className="text-xs text-slate-500">
          Trọng số và trạng thái active lưu bằng nút <b>Lưu trọng số</b>. Nếu tổng trọng số sai, backend rollback và không lưu.
        </div>
      )}
    </div>
  );
}