"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Power, Trash2, X, Sliders, ShieldCheck } from "lucide-react";
import { KpiConfigController } from "@/hooks/useKpiConfig";
import { SaIcpGroup, SaIcpRule } from "@/types/sale-admin.type";

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Đang dùng
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
      Ngưng sử dụng
    </span>
  );
}

type GroupModalState =
  | { mode: "create" }
  | { mode: "edit"; item: SaIcpGroup }
  | null;

type RuleModalState =
  | { mode: "create" }
  | { mode: "edit"; item: SaIcpRule }
  | null;

export function KpiIcpGroupsTab({ config }: { config: KpiConfigController }) {
  const [groupModal, setGroupModal] = useState<GroupModalState>(null);
  const [ruleModal, setRuleModal] = useState<RuleModalState>(null);
  const [showInactive, setShowInactive] = useState(true);

  // Group Form states
  const [icpCode, setIcpCode] = useState("");
  const [icpName, setIcpName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPotential, setIsPotential] = useState(false);
  const [isGroupActive, setIsGroupActive] = useState(true);
  const [groupSortOrder, setGroupSortOrder] = useState<number | "">(1);

  // Rule Form states
  const [ruleCallResult, setRuleCallResult] = useState<string>("");
  const [ruleInterestLevel, setRuleInterestLevel] = useState<string>("");
  const [ruleIcpGroup, setRuleIcpGroup] = useState<string>("");
  const [rulePriority, setRulePriority] = useState<number | "">(1);
  const [isRuleActive, setIsRuleActive] = useState(true);
  const [ruleDescription, setRuleDescription] = useState("");

  const displayedGroups = useMemo(() => {
    let list = config.icpGroups || [];
    if (!showInactive) {
      list = list.filter((item) => item.is_active);
    }
    return [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id);
  }, [config.icpGroups, showInactive]);

  const displayedRules = useMemo(() => {
    let list = config.icpRules || [];
    if (!showInactive) {
      list = list.filter((item) => item.is_active);
    }
    return [...list].sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.id - b.id);
  }, [config.icpRules, showInactive]);

  // ICP Group Handlers
  const openCreateGroupModal = () => {
    setIcpCode("");
    setIcpName("");
    setGroupDescription("");
    setIsPotential(true);
    setIsGroupActive(true);
    setGroupSortOrder((config.icpGroups?.length || 0) + 1);
    setGroupModal({ mode: "create" });
  };

  const openEditGroupModal = (item: SaIcpGroup) => {
    setIcpCode(item.icp_code || "");
    setIcpName(item.icp_name || "");
    setGroupDescription(item.description || "");
    setIsPotential(Boolean(item.is_potential));
    setIsGroupActive(Boolean(item.is_active));
    setGroupSortOrder(item.sort_order ?? 1);
    setGroupModal({ mode: "edit", item });
  };

  const handleGroupSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!icpCode.trim() || !icpName.trim()) {
      alert("Vui lòng nhập đầy đủ Mã ICP và Tên phân khúc!");
      return;
    }

    const payload: Partial<SaIcpGroup> = {
      icp_code: icpCode.trim().toUpperCase(),
      icp_name: icpName.trim(),
      description: groupDescription.trim() || null,
      is_potential: isPotential,
      is_active: isGroupActive,
      sort_order: groupSortOrder !== "" ? Number(groupSortOrder) : 0,
    };

    try {
      if (groupModal?.mode === "create") {
        await config.createIcpGroup(payload);
      } else if (groupModal?.mode === "edit") {
        await config.updateIcpGroup(groupModal.item.id, payload);
      }
      setGroupModal(null);
    } catch {
      // Error handled by hook notice/error
    }
  };

  const handleGroupSoftDelete = async (item: SaIcpGroup) => {
    const confirmText = item.is_active
      ? `Bạn có chắc chắn muốn ngưng sử dụng phân khúc "${item.icp_code} - ${item.icp_name}"?`
      : `Bạn có chắc chắn muốn mở lại phân khúc "${item.icp_code} - ${item.icp_name}"?`;

    if (window.confirm(confirmText)) {
      try {
        if (item.is_active) {
          await config.deleteIcpGroup(item.id);
        } else {
          await config.updateIcpGroup(item.id, { is_active: true });
        }
      } catch {
        // Error handled in hook
      }
    }
  };

  // Rule Handlers
  const openCreateRuleModal = () => {
    setRuleCallResult("");
    setRuleInterestLevel("");
    setRuleIcpGroup(config.icpGroups?.[0]?.id ? String(config.icpGroups[0].id) : "");
    setRulePriority((config.icpRules?.length || 0) + 1);
    setIsRuleActive(true);
    setRuleDescription("");
    setRuleModal({ mode: "create" });
  };

  const openEditRuleModal = (item: SaIcpRule) => {
    setRuleCallResult(item.call_result ? String(item.call_result) : "");
    setRuleInterestLevel(item.interest_level ? String(item.interest_level) : "");
    setRuleIcpGroup(item.icp_group ? String(item.icp_group) : "");
    setRulePriority(item.priority ?? 1);
    setIsRuleActive(Boolean(item.is_active));
    setRuleDescription(item.description || "");
    setRuleModal({ mode: "edit", item });
  };

  const handleRuleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ruleIcpGroup) {
      alert("Vui lòng chọn Nhóm ICP được gán!");
      return;
    }

    const payload: Partial<SaIcpRule> = {
      call_result: ruleCallResult ? Number(ruleCallResult) : null,
      interest_level: ruleInterestLevel ? Number(ruleInterestLevel) : null,
      icp_group: Number(ruleIcpGroup),
      priority: rulePriority !== "" ? Number(rulePriority) : 1,
      is_active: isRuleActive,
      description: ruleDescription.trim() || null,
    };

    try {
      if (ruleModal?.mode === "create") {
        await config.createIcpRule(payload);
      } else if (ruleModal?.mode === "edit") {
        await config.updateIcpRule(ruleModal.item.id, payload);
      }
      setRuleModal(null);
    } catch {
      // Error handled by hook notice/error
    }
  };

  const handleRuleDelete = async (item: SaIcpRule) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa quy tắc gán ICP này?")) {
      try {
        await config.deleteIcpRule(item.id);
      } catch {
        // Error handled in hook
      }
    }
  };

  return (
    <div className="space-y-4 p-3 sm:p-4">
      {/* 1. DANH MỤC PHÂN KHÚC ICP */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              1. Danh mục Phân khúc Khách hàng (ICP)
            </h3>
            <p className="text-xs text-slate-500">
              Cấu hình các phân nhóm ICP hiển thị trên hệ thống (ví dụ: A - Rất tiềm năng, B - Tiềm năng...)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Hiển thị mục đã ngưng dùng
            </label>

            <button
              type="button"
              onClick={openCreateGroupModal}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Thêm phân khúc ICP
            </button>
          </div>
        </div>

        {/* ICP Groups Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm">
          {config.loadingIcp ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải danh sách phân khúc ICP...
            </div>
          ) : displayedGroups.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Chưa có phân khúc ICP nào. Bấm nút &quot;Thêm phân khúc ICP&quot; để tạo mới.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="w-16 px-4 py-2.5 text-center">Thứ tự</th>
                  <th className="w-32 px-4 py-2.5">Mã ICP</th>
                  <th className="px-4 py-2.5">Tên phân khúc</th>
                  <th className="w-28 px-4 py-2.5 text-center">Tiềm năng</th>
                  <th className="w-28 px-4 py-2.5 text-center">Trạng thái</th>
                  <th className="w-28 px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedGroups.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-emerald-50/50 transition-colors ${
                      !item.is_active ? "bg-slate-50/60 text-slate-400 opacity-75" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">
                      {item.sort_order ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      <span className="inline-block rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs">
                        {item.icp_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-800">{item.icp_name}</div>
                      {item.description && (
                        <div className="mt-0.5 text-[11px] text-slate-400 max-w-md truncate">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.is_potential ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-[#059669]">
                          ✓ Có
                        </span>
                      ) : (
                        <span className="inline-block text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={item.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditGroupModal(item)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupSoftDelete(item)}
                          className={`rounded p-1 transition ${
                            item.is_active
                              ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                          title={item.is_active ? "Ngưng sử dụng" : "Mở lại"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2. QUY TẮC GÁN ICP TỰ ĐỘNG */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
          <div>
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              2. Quy tắc Gán ICP Tự động (ICP Mapping Rules)
            </h3>
            <p className="text-xs text-indigo-700/80">
              Quy định luật tự động chọn phân nhóm ICP khi người dùng chọn Kết quả cuộc gọi & Mức độ quan tâm trong Form Record.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateRuleModal}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Thêm quy tắc ICP mới
          </button>
        </div>

        {/* ICP Rules Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm">
          {config.loadingIcpRules ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải quy tắc gán ICP tự động...
            </div>
          ) : displayedRules.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Chưa có quy tắc nào. Bấm nút &quot;Thêm quy tắc ICP mới&quot; để tạo luật tự động.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-indigo-950 text-indigo-100 font-extrabold text-[11px] uppercase tracking-wider border-b border-indigo-900">
                <tr>
                  <th className="px-4 py-3 w-20 text-center">Ưu tiên</th>
                  <th className="px-4 py-3">Kết quả cuộc gọi</th>
                  <th className="px-4 py-3">Mức độ quan tâm</th>
                  <th className="px-4 py-3 font-black text-indigo-200">Gán Nhóm ICP</th>
                  <th className="px-4 py-3 w-28 text-center">Trạng thái</th>
                  <th className="px-4 py-3 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRules.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-indigo-50/50 transition-colors ${
                      !item.is_active ? "bg-slate-50/60 text-slate-400 opacity-75" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-800 font-black text-xs">
                        {item.priority ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.call_result_name ? (
                        <span className="inline-flex rounded bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-blue-700 font-bold">
                          {item.call_result_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">(Bất kỳ / Tất cả)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.interest_level_name ? (
                        <span className="inline-flex rounded bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-amber-700 font-bold">
                          {item.interest_level_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">(Bất kỳ / Không xét)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      {item.icp_group_code && item.icp_group_name ? (
                        <span className="inline-flex rounded bg-emerald-50 px-2.5 py-1 text-emerald-800 font-extrabold border border-emerald-200">
                          {item.icp_group_code} – {item.icp_group_name}
                        </span>
                      ) : (
                        item.icp_group
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={item.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditRuleModal(item)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title="Chỉnh sửa quy tắc"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRuleDelete(item)}
                          className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa quy tắc"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ICP Group Modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {groupModal.mode === "create" ? "Thêm Phân khúc ICP Mới" : "Chỉnh sửa Phân khúc ICP"}
              </h3>
              <button
                type="button"
                onClick={() => setGroupModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGroupSave} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Mã ICP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={icpCode}
                    onChange={(e) => setIcpCode(e.target.value)}
                    placeholder="Ví dụ: A, B, C..."
                    className="w-full rounded border border-slate-300 px-3 py-2 font-mono uppercase focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={groupSortOrder}
                    onChange={(e) => setGroupSortOrder(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Tên phân khúc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={icpName}
                  onChange={(e) => setIcpName(e.target.value)}
                  placeholder="Ví dụ: Rất tiềm năng, Nuôi dưỡng..."
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Ghi chú / Mô tả</label>
                <textarea
                  rows={3}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Mô tả về nhóm phân khúc này..."
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isPotential}
                    onChange={(e) => setIsPotential(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Là nhóm tiềm năng
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isGroupActive}
                    onChange={(e) => setIsGroupActive(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Đang hoạt động (Kích hoạt)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setGroupModal(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={config.saving}
                  className="rounded-md bg-[#10b981] px-4 py-2 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {config.saving
                    ? "Đang lưu..."
                    : groupModal.mode === "create"
                    ? "Tạo phân khúc"
                    : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ICP Rule Modal */}
      {ruleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {ruleModal.mode === "create" ? "Thêm Quy tắc Gán ICP Mới" : "Chỉnh sửa Quy tắc Gán ICP"}
              </h3>
              <button
                type="button"
                onClick={() => setRuleModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRuleSave} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  1. Kết quả cuộc gọi
                </label>
                <select
                  value={ruleCallResult}
                  onChange={(e) => setRuleCallResult(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">(Tất cả / Bất kỳ kết quả)</option>
                  {(config.callResults || []).map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.result_name} ({cr.result_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  2. Mức độ quan tâm
                </label>
                <select
                  value={ruleInterestLevel}
                  onChange={(e) => setRuleInterestLevel(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">(Tất cả / Không xét mức độ)</option>
                  {(config.interestLevels || []).map((il) => (
                    <option key={il.id} value={il.id}>
                      {il.level_name} ({il.level_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  3. Nhóm ICP được tự động chọn <span className="text-rose-500">*</span>
                </label>
                <select
                  value={ruleIcpGroup}
                  onChange={(e) => setRuleIcpGroup(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 font-bold text-emerald-800 focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">-- Chọn nhóm ICP --</option>
                  {(config.icpGroups || []).map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.icp_code} – {grp.icp_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Thứ tự ưu tiên</label>
                  <input
                    type="number"
                    min={1}
                    value={rulePriority}
                    onChange={(e) => setRulePriority(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isRuleActive}
                      onChange={(e) => setIsRuleActive(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Bật quy tắc này
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Ghi chú quy tắc</label>
                <input
                  type="text"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Ví dụ: Ưu tiên cuộc gọi trực tiếp..."
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRuleModal(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={config.saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {config.saving
                    ? "Đang lưu..."
                    : ruleModal.mode === "create"
                    ? "Tạo quy tắc"
                    : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
