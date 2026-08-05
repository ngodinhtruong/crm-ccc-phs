"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Power, Trash2, X } from "lucide-react";
import { KpiConfigController } from "@/hooks/useKpiConfig";
import { SaIcpGroup } from "@/types/sale-admin.type";

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

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; item: SaIcpGroup }
  | null;

export function KpiIcpGroupsTab({ config }: { config: KpiConfigController }) {
  const [modal, setModal] = useState<ModalState>(null);
  const [showInactive, setShowInactive] = useState(true);

  // Form states
  const [icpCode, setIcpCode] = useState("");
  const [icpName, setIcpName] = useState("");
  const [description, setDescription] = useState("");
  const [isPotential, setIsPotential] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number | "">(1);

  const displayedGroups = useMemo(() => {
    let list = config.icpGroups || [];
    if (!showInactive) {
      list = list.filter((item) => item.is_active);
    }
    return [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id);
  }, [config.icpGroups, showInactive]);

  const openCreateModal = () => {
    setIcpCode("");
    setIcpName("");
    setDescription("");
    setIsPotential(true);
    setIsActive(true);
    setSortOrder((config.icpGroups?.length || 0) + 1);
    setModal({ mode: "create" });
  };

  const openEditModal = (item: SaIcpGroup) => {
    setIcpCode(item.icp_code || "");
    setIcpName(item.icp_name || "");
    setDescription(item.description || "");
    setIsPotential(Boolean(item.is_potential));
    setIsActive(Boolean(item.is_active));
    setSortOrder(item.sort_order ?? 1);
    setModal({ mode: "edit", item });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!icpCode.trim() || !icpName.trim()) {
      alert("Vui lòng nhập đầy đủ Mã ICP và Tên phân khúc!");
      return;
    }

    const payload: Partial<SaIcpGroup> = {
      icp_code: icpCode.trim().toUpperCase(),
      icp_name: icpName.trim(),
      description: description.trim() || null,
      is_potential: isPotential,
      is_active: isActive,
      sort_order: sortOrder !== "" ? Number(sortOrder) : 0,
    };

    try {
      if (modal?.mode === "create") {
        await config.createIcpGroup(payload);
      } else if (modal?.mode === "edit") {
        await config.updateIcpGroup(modal.item.id, payload);
      }
      setModal(null);
    } catch {
      // Error handled by hook notice/error
    }
  };

  const handleSoftDelete = async (item: SaIcpGroup) => {
    const confirmText = item.is_active
      ? `Bạn có chắc chắn muốn ngưng sử dụng phân khúc "${item.icp_code} - ${item.icp_name}"?\n(Các bản ghi cũ đã gán vẫn giữ nguyên dữ liệu)`
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

  return (
    <div className="space-y-4 p-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Danh mục Phân khúc Khách hàng (ICP)
          </h3>
          <p className="text-xs text-slate-500">
            Cấu hình các phân nhóm ICP hiển thị trên hệ thống (ví dụ: A - Rất tiềm năng, B - Tiềm năng, C - Nuôi dưỡng...)
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
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Thêm phân khúc ICP
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 w-16 text-center">Thứ tự</th>
                <th className="px-4 py-2.5 w-28">Mã ICP</th>
                <th className="px-4 py-2.5">Tên phân khúc</th>
                <th className="px-4 py-2.5 w-28 text-center">Tiềm năng</th>
                <th className="px-4 py-2.5 w-28 text-center">Trạng thái</th>
                <th className="px-4 py-2.5 w-28 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedGroups.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    !item.is_active ? "bg-slate-50/50 text-slate-400 opacity-75" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-center font-mono text-slate-500">
                    {item.sort_order ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {item.icp_code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.icp_name}</div>
                    {item.description && (
                      <div className="mt-0.5 text-[11px] text-slate-500 max-w-md truncate">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.is_potential ? (
                      <span className="inline-block text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="inline-block text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge active={item.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSoftDelete(item)}
                        className={`rounded p-1 ${
                          item.is_active
                            ? "text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={item.is_active ? "Ngưng sử dụng (Xóa mềm)" : "Mở lại"}
                      >
                        {item.is_active ? (
                          <Trash2 className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
              <h3 className="text-base font-bold text-slate-800">
                {modal.mode === "create"
                  ? "Thêm phân khúc ICP mới"
                  : `Chỉnh sửa phân khúc ICP: ${modal.item.icp_code}`}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
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
                  <label className="mb-1 block font-semibold text-slate-700">
                    Sắp xếp (Sort order)
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value ? Number(e.target.value) : "")}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Đang hoạt động (Kích hoạt)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModal(null)}
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
                    : modal.mode === "create"
                    ? "Tạo phân khúc"
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
