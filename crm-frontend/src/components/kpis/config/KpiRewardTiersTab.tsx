"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";

export function KpiRewardTiersTab({
  config,
}: {
  config: KpiConfigController;
}) {
  const [tierCode, setTierCode] = useState("");
  const [tierName, setTierName] = useState("");

  const addReward = async () => {
    if (!tierCode.trim() || !tierName.trim()) return;

    await config.addReward({
      tier_code: tierCode.trim().toUpperCase(),
      tier_name: tierName.trim(),
      description: "",
      rank_metric_code: null,
      rank_limit: null,
      min_total_score: null,
      require_all_gates_passed: true,
      reward_type: "RECOGNITION",
      sort_order: config.rewardRows.length + 1,
      is_active: true,
    });

    setTierCode("");
    setTierName("");
  };

  return (
    <div className="space-y-4 p-4">
      {config.canManage && (
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 text-xs font-bold uppercase text-slate-500">
            Thêm bậc thưởng
          </div>

          <div className="grid grid-cols-12 gap-2">
            <input
              value={tierCode}
              onChange={(event) => setTierCode(event.target.value)}
              placeholder="Mã bậc, VD: BRONZE"
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-3"
            />

            <input
              value={tierName}
              onChange={(event) => setTierName(event.target.value)}
              placeholder="Tên bậc thưởng"
              className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs md:col-span-6"
            />

            <button
              type="button"
              onClick={addReward}
              className="col-span-12 inline-flex h-9 items-center justify-center gap-1 rounded bg-orange-500 px-3 text-xs font-semibold text-white hover:bg-orange-600 md:col-span-3"
            >
              <Plus size={14} />
              Thêm bậc
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-slate-50 text-slate-600">
                <th className="px-3">Mã</th>
                <th className="px-3">Tên bậc</th>
                <th className="px-3">Mô tả</th>
                <th className="px-3">Rank metric</th>
                <th className="px-3">Top</th>
                <th className="px-3">Min score</th>
                <th className="px-3">Gate</th>
                <th className="px-3">Reward type</th>
                <th className="px-3">STT</th>
                <th className="px-3">Active</th>
                <th className="px-3">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {config.rewardRows.map((item) => (
                <tr key={item.id} className="h-12 border-b align-top">
                  <td className="px-3 py-2 font-semibold">{item.tier_code}</td>

                  <td className="px-3 py-2">
                    <input
                      value={item.tier_name}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
                          item.id,
                          "tier_name",
                          event.target.value
                        )
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={item.description || ""}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
                          item.id,
                          "description",
                          event.target.value
                        )
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={item.rank_metric_code || ""}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
                          item.id,
                          "rank_metric_code",
                          event.target.value
                        )
                      }
                      placeholder="TOTAL_FEE"
                      className="h-8 w-36 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={item.rank_limit ?? ""}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
                          item.id,
                          "rank_limit",
                          event.target.value ? Number(event.target.value) : null
                        )
                      }
                      className="h-8 w-20 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={item.min_total_score || ""}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
                          item.id,
                          "min_total_score",
                          event.target.value
                        )
                      }
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.require_all_gates_passed}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
                          item.id,
                          "require_all_gates_passed",
                          event.target.checked
                        )
                      }
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={item.reward_type || ""}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
                          item.id,
                          "reward_type",
                          event.target.value
                        )
                      }
                      className="h-8 w-32 rounded border border-slate-300 px-2 text-xs"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={item.sort_order}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setRewardField(
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
                        config.setRewardField(
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
                        onClick={() => config.saveReward(item)}
                        className="h-7 rounded border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 disabled:opacity-50"
                      >
                        Lưu
                      </button>

                      <button
                        type="button"
                        disabled={!config.canManage}
                        onClick={() => config.deleteReward(item)}
                        className="h-7 rounded border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                      >
                        Xóa mềm
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {config.rewardRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-4 text-center text-slate-500">
                    Chưa có bậc thưởng.
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