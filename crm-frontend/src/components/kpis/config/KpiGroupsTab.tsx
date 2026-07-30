"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Power, Save, Trash2 } from "lucide-react";

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

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      Tắt
    </span>
  );
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

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#059669]">{section.section_code}</span>
            <span className="text-sm font-semibold text-slate-800">
              {section.section_name}
            </span>
            <StatusBadge active={section.is_active} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {groups.length} nhóm · Tổng nhóm active {activeGroupTotal.toFixed(2)}% / phần {section.weight_percent}%
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={[
              "inline-flex rounded-md px-3 py-1 text-xs font-semibold",
              totalValid
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700",
            ].join(" ")}
          >
            {totalValid ? "Đủ trọng số" : "Lệch trọng số"}
          </span>

          {config.canManage && (
            <>
              <button
                type="button"
                onClick={() => config.saveSection(section)}
                className="flex h-8 items-center gap-1 rounded border border-emerald-300 bg-white px-3 text-xs font-semibold text-[#059669] hover:bg-emerald-50"
              >
                <Save size={15} />
                Lưu phần
              </button>

              <button
                type="button"
                onClick={deleteSection}
                className="flex h-8 items-center gap-1 rounded border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={15} />
                Xóa phần
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
        <div className="col-span-12 md:col-span-3">
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

        <div className="col-span-6 md:col-span-2">
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

        <div className="col-span-6 md:col-span-2">
          <FormLabel>Trạng thái phần</FormLabel>
          <label className="flex h-9 items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={section.is_active}
              disabled={!config.canManage}
              onChange={(event) =>
                config.setSectionField(section.id, "is_active", event.target.checked)
              }
            />
            Active
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
          <thead>
            <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
              <th className="sticky left-0 z-20 w-[130px] bg-slate-50 px-4 font-semibold">
                Thao tác
              </th>
              <th className="w-[120px] px-4 font-semibold">Mã nhóm</th>
              <th className="w-[300px] px-4 font-semibold">Tên nhóm</th>
              <th className="w-[140px] px-4 font-semibold">Loại</th>
              <th className="w-[140px] px-4 font-semibold">Trọng số %</th>
              <th className="w-[120px] px-4 font-semibold">Trạng thái</th>
              <th className="w-[120px] px-4 font-semibold">Số KPI</th>
            </tr>
          </thead>

          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={7} className="h-20 text-center text-slate-500">
                  Phần này chưa có nhóm KPI.
                </td>
              </tr>
            )}

            {groups.map((group, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";
              const metricCount = config.metricRows.filter((item) => item.group === group.id).length;

              return (
                <tr
                  key={group.id}
                  className={`h-[46px] border-b border-slate-200 ${rowBg} hover:bg-emerald-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Lưu nhóm"
                        disabled={!config.canManage}
                        onClick={() => config.saveGroup(group)}
                        className="hover:text-[#059669] disabled:opacity-40"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        title="Tắt nhóm"
                        disabled={!config.canManage}
                        onClick={() => config.markGroupInactive(group.id)}
                        className="hover:text-amber-600 disabled:opacity-40"
                      >
                        <Power size={15} />
                      </button>

                      <button
                        type="button"
                        title="Xóa nhóm"
                        disabled={!config.canManage}
                        onClick={() => deleteGroup(group)}
                        className="hover:text-red-600 disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 font-semibold text-[#059669]">
                    {group.group_code}
                  </td>

                  <td className="px-4 text-slate-700">
                    <input
                      value={group.group_name}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(group.id, "group_name", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50"
                    />
                  </td>

                  <td className="px-4 text-slate-700">
                    <select
                      value={group.group_type}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(
                          group.id,
                          "group_type",
                          event.target.value as KpiGroupType
                        )
                      }
                      className="h-8 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50"
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="AUTO">AUTO</option>
                      <option value="MIXED">MIXED</option>
                    </select>
                    
                  </td>

                  <td className="px-4 text-slate-700">
                    <input
                      value={group.weight_percent}
                      disabled={!config.canManage}
                      onChange={(event) =>
                        config.setGroupField(group.id, "weight_percent", event.target.value)
                      }
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50"
                    />
                  </td>

                  <td className="px-4 text-slate-700">
                    <label className="mb-1 flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={group.is_active}
                        disabled={!config.canManage}
                        onChange={(event) =>
                          config.setGroupField(group.id, "is_active", event.target.checked)
                        }
                      />
                      Active
                    </label>
                    {/* <StatusBadge active={group.is_active} /> */}
                  </td>

                  <td className="px-4 font-medium text-slate-700">
                    {metricCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KpiGroupsTab({ config }: { config: KpiConfigController }) {
  const [sectionCode, setSectionCode] = useState("");
  const [sectionName, setSectionName] = useState("");

  const [groupSectionId, setGroupSectionId] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<KpiGroupType>("MANUAL");

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
  };

  const addGroup = async () => {
    const targetSectionId = groupSectionId || String(config.sectionRows[0]?.id || "");
    const normalizedGroupCode = normalizeKpiCode(groupCode);

    if (!targetSectionId || !normalizedGroupCode || !groupName.trim()) return;

    await config.addGroup({
      section: Number(targetSectionId),
      group_code: normalizedGroupCode,
      group_name: groupName.trim(),
      group_type: groupType,
      sort_order: config.groupRows.length + 1,
    });

    setGroupSectionId("");
    setGroupCode("");
    setGroupName("");
    setGroupType("MANUAL");
  };

  return (
    <div className="space-y-4 p-4">
      {config.canManage && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Thêm phần KPI
            </div>

            <div className="grid grid-cols-12 gap-2">
              <input
                value={sectionCode}
                onChange={(event) => setSectionCode(event.target.value)}
                onBlur={() => setSectionCode(normalizeKpiCode(sectionCode))}
                placeholder="Mã phần, VD: A"
                className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 md:col-span-3"
              />
              <input
                value={sectionName}
                onChange={(event) => setSectionName(event.target.value)}
                placeholder="Tên phần KPI"
                className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 md:col-span-6"
              />
              <button
                type="button"
                onClick={addSection}
                className="col-span-12 flex h-9 items-center justify-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669] md:col-span-3"
              >
                <Plus size={15} />
                Thêm phần
              </button>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Thêm nhóm KPI
            </div>

            <div className="grid grid-cols-12 gap-2">
              <select
                value={groupSectionId}
                onChange={(event) => setGroupSectionId(event.target.value)}
                className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 md:col-span-3"
              >
                <option value="">Chọn phần</option>
                {config.sectionRows.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.section_code} - {item.section_name}
                  </option>
                ))}
              </select>

              <input
                value={groupCode}
                onChange={(event) => setGroupCode(event.target.value)}
                onBlur={() => setGroupCode(normalizeKpiCode(groupCode))}
                placeholder="Mã nhóm"
                className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 md:col-span-2"
              />

              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Tên nhóm KPI"
                className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 md:col-span-3"
              />

              <select
                value={groupType}
                onChange={(event) => setGroupType(event.target.value as KpiGroupType)}
                className="col-span-12 h-9 rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 md:col-span-2"
              >
                <option value="MANUAL">MANUAL</option>
                <option value="AUTO">AUTO</option>
                <option value="MIXED">MIXED</option>
              </select>

              <button
                type="button"
                onClick={addGroup}
                className="col-span-12 flex h-9 items-center justify-center gap-1 rounded bg-[#10b981] px-3 text-xs font-semibold text-white hover:bg-[#059669] md:col-span-2"
              >
                <Plus size={15} />
                Thêm nhóm
              </button>
            </div>
          </div>
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
