"use client";

import { useEffect, useState } from "react";
import { Edit, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { KpiConfigController } from "@/hooks/useKpiConfig";
import { KpiConfigModal, ModalField } from "./KpiConfigModal";

type PeriodModalMode = "create" | "edit" | null;

export function KpiPeriodHeader({ config }: { config: KpiConfigController }) {
  const now = new Date();

  const [modalMode, setModalMode] = useState<PeriodModalMode>(null);

  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [activate, setActivate] = useState(true);

  const [periodName, setPeriodName] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!config.selectedPeriod) return;

    setPeriodName(config.selectedPeriod.period_name || "");
    setStatus(config.selectedPeriod.status || "DRAFT");
    setStartDate(config.selectedPeriod.start_date || "");
    setEndDate(config.selectedPeriod.end_date || "");
  }, [config.selectedPeriod]);

  const openEdit = () => {
    if (!config.selectedPeriod) return;
    setModalMode("edit");
  };

  const submitCreate = async () => {
    await config.createMonthlyPeriod(Number(year), Number(month), activate);
    setModalMode(null);
  };

  const submitEdit = async () => {
    if (!config.selectedPeriod) return;

    await config.updatePeriod(config.selectedPeriod.id, {
      period_name: periodName,
      status,
      start_date: startDate,
      end_date: endDate,
    });

    setModalMode(null);
  };

  return (
    <>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between border-b bg-white px-4">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Cấu hình KPI Sale Admin
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý kỳ KPI, bộ KPI SA/SA_SUP, phần, nhóm và chỉ tiêu KPI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={config.reloadPeriodDetail}
              disabled={!config.selectedPeriodId || config.loadingDetail}
              className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Tải lại
            </button>

            {config.canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setModalMode("create")}
                  className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0089bd]"
                >
                  <Plus size={15} />
                  Thêm kỳ
                </button>

                <button
                  type="button"
                  onClick={openEdit}
                  disabled={!config.selectedPeriod}
                  className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Edit size={15} />
                  Sửa kỳ
                </button>

                <button
                  type="button"
                  onClick={() =>
                    config.selectedPeriod &&
                    config.deletePeriod(config.selectedPeriod.id)
                  }
                  disabled={!config.selectedPeriod}
                  className="flex h-8 items-center gap-1 rounded border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Xóa kỳ
                </button>

                <button
                  type="button"
                  onClick={config.saveWeights}
                  disabled={
                    config.saving || !config.periodDetail || !config.selectedProfile
                  }
                  className="flex h-8 items-center gap-1 rounded bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={15} />
                  Lưu trọng số
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 px-4 py-3">
          <div className="col-span-12 md:col-span-5">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Kỳ KPI
            </label>
            <select
              value={config.selectedPeriodId}
              onChange={(event) => config.setSelectedPeriodId(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
            >
              <option value="">Chọn kỳ KPI</option>
              {config.periods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.period_code} - {item.period_name} ({item.status})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Bộ KPI
            </label>
            <select
              value={config.selectedProfileId}
              onChange={(event) => config.setSelectedProfileId(event.target.value)}
              disabled={!config.periodDetail || config.profileRows.length === 0}
              className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400 disabled:bg-slate-50"
            >
              <option value="">Chọn bộ KPI</option>
              {config.profileRows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.profile_code} - {item.profile_name}
                </option>
              ))}
            </select>
          </div>

          {config.selectedPeriod && (
            <div className="col-span-12 flex items-end text-xs text-slate-500 md:col-span-3">
              {config.selectedPeriod.start_date} → {config.selectedPeriod.end_date}
            </div>
          )}
        </div>
      </div>

      {modalMode === "create" && (
        <KpiConfigModal
          title="Thêm kỳ KPI"
          description="Tạo kỳ KPI theo tháng, hệ thống sẽ sinh cấu hình mặc định."
          onClose={() => setModalMode(null)}
        >
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6">
              <ModalField label="Năm" required>
                <input
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                />
              </ModalField>
            </div>

            <div className="col-span-6">
              <ModalField label="Tháng" required>
                <input
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                />
              </ModalField>
            </div>

            <div className="col-span-12">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={activate}
                  onChange={(event) => setActivate(event.target.checked)}
                />
                Active sau khi tạo
              </label>
            </div>

            <div className="col-span-12 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="h-9 rounded border border-slate-300 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitCreate}
                className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
              >
                Tạo kỳ
              </button>
            </div>
          </div>
        </KpiConfigModal>
      )}

      {modalMode === "edit" && (
        <KpiConfigModal
          title="Sửa kỳ KPI"
          description="Chỉnh thông tin kỳ KPI hiện tại."
          onClose={() => setModalMode(null)}
        >
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <ModalField label="Tên kỳ KPI" required>
                <input
                  value={periodName}
                  onChange={(event) => setPeriodName(event.target.value)}
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                />
              </ModalField>
            </div>

            <div className="col-span-12 md:col-span-4">
              <ModalField label="Trạng thái">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="LOCKED">LOCKED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </ModalField>
            </div>

            <div className="col-span-6 md:col-span-4">
              <ModalField label="Từ ngày">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                />
              </ModalField>
            </div>

            <div className="col-span-6 md:col-span-4">
              <ModalField label="Đến ngày">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
                />
              </ModalField>
            </div>

            <div className="col-span-12 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="h-9 rounded border border-slate-300 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitEdit}
                className="h-9 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
              >
                Lưu kỳ
              </button>
            </div>
          </div>
        </KpiConfigModal>
      )}
    </>
  );
}
