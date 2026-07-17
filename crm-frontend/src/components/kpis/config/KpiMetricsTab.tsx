"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Edit, Eye, Plus, Trash2, X } from "lucide-react";

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
  if (unit === "PERCENT") return `${value}%`;
  if (unit === "COUNT") return `${value} ${getTargetUnitLabel(unit)}`;
  return value;
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
    .reduce((total, item) => total + toNumber(item.weight_percent), 0);
}

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            {description && (
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-82px)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-xs font-semibold text-slate-600">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function MetricStatusBadge({ active }: { active: boolean }) {
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
  const updateField = <K extends keyof MetricFormState>(
    key: K,
    value: MetricFormState[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <Modal
      title={title}
      description="KPI không dùng master. Mỗi KPI cần có mô tả và công thức đo lường CRM."
      onClose={onClose}
    >
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5">
          <FieldLabel required>Nhóm KPI</FieldLabel>
          <select
            value={form.groupId}
            disabled={!!selectedMetric}
            onChange={(event) => updateField("groupId", event.target.value)}
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400 disabled:bg-slate-50"
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
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400 disabled:bg-slate-50"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Chỉ nhập mã không dấu, ví dụ: B1_GOI_HANG_NGAY. Tên KPI nhập ở ô bên dưới.
          </p>
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel required>Tần suất</FieldLabel>
          <select
            value={form.frequency}
            onChange={(event) =>
              updateField("frequency", event.target.value as KpiFrequency)
            }
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
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
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Chỉ tiêu số</FieldLabel>
          <input
            value={form.targetValue}
            onChange={(event) => updateField("targetValue", event.target.value)}
            placeholder="VD: 100 / 95 / 30"
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel required>Đơn vị chỉ tiêu</FieldLabel>
          <select
            value={form.targetUnit}
            onChange={(event) =>
              updateField("targetUnit", event.target.value as KpiTargetUnit)
            }
            className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
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
            placeholder="VD: Đạt chỉ tiêu theo tháng"
            className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12">
          <FieldLabel>Mô tả công việc</FieldLabel>
          <textarea
            value={form.workDescription}
            onChange={(event) =>
              updateField("workDescription", event.target.value)
            }
            rows={3}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12">
          <FieldLabel required>Công thức / cách đo lường CRM</FieldLabel>
          <textarea
            value={form.measurementFormula}
            onChange={(event) =>
              updateField("measurementFormula", event.target.value)
            }
            rows={4}
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
            disabled={!config.canManage}
            className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
          >
            Lưu
          </button>
        </div>
      </div>
    </Modal>
  );
}

function GroupMetricTable({
  group,
  metrics,
  config,
  onAdd,
  onEdit,
  onDetail,
}: {
  group: KpiGroupItem;
  metrics: KpiPeriodMetricItem[];
  config: KpiConfigController;
  onAdd: (group: KpiGroupItem) => void;
  onEdit: (metric: KpiPeriodMetricItem) => void;
  onDetail: (metric: KpiPeriodMetricItem) => void;
}) {
  const activeTotal = getGroupMetricTotal(metrics);
  const groupWeight = toNumber(group.weight_percent);
  const isValid = activeTotal.toFixed(2) === groupWeight.toFixed(2);

  const deleteMetric = async (metric: KpiPeriodMetricItem) => {
    if (window.confirm(`Xóa KPI ${metric.metric_code}?`)) {
      await config.deleteMetric(metric);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div>
          <div className="text-sm font-semibold text-slate-800">
            {group.group_code} - {group.group_name}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {group.section_code ? `${group.section_code} · ` : ""}
            Loại nhóm: {group.group_type} · {metrics.length} KPI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Nhóm {group.weight_percent}%
          </span>
          <span
            className={[
              "rounded-md px-3 py-1 text-xs font-semibold",
              isValid
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700",
            ].join(" ")}
          >
            KPI active {activeTotal.toFixed(2)}%
          </span>
          {config.canManage && (
            <button
              type="button"
              onClick={() => onAdd(group)}
              className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
            >
              <Plus size={15} />
              Thêm KPI
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1480px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b bg-white text-slate-700">
              <th className="sticky left-0 z-20 w-[120px] bg-white px-3 font-semibold">
                Thao tác
              </th>
              <th className="w-[120px] px-3 font-semibold">Mã KPI</th>
              <th className="w-[260px] px-3 font-semibold">Tên KPI</th>
              {/* <th className="w-[260px] px-3 font-semibold">Mô tả</th> */}
              <th className="w-[300px] px-3 font-semibold">Công thức</th>
              <th className="w-[160px] px-3 font-semibold">Chỉ tiêu</th>
              <th className="w-[130px] px-3 font-semibold">Tần suất</th>
              <th className="w-[120px] px-3 font-semibold">Trọng số %</th>
              <th className="w-[110px] px-3 font-semibold">Trạng thái</th>
            </tr>
          </thead>

          <tbody>
            {metrics.length === 0 && (
              <tr>
                <td colSpan={9} className="h-20 text-center text-slate-500">
                  Nhóm này chưa có chỉ tiêu KPI.
                </td>
              </tr>
            )}

            {metrics.map((metric, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

              return (
                <tr
                  key={metric.id}
                  onDoubleClick={() => onDetail(metric)}
                  className={`h-14 cursor-pointer border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Xem"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDetail(metric);
                        }}
                        className="hover:text-sky-600"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        title="Sửa"
                        disabled={!config.canManage}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(metric);
                        }}
                        className="hover:text-sky-600 disabled:opacity-40"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        title="Xóa"
                        disabled={!config.canManage}
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteMetric(metric);
                        }}
                        className="hover:text-red-600 disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>

                  <td className="px-3 font-semibold text-sky-600">
                    {metric.metric_code}
                  </td>

                  <td className="px-3">
                    <span className="line-clamp-2 font-semibold text-slate-700">
                      {metric.metric_name || "-"}
                    </span>
                  </td>

                  {/* <td className="max-w-[260px] px-3">
                    <span className="line-clamp-2">
                      {metric.work_description || "-"}
                    </span>
                  </td> */}

                  <td className="max-w-[300px] px-3">
                    <span className="line-clamp-2">
                      {metric.measurement_formula || "-"}
                    </span>
                  </td>

                  <td className="px-3">
                    {formatTargetValue(metric.target_value, metric.target_unit) ||
                      metric.target_text ||
                      "-"}
                  </td>

                  <td className="px-3">
                    {getFrequencyLabel(metric.frequency)}
                  </td>

                  <td className="px-3">
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
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-xs outline-none focus:border-sky-400 disabled:bg-slate-50"
                    />
                  </td>

                  <td className="px-3">
                    <label className="mb-1 flex items-center gap-2 text-xs text-slate-700">
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
                      />
                      Active
                    </label>
                    <MetricStatusBadge active={metric.is_active} />
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

export function KpiMetricsTab({ config }: { config: KpiConfigController }) {
  const [modalMode, setModalMode] = useState<MetricModalMode>(null);
  const [form, setForm] = useState<MetricFormState>(emptyForm);
  const [selectedMetric, setSelectedMetric] =
    useState<KpiPeriodMetricItem | null>(null);

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
      // workDescription: metric.work_description || "",
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

  const submitAdd = async () => {
    const metricCode = normalizeKpiCode(form.metricCode);

    if (!form.groupId || !metricCode || !form.metricName.trim()) return;
    if (!form.measurementFormula.trim()) return;

    await config.addMetric({
      group: Number(form.groupId),
      metric_code: metricCode,
      metric_name: form.metricName.trim(),
      // work_description: form.workDescription || "",
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
      // work_description: form.workDescription || "",
      measurement_formula: form.measurementFormula.trim(),
      target_text: form.targetText || "",
      target_value: form.targetValue || null,
      target_unit: form.targetUnit,
      frequency: form.frequency,
    });

    closeModal();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Danh sách chỉ tiêu KPI theo nhóm
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Mỗi phần có nhiều nhóm KPI, mỗi nhóm có nhiều chỉ tiêu KPI.
          </p>
        </div>

        {config.canManage && (
          <button
            type="button"
            onClick={() => openAddModal()}
            className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]"
          >
            <Plus size={15} />
            Thêm KPI
          </button>
        )}
      </div>

      <div className="space-y-5">
        {groupedMetrics.map(({ section, groups }) => (
          <div key={section.id} className="space-y-3">
            <div className="flex h-10 items-center justify-between rounded-md border border-slate-200 bg-[#f8fafc] px-4">
              <div className="text-sm font-semibold text-slate-800">
                {section.section_code} - {section.section_name}
              </div>
              <div className="text-xs text-slate-500">
                Trọng số phần: <span className="font-semibold text-slate-700">{section.weight_percent}%</span>
              </div>
            </div>

            {groups.map(({ group, metrics }) => (
              <GroupMetricTable
                key={group.id}
                group={group}
                metrics={metrics}
                config={config}
                onAdd={openAddModal}
                onEdit={openEditModal}
                onDetail={openDetailModal}
              />
            ))}

            {groups.length === 0 && (
              <div className="rounded-md border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-sm">
                Phần này chưa có nhóm KPI.
              </div>
            )}
          </div>
        ))}

        {groupedMetrics.length === 0 && (
          <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Chưa có dữ liệu KPI trong bộ KPI này.
          </div>
        )}
      </div>

      {config.canManage && (
        <div className="text-xs text-slate-500">
          Trọng số và trạng thái active lưu bằng nút <b>Lưu trọng số</b>. Double-click dòng KPI để xem chi tiết.
        </div>
      )}

      {modalMode === "add" && (
        <MetricFormModal
          title="Thêm KPI vào nhóm"
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
