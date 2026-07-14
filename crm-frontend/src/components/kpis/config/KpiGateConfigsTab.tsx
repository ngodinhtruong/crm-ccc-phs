"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";

export function KpiGateConfigsTab({ config }: { config: KpiConfigController }) {
  const [definitionId, setDefinitionId] = useState("");

  const addGate = async () => {
    if (!definitionId) return;

    const definition = config.gateDefinitions.find(
      (item) => String(item.id) === definitionId
    );

    if (!definition) return;

    await config.addGate({
      gate_definition: definition.id,
      gate_code: definition.gate_code,
      gate_name: definition.gate_name,
      operator: definition.operator,
      threshold_value: definition.default_threshold || "0.00",
      is_required: true,
      is_active: true,
    });

    setDefinitionId("");
  };

  return (
    <div className="space-y-4 p-4">
      {config.canManage && (
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 text-xs font-bold uppercase text-slate-500">
            Thêm Gate Condition
          </div>

          <div className="grid grid-cols-12 gap-2">
            <select
              value={definitionId}
              onChange={(event) => setDefinitionId(event.target.value)}
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-8"
            >
              <option value="">Chọn gate master</option>
              {config.gateDefinitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.gate_code} - {item.gate_name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={addGate}
              className="col-span-12 inline-flex h-9 items-center justify-center gap-1 rounded bg-orange-500 px-3 text-xs font-semibold text-white hover:bg-orange-600 md:col-span-2"
            >
              <Plus size={14} />
              Thêm Gate
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-slate-50 text-slate-600">
                <th className="px-3">Mã Gate</th>
                <th className="px-3">Tên Gate</th>
                <th className="px-3">Formula</th>
                <th className="px-3">Operator</th>
                <th className="px-3">Threshold</th>
                <th className="px-3">Required</th>
                <th className="px-3">Active</th>
                <th className="px-3">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {config.gateRows.map((item) => (
                <tr key={item.id} className="h-12 border-b">
                  <td className="px-3 font-semibold">{item.gate_code}</td>

                  <td className="px-3">
                    <input
                      value={item.gate_name}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGateField(item.id, "gate_name", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3">{item.formula_key}</td>

                  <td className="px-3">
                    <select
                      value={item.operator}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGateField(item.id, "operator", event.target.value)
                      }
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-xs"
                    >
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                      <option value="=">=</option>
                    </select>
                  </td>

                  <td className="px-3">
                    <input
                      value={item.threshold_value}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGateField(
                          item.id,
                          "threshold_value",
                          event.target.value
                        )
                      }
                      className="h-8 w-28 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3">
                    <input
                      type="checkbox"
                      checked={item.is_required}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGateField(
                          item.id,
                          "is_required",
                          event.target.checked
                        )
                      }
                    />
                  </td>

                  <td className="px-3">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGateField(
                          item.id,
                          "is_active",
                          event.target.checked
                        )
                      }
                    />
                  </td>

                  <td className="px-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!config.canManage}
                        onClick={() => config.saveGate(item)}
                        className="h-7 rounded border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 disabled:opacity-50"
                      >
                        Lưu
                      </button>

                      <button
                        type="button"
                        disabled={!config.canManage}
                        onClick={() => config.deleteGate(item)}
                        className="h-7 rounded border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                      >
                        Xóa mềm
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {config.gateRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    Chưa có gate condition.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}