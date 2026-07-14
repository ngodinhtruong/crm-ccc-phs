"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";
import { KpiGroupType } from "@/types/kpi.type";

export function KpiGroupsTab({ config }: { config: KpiConfigController }) {
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<KpiGroupType>("MANUAL");

  const addGroup = async () => {
    if (!groupCode.trim() || !groupName.trim()) return;

    await config.addGroup({
      group_code: groupCode.trim().toUpperCase(),
      group_name: groupName.trim(),
      group_type: groupType,
      sort_order: config.groupRows.length + 1,
    });

    setGroupCode("");
    setGroupName("");
    setGroupType("MANUAL");
  };

  return (
    <div className="space-y-4 p-4">
      {config.canManage && (
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 text-xs font-bold uppercase text-slate-500">
            Thêm nhóm KPI
          </div>

          <div className="grid grid-cols-12 gap-2">
            <input
              value={groupCode}
              onChange={(event) => setGroupCode(event.target.value)}
              placeholder="Mã nhóm, VD: C"
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-2"
            />

            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Tên nhóm KPI"
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-5"
            />

            <select
              value={groupType}
              onChange={(event) => setGroupType(event.target.value as KpiGroupType)}
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-3"
            >
              <option value="MANUAL">MANUAL</option>
              <option value="AUTO">AUTO</option>
              <option value="MIXED">MIXED</option>
            </select>

            <button
              type="button"
              onClick={addGroup}
              className="col-span-12 inline-flex h-9 items-center justify-center gap-1 rounded bg-orange-500 px-3 text-xs font-semibold text-white hover:bg-orange-600 md:col-span-2"
            >
              <Plus size={14} />
              Thêm
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Nhóm mới được tạo với trạng thái tắt và trọng số 0%. Sau đó cần bật và lưu trọng số bằng batch.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-slate-50 text-slate-600">
                <th className="px-3">Mã nhóm</th>
                <th className="px-3">Tên nhóm</th>
                <th className="px-3">Loại</th>
                <th className="px-3">Trọng số %</th>
                <th className="px-3">STT</th>
                <th className="px-3">Active</th>
                <th className="px-3">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {config.groupRows.map((item) => (
                <tr key={item.id} className="h-12 border-b">
                  <td className="px-3 font-semibold">{item.group_code}</td>

                  <td className="px-3">
                    <input
                      value={item.group_name}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(
                          item.id,
                          "group_name",
                          event.target.value
                        )
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3">
                    <select
                      value={item.group_type}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(
                          item.id,
                          "group_type",
                          event.target.value as KpiGroupType
                        )
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="AUTO">AUTO</option>
                      <option value="MIXED">MIXED</option>
                    </select>
                  </td>

                  <td className="px-3">
                    <input
                      value={item.weight_percent}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(
                          item.id,
                          "weight_percent",
                          event.target.value
                        )
                      }
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3">
                    <input
                      value={item.sort_order}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(
                          item.id,
                          "sort_order",
                          Number(event.target.value)
                        )
                      }
                      className="h-8 w-20 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(
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
                        onClick={() => config.saveGroup(item)}
                        className="h-7 rounded border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 disabled:opacity-50"
                      >
                        Lưu tên
                      </button>

                      <button
                        type="button"
                        disabled={!config.canManage}
                        onClick={() => config.markGroupInactive(item.id)}
                        className="h-7 rounded border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                      >
                        Tắt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {config.groupRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500">
                    Chưa có nhóm KPI.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {config.canManage && (
        <div className="text-xs text-slate-500">
          Thay đổi trọng số hoặc active cần bấm <b>Lưu trọng số</b> ở đầu trang. Nếu tổng trọng số sai, backend sẽ không lưu.
        </div>
      )}
    </div>
  );
}