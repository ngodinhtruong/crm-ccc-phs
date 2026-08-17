import { useMemo, useState } from "react";
import { Check, Edit, Plus, Power, Save, Trash2, X } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";
import { KpiGroupItem, KpiGroupType, KpiSectionItem } from "@/types/kpi.type";

function toNumber(value?: string | number | null) {
  const parsed = Number(value || 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeKpiCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}



function FormLabel({ children }: { children: string }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-slate-600">
      {children}
    </label>
  );
}

function SectionBlock({
  section,
  groups,
  config,
}: {
  section: KpiSectionItem;
  groups: KpiGroupItem[];
  config: KpiConfigController;
}) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupCode, setNewGroupCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupWeight, setNewGroupWeight] = useState("0.00");

  const activeGroupTotal = groups
    .filter((item) => item.is_active)
    .reduce((sum, item) => sum + toNumber(item.weight_percent), 0);

  const sectionWeight = toNumber(section.weight_percent);
  const totalValid = activeGroupTotal.toFixed(2) === sectionWeight.toFixed(2);

  const deleteSection = async () => {
    if (groups.length > 0) {
      window.alert("Phần này đang có nhóm KPI. Hãy xóa nhóm trước khi xóa phần.");
      return;
    }

    if (window.confirm(`Xóa phần ${section.section_code}?`)) {
      await config.deleteSection(section);
    }
  };

  const deleteGroup = async (group: KpiGroupItem) => {
    const metricCount = config.metricRows.filter((item) => item.group === group.id).length;
    const message = metricCount > 0
      ? `Nhóm ${group.group_code} đang có ${metricCount} KPI. Bạn vẫn muốn xóa?`
      : `Xóa nhóm ${group.group_code}?`;

    if (window.confirm(message)) {
      await config.deleteGroup(group);
    }
  };

  const handleSaveNewGroup = async () => {
    const normalizedCode = normalizeKpiCode(newGroupCode);
    if (!normalizedCode || !newGroupName.trim()) return;

    const computedGroupType: KpiGroupType =
      section.section_code.toUpperCase().includes("B") ? "AUTO" : "MANUAL";

    await config.addGroup({
      section: section.id,
      group_code: normalizedCode,
      group_name: newGroupName.trim(),
      group_type: computedGroupType,
      sort_order: groups.length + 1,
    });

    setAddingGroup(false);
    setNewGroupCode("");
    setNewGroupName("");
    setNewGroupWeight("0.00");
  };

  const handleCancelNewGroup = () => {
    setAddingGroup(false);
    setNewGroupCode("");
    setNewGroupName("");
    setNewGroupWeight("0.00");
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#059669]">{section.section_code}</span>
            <span className="text-sm font-semibold text-slate-800">
              {section.section_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.canManage && (
            <>
              <button
                type="button"
                onClick={() => setAddingGroup(true)}
                className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#059669]"
              >
                <Plus size={14} />
                Thêm nhóm
              </button>

              <button
                type="button"
                title="Lưu phần"
                onClick={() => config.saveSection(section)}
                className="flex h-8 w-8 items-center justify-center rounded border border-emerald-300 bg-white text-[#059669] hover:bg-emerald-50 transition-colors"
              >
                <Save size={15} />
              </button>

              <button
                type="button"
                title="Xóa phần"
                onClick={deleteSection}
                className="flex h-8 w-8 items-center justify-center rounded border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
        <div className="col-span-12 md:col-span-4">
          <FormLabel>Tên phần</FormLabel>
          <input
            value={section.section_name}
            disabled={!config.canManage}
            onChange={(event) =>
              config.setSectionField(section.id, "section_name", event.target.value)
            }
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
        </div>

        <div className="col-span-6 md:col-span-3">
          <FormLabel>Trọng số phần %</FormLabel>
          <input
            value={section.weight_percent}
            disabled={!config.canManage}
            onChange={(event) =>
              config.setSectionField(section.id, "weight_percent", event.target.value)
            }
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="h-9 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="w-[100px] px-3 text-center">Thao tác</th>
              <th className="w-[110px] px-3">Mã nhóm</th>
              <th className="px-3">Tên nhóm KPI</th>
              <th className="w-[120px] px-3 text-center">Trọng số (%)</th>
              <th className="w-[100px] px-3 text-center">Trạng thái</th>
              <th className="w-[80px] px-3 text-center">Số KPI</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {groups.length === 0 && !addingGroup && (
              <tr>
                <td colSpan={6} className="h-12 text-center text-xs italic text-slate-400">
                  Phần này chưa có nhóm KPI.
                </td>
              </tr>
            )}

            {groups.map((group, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/40";
              const metricCount = config.metricRows.filter((item) => item.group === group.id).length;

              return (
                <tr
                  key={group.id}
                  className={`h-10 border-b border-slate-100 ${rowBg} hover:bg-emerald-50/50 transition-colors`}
                >
                  <td className="px-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <button
                        type="button"
                        title="Lưu nhóm"
                        disabled={!config.canManage}
                        onClick={() => config.saveGroup(group)}
                        className="hover:text-emerald-600 disabled:opacity-40"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        type="button"
                        title="Tắt nhóm"
                        disabled={!config.canManage}
                        onClick={() => config.markGroupInactive(group.id)}
                        className="hover:text-amber-600 disabled:opacity-40"
                      >
                        <Power size={14} />
                      </button>

                      <button
                        type="button"
                        title="Xóa nhóm"
                        disabled={!config.canManage}
                        onClick={() => deleteGroup(group)}
                        className="hover:text-red-600 disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>

                  <td className="px-3 font-bold text-[#059669]">
                    {group.group_code}
                  </td>

                  <td className="px-3">
                    <input
                      value={group.group_name}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(group.id, "group_name", event.target.value)
                      }
                      className="h-7 w-full rounded border border-slate-200 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                    />
                  </td>

                  <td className="px-3 text-center">
                    <input
                      value={group.weight_percent}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(group.id, "weight_percent", event.target.value)
                      }
                      className="h-7 w-20 rounded border border-slate-200 bg-white text-center text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                    />
                  </td>

                  <td className="px-3 text-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={group.is_active}
                        disabled={!config.canManage}
                        onChange={(event) =>
                          config.setGroupField(group.id, "is_active", event.target.checked)
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                      />
                      <span className={group.is_active ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {group.is_active ? "Active" : "Tắt"}
                      </span>
                    </label>
                  </td>

                  <td className="px-3 text-center font-bold text-slate-700">
                    {metricCount}
                  </td>
                </tr>
              );
            })}

            {/* Inline add group row */}
            {addingGroup && (
              <tr className="h-10 border-b border-[#10b981] bg-emerald-50/60 transition-colors">
                <td className="px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      title="Lưu nhóm"
                      onClick={handleSaveNewGroup}
                      className="flex h-6 w-6 items-center justify-center rounded bg-[#10b981] text-white hover:bg-[#059669] shadow-xs"
                    >
                      <Check size={14} />
                    </button>

                    <button
                      type="button"
                      title="Hủy"
                      onClick={handleCancelNewGroup}
                      className="flex h-6 w-6 items-center justify-center rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </td>

                <td className="px-3">
                  <input
                    value={newGroupCode}
                    autoFocus
                    onChange={(e) => setNewGroupCode(e.target.value)}
                    onBlur={() => setNewGroupCode(normalizeKpiCode(newGroupCode))}
                    placeholder="Mã nhóm"
                    className="h-7 w-20 rounded border border-emerald-400 bg-white px-2 text-xs font-bold text-[#059669] outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </td>

                <td className="px-3">
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNewGroup();
                      if (e.key === "Escape") handleCancelNewGroup();
                    }}
                    placeholder="Nhập tên nhóm KPI mới..."
                    className="h-7 w-full rounded border border-emerald-400 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </td>

                <td className="px-3 text-center">
                  <input
                    value={newGroupWeight}
                    onChange={(e) => setNewGroupWeight(e.target.value)}
                    placeholder="0.00"
                    className="h-7 w-20 rounded border border-slate-200 bg-white text-center text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </td>

                <td className="px-3 text-center font-bold text-emerald-700 text-xs">
                  Active
                </td>

                <td className="px-3 text-center font-bold text-slate-400 text-xs">
                  0
                </td>
              </tr>
            )}
          </tbody>

          <tfoot className="border-t border-slate-200 bg-slate-100/70 text-xs font-bold text-slate-700">
            <tr className="h-9">
              <td className="px-3 text-center">
                Tổng:
              </td>
              <td colSpan={2} className="px-3 text-slate-800 font-bold">
                {groups.length} nhóm
              </td>
              <td className="px-3 text-center font-extrabold text-[#059669]">
                {activeGroupTotal.toFixed(2)}% / {section.weight_percent}%
              </td>
              <td className="px-3 text-center text-slate-400">
                -
              </td>
              <td className="px-3 text-center font-bold text-slate-800">
                {config.metricRows.filter((m) => groups.some((g) => g.id === m.group)).length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function KpiGroupsTab({ config }: { config: KpiConfigController }) {
  const [showAddSection, setShowAddSection] = useState(false);
  const [sectionCode, setSectionCode] = useState("");
  const [sectionName, setSectionName] = useState("");

  const sectionsWithGroups = useMemo(() => {
    return config.sectionRows.map((section) => ({
      section,
      groups: config.groupRows.filter((group) => group.section === section.id),
    }));
  }, [config.sectionRows, config.groupRows]);

  const addSection = async () => {
    const normalizedSectionCode = normalizeKpiCode(sectionCode);

    if (!normalizedSectionCode || !sectionName.trim()) return;

    await config.addSection({
      section_code: normalizedSectionCode,
      section_name: sectionName.trim(),
      sort_order: config.sectionRows.length + 1,
    });

    setSectionCode("");
    setSectionName("");
    setShowAddSection(false);
  };

  return (
    <div className="space-y-4 p-4">
      {config.canManage && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="text-xs font-bold text-slate-700">
            Danh sách phần & nhóm KPI ({config.sectionRows.length} phần)
          </div>

          {!showAddSection ? (
            <button
              type="button"
              onClick={() => setShowAddSection(true)}
              className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#059669] transition-all"
            >
              <Plus size={14} />
              Thêm phần KPI
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/50 p-1.5 shadow-xs">
              <input
                value={sectionCode}
                autoFocus
                onChange={(event) => setSectionCode(event.target.value)}
                onBlur={() => setSectionCode(normalizeKpiCode(sectionCode))}
                placeholder="Mã phần (VD: C)"
                className="h-7 w-28 rounded border border-slate-300 bg-white px-2 text-xs font-bold text-[#059669] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <input
                value={sectionName}
                onChange={(event) => setSectionName(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addSection();
                  if (e.key === "Escape") setShowAddSection(false);
                }}
                placeholder="Nhập tên phần KPI mới..."
                className="h-7 w-64 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => void addSection()}
                className="flex h-7 items-center gap-1 rounded bg-[#10b981] px-2.5 text-xs font-bold text-white hover:bg-[#059669]"
              >
                <Check size={14} />
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setShowAddSection(false)}
                className="flex h-7 w-7 items-center justify-center rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {sectionsWithGroups.map(({ section, groups }) => (
          <SectionBlock
            key={section.id}
            section={section}
            groups={groups}
            config={config}
          />
        ))}

        {sectionsWithGroups.length === 0 && (
          <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Chưa có phần KPI trong bộ KPI này.
          </div>
        )}
      </div>

      {config.canManage && (
        <div className="text-xs text-slate-500">
          Thay đổi trọng số hoặc active cần bấm <b>Lưu trọng số</b>. Sửa tên/loại nhóm thì bấm biểu tượng lưu ở từng dòng.
        </div>
      )}
    </div>
  );
}
