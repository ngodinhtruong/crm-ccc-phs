"use client";

import {
  Fragment,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Edit, Eye, Plus, Trash2 } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";
import {
  KpiFrequency,
  KpiGroupItem,
  KpiPeriodMetricItem,
  KpiTargetUnit,
} from "@/types/kpi.type";
import { KpiMetricDetailModal } from "./KpiMetricDetailModal";

type MetricModalMode = "add" | "edit" | "detail" | null;

type MetricFormState = {
  groupId: string;
  metricCode: string;
  metricName: string;
  workDescription: string;
  measurementFormula: string;
  targetText: string;
  targetValue: string;
  targetUnit: KpiTargetUnit;
  frequency: KpiFrequency;
};

const emptyForm: MetricFormState = {
  groupId: "",
  metricCode: "",
  metricName: "",
  workDescription: "",
  measurementFormula: "",
  targetText: "",
  targetValue: "",
  targetUnit: "COUNT",
  frequency: "MONTHLY",
};

const KPI_FREQUENCY_OPTIONS: { value: KpiFrequency; label: string }[] = [
  { value: "DAILY", label: "Ngày" },
  { value: "WEEKLY", label: "Tuần" },
  { value: "MONTHLY", label: "Tháng" },
  { value: "QUARTERLY", label: "Quý (3 tháng)" },
  { value: "HALF_YEARLY", label: "6 tháng" },
  { value: "YEARLY", label: "Năm" },
  { value: "ON_EVENT", label: "Khi phát sinh" },
];

const KPI_TARGET_UNIT_OPTIONS: { value: KpiTargetUnit; label: string }[] = [
  { value: "COUNT", label: "Số lượng" },
  { value: "PERCENT", label: "%" },
];

function getFrequencyLabel(value?: string | null) {
  return KPI_FREQUENCY_OPTIONS.find((item) => item.value === value)?.label || "-";
}

function getTargetUnitLabel(value?: string | null) {
  return KPI_TARGET_UNIT_OPTIONS.find((item) => item.value === value)?.label || "-";
}

function normalizeFrequency(value?: string | null): KpiFrequency {
  const matched = KPI_FREQUENCY_OPTIONS.find((item) => item.value === value);
  return matched?.value || "MONTHLY";
}

function normalizeTargetUnit(value?: string | null): KpiTargetUnit {
  const matched = KPI_TARGET_UNIT_OPTIONS.find((item) => item.value === value);
  return matched?.value || "COUNT";
}

function formatTargetValue(value?: string | null, unit?: string | null) {
  if (!value) return "";
  const parsed = Number(value);
  const cleaned = Number.isNaN(parsed) ? value : parsed.toString();
  if (unit === "PERCENT") return `${cleaned}%`;
  if (unit === "COUNT") return `${cleaned} ${getTargetUnitLabel(unit)}`;
  return cleaned;
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

function toNumber(value?: string | number | null) {
  const parsed = Number(value || 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getGroupMetricTotal(metrics: KpiPeriodMetricItem[]) {
  return metrics
    .filter((item) => item.is_active)
    .reduce((acc, current) => acc + toNumber(current.weight_percent), 0);
}

function MetricStatusBadge({ active }: { active?: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
      Tắt
    </span>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-xs font-semibold text-slate-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function MetricFormModal({
  title,
  config,
  form,
  setForm,
  selectedMetric,
  onClose,
  onSubmit,
}: {
  title: string;
  config: KpiConfigController;
  form: MetricFormState;
  setForm: Dispatch<SetStateAction<MetricFormState>>;
  selectedMetric: KpiPeriodMetricItem | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const updateField = (
    key: keyof MetricFormState,
    value: string | KpiTargetUnit | KpiFrequency
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <Modal
      title={title}
      description="Mỗi KPI cần có mô tả và công thức đo lường CRM."
      onClose={onClose}
    >
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5">
          <FieldLabel required>Nhóm KPI</FieldLabel>
          <select
            value={form.groupId}
            disabled={!!selectedMetric}
            onChange={(event) => updateField("groupId", event.target.value)}
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50"
          >
            <option value="">Chọn nhóm KPI</option>
            {config.groupRows.map((item) => (
              <option key={item.id} value={item.id}>
                {item.section_code ? `${item.section_code} / ` : ""}
                {item.group_code} - {item.group_name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-3">
          <FieldLabel required>Mã KPI</FieldLabel>
          <input
            value={form.metricCode}
            disabled={!!selectedMetric}
            onChange={(event) => updateField("metricCode", event.target.value)}
            onBlur={() =>
              updateField("metricCode", normalizeKpiCode(form.metricCode))
            }
            placeholder="VD: A1_01"
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel required>Tần suất</FieldLabel>
          <select
            value={form.frequency}
            onChange={(event) =>
              updateField("frequency", event.target.value as KpiFrequency)
            }
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
          >
            {KPI_FREQUENCY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12">
          <FieldLabel required>Tên KPI</FieldLabel>
          <input
            value={form.metricName}
            onChange={(event) => updateField("metricName", event.target.value)}
            placeholder="Tên chỉ tiêu KPI"
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Chỉ tiêu số</FieldLabel>
          <input
            value={form.targetValue}
            onChange={(event) => updateField("targetValue", event.target.value)}
            placeholder="VD: 100"
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel required>Đơn vị</FieldLabel>
          <select
            value={form.targetUnit}
            onChange={(event) =>
              updateField("targetUnit", event.target.value as KpiTargetUnit)
            }
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
          >
            {KPI_TARGET_UNIT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Mục tiêu nghiệp vụ</FieldLabel>
          <input
            value={form.targetText}
            onChange={(event) => updateField("targetText", event.target.value)}
            placeholder="VD: Đạt chỉ tiêu"
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12">
          <FieldLabel required>Công thức / cách đo lường CRM</FieldLabel>
          <textarea
            value={form.measurementFormula}
            onChange={(event) =>
              updateField("measurementFormula", event.target.value)
            }
            rows={3}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 flex justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded border border-slate-300 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="h-9 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669]"
          >
            Lưu
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function KpiMetricsTab({ config }: { config: KpiConfigController }) {
  const [modalMode, setModalMode] = useState<MetricModalMode>(null);
  const [form, setForm] = useState<MetricFormState>(emptyForm);
  const [selectedMetric, setSelectedMetric] =
    useState<KpiPeriodMetricItem | null>(null);
  const [activeSectionTab, setActiveSectionTab] = useState<"A" | "B">("A");

  const groupedMetrics = useMemo(() => {
    return config.sectionRows.map((section) => {
      const groups = config.groupRows.filter((group) => group.section === section.id);

      return {
        section,
        groups: groups.map((group) => ({
          group,
          metrics: config.metricRows.filter((metric) => metric.group === group.id),
        })),
      };
    });
  }, [config.sectionRows, config.groupRows, config.metricRows]);

  const filteredGroupedMetrics = useMemo(() => {
    if (groupedMetrics.length <= 1) return groupedMetrics;

    return groupedMetrics.filter(({ section }, idx) => {
      const code = String(section.section_code || "").trim().toUpperCase();
      if (activeSectionTab === "A") {
        return code === "A" || code.startsWith("A") || code.includes("PART_A") || idx === 0;
      }
      return code === "B" || code.startsWith("B") || code.includes("PART_B") || idx === 1;
    });
  }, [groupedMetrics, activeSectionTab]);

  const openAddModal = (group?: KpiGroupItem) => {
    const defaultGroup = group || config.groupRows[0];
    setSelectedMetric(null);
    setForm({
      ...emptyForm,
      groupId: defaultGroup ? String(defaultGroup.id) : "",
    });
    setModalMode("add");
  };

  const openEditModal = (metric: KpiPeriodMetricItem) => {
    setSelectedMetric(metric);
    setForm({
      groupId: String(metric.group),
      metricCode: metric.metric_code || "",
      metricName: metric.metric_name || "",
      workDescription: "",
      measurementFormula: metric.measurement_formula || "",
      targetText: metric.target_text || "",
      targetValue: metric.target_value || "",
      targetUnit: normalizeTargetUnit(metric.target_unit),
      frequency: normalizeFrequency(metric.frequency),
    });
    setModalMode("edit");
  };

  const openDetailModal = (metric: KpiPeriodMetricItem) => {
    setSelectedMetric(metric);
    setModalMode("detail");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedMetric(null);
    setForm(emptyForm);
  };

  const deleteMetric = async (metric: KpiPeriodMetricItem) => {
    if (window.confirm(`Xóa KPI ${metric.metric_code}?`)) {
      await config.deleteMetric(metric);
    }
  };

  const submitAdd = async () => {
    const metricCode = normalizeKpiCode(form.metricCode);
    if (!form.groupId || !metricCode || !form.metricName.trim()) return;
    if (!form.measurementFormula.trim()) return;

    await config.addMetric({
      group: Number(form.groupId),
      metric_code: metricCode,
      metric_name: form.metricName.trim(),
      measurement_formula: form.measurementFormula.trim(),
      target_text: form.targetText || "",
      target_value: form.targetValue || null,
      target_unit: form.targetUnit,
      frequency: form.frequency,
    });
    closeModal();
  };

  const submitEdit = async () => {
    if (!selectedMetric) return;
    if (!form.metricName.trim() || !form.measurementFormula.trim()) return;

    await config.saveMetric({
      ...selectedMetric,
      metric_name: form.metricName.trim(),
      measurement_formula: form.measurementFormula.trim(),
      target_text: form.targetText || "",
      target_value: form.targetValue || null,
      target_unit: form.targetUnit,
      frequency: form.frequency,
    });
    closeModal();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSectionTab("A")}
            className={[
              "rounded-md px-3.5 py-1.5 text-xs font-bold transition-all",
              activeSectionTab === "A"
                ? "bg-white text-[#059669] shadow-xs ring-1 ring-emerald-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
            ].join(" ")}
          >
            Bảng A - Định tính / Tự đánh giá
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab("B")}
            className={[
              "rounded-md px-3.5 py-1.5 text-xs font-bold transition-all",
              activeSectionTab === "B"
                ? "bg-white text-[#059669] shadow-xs ring-1 ring-emerald-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
            ].join(" ")}
          >
            Bảng B - Định lượng / Tự động
          </button>
        </div>

        {config.canManage && (
          <button
            type="button"
            onClick={() => openAddModal()}
            className="flex h-8 items-center gap-1 rounded bg-[#10b981] px-3 text-xs font-bold text-white shadow-sm hover:bg-[#059669]"
          >
            <Plus size={14} />
            Thêm KPI
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="h-9 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="w-[100px] px-3">Mã KPI</th>
              <th className="px-3">Tên chỉ tiêu</th>
              <th className="w-[140px] px-3">Chỉ tiêu</th>
              <th className="w-[100px] px-3 text-center">Trọng số (%)</th>
              <th className="w-[100px] px-3 text-center">Trạng thái</th>
              <th className="w-[85px] px-3 text-center">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredGroupedMetrics.map(({ section, groups }) =>
              groups.map(({ group, metrics }) => {
                const activeTotal = getGroupMetricTotal(metrics);
                const groupWeight = toNumber(group.weight_percent);
                const isValid = activeTotal.toFixed(2) === groupWeight.toFixed(2);

                return (
                  <Fragment key={group.id}>
                    <tr className="h-9 border-t border-b border-slate-200 bg-slate-100/70 text-xs font-bold text-slate-800">
                      <td colSpan={6} className="px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-[#059669] px-2 py-0.5 text-[11px] font-extrabold text-white">
                              {group.group_code}
                            </span>
                            <span className="text-slate-800 font-bold">{group.group_name}</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              ({metrics.length} chỉ tiêu)
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]">
                            {config.canManage && (
                              <button
                                type="button"
                                onClick={() => openAddModal(group)}
                                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >
                                <Plus size={12} />
                                Thêm KPI
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {metrics.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="h-9 text-center text-xs italic text-slate-400">
                          Nhóm chưa có chỉ tiêu KPI.
                        </td>
                      </tr>
                    ) : (
                      metrics.map((metric, index) => {
                        const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/40";

                        return (
                          <tr
                            key={metric.id}
                            onDoubleClick={() => openDetailModal(metric)}
                            className={`h-10 cursor-pointer ${rowBg} hover:bg-emerald-50/50 transition-colors`}
                          >
                            <td className="px-3 font-bold text-[#059669]">
                              {metric.metric_code}
                            </td>
                            <td className="px-3 font-medium text-slate-800">
                              {metric.metric_name || "-"}
                            </td>
                            <td className="px-3 font-semibold text-slate-700">
                              {formatTargetValue(metric.target_value, metric.target_unit) ||
                                metric.target_text ||
                                "-"}
                            </td>
                            <td className="px-3 text-center">
                              <input
                                value={metric.weight_percent}
                                disabled={!config.canManage}
                                onChange={(event) =>
                                  config.setMetricField(
                                    metric.id,
                                    "weight_percent",
                                    event.target.value
                                  )
                                }
                                className="h-7 w-16 rounded border border-slate-200 bg-white text-center text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                              />
                            </td>
                            <td className="px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={metric.is_active}
                                  disabled={!config.canManage}
                                  onChange={(event) =>
                                    config.setMetricField(
                                      metric.id,
                                      "is_active",
                                      event.target.checked
                                    )
                                  }
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                                />
                                <MetricStatusBadge active={metric.is_active} />
                              </div>
                            </td>
                            <td className="px-3 text-center">
                              <div className="flex items-center justify-center gap-2 text-slate-400">
                                <button
                                  type="button"
                                  title="Xem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetailModal(metric);
                                  }}
                                  className="hover:text-emerald-600"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Sửa"
                                  disabled={!config.canManage}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(metric);
                                  }}
                                  className="hover:text-emerald-600 disabled:opacity-40"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Xóa"
                                  disabled={!config.canManage}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void deleteMetric(metric);
                                  }}
                                  className="hover:text-red-600 disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}

                    <tr className="h-9 border-t border-b border-slate-200 bg-slate-100/70 text-xs font-bold text-slate-700">
                      <td className="px-3 text-center">Tổng nhóm:</td>
                      <td colSpan={2} className="px-3 text-slate-800 font-bold">
                        {metrics.length} chỉ tiêu
                      </td>
                      <td className="px-3 text-center font-extrabold">
                        <span className={isValid ? "text-[#059669] font-extrabold" : "text-red-600 font-extrabold"}>
                          {activeTotal.toFixed(2)}%
                        </span>
                        <span className="text-[#059669] font-extrabold"> / {groupWeight.toFixed(2)}%</span>
                      </td>
                      <td className="px-3 text-center text-slate-400">-</td>
                      <td className="px-3 text-center text-slate-400">-</td>
                    </tr>
                  </Fragment>
                );
              })
            )}

            {filteredGroupedMetrics.length === 0 && (
              <tr>
                <td colSpan={6} className="h-16 text-center text-slate-400 text-xs italic">
                  Chưa có dữ liệu KPI trong {activeSectionTab === "A" ? "Bảng A" : "Bảng B"}.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot className="border-t border-slate-200 bg-slate-100/80 text-xs font-bold text-slate-700">
            {(() => {
              const sectionTotalActive = filteredGroupedMetrics.reduce(
                (acc, { groups }) => acc + groups.reduce((gAcc, { metrics }) => gAcc + getGroupMetricTotal(metrics), 0),
                0
              );
              const sectionTotalExpected = filteredGroupedMetrics.reduce(
                (acc, { groups }) => acc + groups.reduce((gAcc, { group }) => gAcc + toNumber(group.weight_percent), 0),
                0
              );
              const isSectionValid = sectionTotalActive.toFixed(2) === sectionTotalExpected.toFixed(2);
              const totalMetricsCount = filteredGroupedMetrics.reduce(
                (acc, { groups }) => acc + groups.reduce((gAcc, { metrics }) => gAcc + metrics.length, 0),
                0
              );

              return (
                <tr className="h-9">
                  <td className="px-3 text-center">Tổng:</td>
                  <td colSpan={2} className="px-3 text-slate-800 font-bold">
                    {totalMetricsCount} chỉ tiêu
                  </td>
                  <td className="px-3 text-center font-extrabold">
                    <span className={isSectionValid ? "text-[#059669] font-extrabold" : "text-red-600 font-extrabold"}>
                      {sectionTotalActive.toFixed(2)}%
                    </span>
                    <span className="text-[#059669] font-extrabold"> / {sectionTotalExpected.toFixed(2)}%</span>
                  </td>
                  <td className="px-3 text-center text-slate-400">-</td>
                  <td className="px-3 text-center text-slate-400">-</td>
                </tr>
              );
            })()}
          </tfoot>
        </table>
      </div>

      {config.canManage && (
        <div className="text-xs text-slate-500">
          Trọng số và trạng thái active được lưu bằng nút <b>Lưu trọng số</b> trên thanh công cụ. Nhấp đúp dòng KPI để xem chi tiết.
        </div>
      )}

      {modalMode === "add" && (
        <MetricFormModal
          title="Thêm KPI"
          config={config}
          form={form}
          setForm={setForm}
          selectedMetric={null}
          onClose={closeModal}
          onSubmit={submitAdd}
        />
      )}

      {modalMode === "edit" && selectedMetric && (
        <MetricFormModal
          title="Chỉnh sửa KPI"
          config={config}
          form={form}
          setForm={setForm}
          selectedMetric={selectedMetric}
          onClose={closeModal}
          onSubmit={submitEdit}
        />
      )}

      {modalMode === "detail" && selectedMetric && (
        <KpiMetricDetailModal metric={selectedMetric} onClose={closeModal} />
      )}
    </div>
  );
}
