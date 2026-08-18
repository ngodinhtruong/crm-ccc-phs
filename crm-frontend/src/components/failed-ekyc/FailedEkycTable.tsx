"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2, X } from "lucide-react";

import { failedEkycApi } from "@/apis/failed-ekyc.api";
import {
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
  TablePagination,
  TableState,
} from "@/components/common";
import {
  FAILED_EKYC_CALL_RESULTS,
  FAILED_EKYC_CALL_STATUSES,
  FAILED_EKYC_STEPS,
  FailedEkycListParams,
  FailedEkycRecord,
} from "@/types/failed-ekyc.type";
import { isLinkedCustomer, maskEmail, maskPhone } from "@/utils/mask-data.util";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function StatusBadge({ value }: { value?: string }) {
  const colors = value === "Nghe máy"
    ? "bg-emerald-100 text-emerald-700"
    : value === "Không nghe máy"
      ? "bg-amber-100 text-amber-700"
      : value === "KHÔNG CALL"
        ? "bg-slate-100 text-slate-600"
        : "bg-red-100 text-red-700";
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${colors}`}>{value || "-"}</span>;
}

function ResultBadge({ value }: { value?: string }) {
  const colors = value === "Thành công"
    ? "bg-emerald-100 text-emerald-700"
    : value === "KH cần thử lại"
      ? "bg-amber-100 text-amber-700"
      : value ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500";
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${colors}`}>{value || "-"}</span>;
}

export function FailedEkycTable() {
  const [rows, setRows] = useState<FailedEkycRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FailedEkycRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<FailedEkycListParams>({});

  const requestParams = useMemo(() => ({ ...filters, page, page_size: pageSize }), [filters, page, pageSize]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await failedEkycApi.getRecords(requestParams);
      setRows(data.results);
      setCount(data.count);
    } catch {
      setError("Không tải được danh sách Failed eKYC.");
    } finally {
      setLoading(false);
    }
  }, [requestParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const setFilter = (key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const clearFilters = () => { setFilters({}); setPage(1); };
  const remove = async (id: number) => {
    if (!window.confirm("Xóa bản ghi Failed eKYC này?")) return;
    await failedEkycApi.deleteRecord(id);
    await load();
  };
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await failedEkycApi.updateRecord(editing.id, editing);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const fromRecord = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRecord = Math.min(page * pageSize, count);
  const value = (key: string) => String(filters[key] || "");

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-2">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">Danh sách Failed eKYC</h1>
          <p className="mt-0.5 text-xs text-slate-500">Theo dõi lỗi thao tác, phân công PIC và kết quả chăm sóc khách hàng.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TablePagination
            fromRecord={fromRecord}
            toRecord={toRecord}
            count={count}
            page={page}
            totalPages={totalPages}
            loading={loading}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
          <button type="button" onClick={clearFilters} className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Xóa lọc</button>
          <button type="button" onClick={() => failedEkycApi.exportExcel(filters)} className="flex h-8 items-center gap-1.5 rounded bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"><Download size={14}/>Export</button>
        </div>
      </div>

      <div className="table-scroll-container">
        <table className="data-table w-full min-w-[2450px] border-collapse text-left text-sm">
          <thead>
            <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-[175px] min-w-[175px] px-4 font-semibold">Step</th>
              <th className="w-[150px] min-w-[150px] px-4 font-semibold">Chi nhánh</th>
              <th className="w-[145px] min-w-[145px] px-4 font-semibold">Số tài khoản</th>
              <th className="w-[190px] min-w-[190px] px-4 font-semibold">Email</th>
              <th className="w-[145px] min-w-[145px] px-4 font-semibold">Điện thoại</th>
              <th className="w-[170px] min-w-[170px] px-4 font-semibold">Ngày phát sinh</th>
              <th className="w-[340px] min-w-[340px] px-4 font-semibold">Lỗi</th>
              <th className="w-[130px] min-w-[130px] px-4 font-semibold">PIC</th>
              <th className="w-[170px] min-w-[170px] px-4 font-semibold">Ngày gọi</th>
              <th className="w-[110px] min-w-[110px] px-4 font-semibold">Follow</th>
              <th className="w-[190px] min-w-[190px] px-4 font-semibold">Tình trạng</th>
              <th className="w-[170px] min-w-[170px] px-4 font-semibold">Kết quả</th>
              <th className="w-[280px] min-w-[280px] px-4 font-semibold">CS comment</th>
              <th className="sticky right-0 w-[90px] min-w-[90px] bg-slate-50 px-4 font-semibold">Thao tác</th>
            </tr>
            <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
              <th className="px-3 py-2.5"><ColumnSelectFilter value={value("step")} onChange={(v) => setFilter("step", v)} options={FAILED_EKYC_STEPS.map((v) => ({ label: v, value: v }))}/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("branch_name")} onChange={(v) => setFilter("branch_name", v)} placeholder="Chi nhánh"/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("account_number")} onChange={(v) => setFilter("account_number", v)} placeholder="Số TK"/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("email")} onChange={(v) => setFilter("email", v)} placeholder="Email"/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("phone")} onChange={(v) => setFilter("phone", v)} placeholder="Điện thoại"/></th>
              <th className="px-3 py-2.5"><ColumnDateRangeFilter fromValue={value("failed_date_from")} toValue={value("failed_date_to")} onFromChange={(v) => setFilter("failed_date_from", v)} onToChange={(v) => setFilter("failed_date_to", v)}/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("error_message")} onChange={(v) => setFilter("error_message", v)} placeholder="Nội dung lỗi"/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("pic")} onChange={(v) => setFilter("pic", v)} placeholder="PIC"/></th>
              <th className="px-3 py-2.5"><ColumnDateRangeFilter fromValue={value("call_date_from")} toValue={value("call_date_to")} onFromChange={(v) => setFilter("call_date_from", v)} onToChange={(v) => setFilter("call_date_to", v)}/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("follow_count")} onChange={(v) => setFilter("follow_count", v)} placeholder="Lần"/></th>
              <th className="px-3 py-2.5"><ColumnSelectFilter value={value("call_status")} onChange={(v) => setFilter("call_status", v)} options={FAILED_EKYC_CALL_STATUSES.map((v) => ({ label: v, value: v }))}/></th>
              <th className="px-3 py-2.5"><ColumnSelectFilter value={value("call_result")} onChange={(v) => setFilter("call_result", v)} options={FAILED_EKYC_CALL_RESULTS.map((v) => ({ label: v, value: v }))}/></th>
              <th className="px-3 py-2.5"><ColumnTextFilter value={value("cs_comment")} onChange={(v) => setFilter("cs_comment", v)} placeholder="Ghi chú"/></th>
              <th className="sticky right-0 bg-slate-50/95 px-3 py-2.5"/>
            </tr>
          </thead>
          <tbody>
            <TableState loading={loading} error={error} empty={!loading && !error && rows.length === 0} colSpan={14} emptyText="Không có dữ liệu Failed eKYC." />
            {!loading && !error && rows.map((row, index) => (
              <tr key={row.id} className={`h-[52px] border-b border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"} transition-colors hover:bg-emerald-50`}>
                <td className="px-4"><span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">{row.step}</span></td>
                <td className="px-4 text-slate-600">{row.branch_name || "-"}</td>
                <td className="px-4 font-semibold text-slate-700">{row.account_number || "-"}</td>
                <td className="px-4 text-slate-600">{maskEmail(row.email, isLinkedCustomer(row.account_number)) || "-"}</td>
                <td className="px-4 text-slate-600">{maskPhone(row.phone, isLinkedCustomer(row.account_number)) || "-"}</td>
                <td className="px-4 text-slate-600">{formatDate(row.failed_at)}</td>
                <td className="px-4"><div className="line-clamp-2 max-w-[320px] text-xs leading-5 text-slate-700" title={row.error_message}>{row.error_message || "-"}</div></td>
                <td className="px-4 font-medium text-slate-700">{row.pic || "-"}</td>
                <td className="px-4 text-slate-600">{formatDate(row.call_date)}</td>
                <td className="px-4 text-center font-semibold text-slate-700">{row.follow_count || 0}</td>
                <td className="px-4"><StatusBadge value={row.call_status}/></td>
                <td className="px-4"><ResultBadge value={row.call_result}/></td>
                <td className="px-4"><div className="line-clamp-2 max-w-[260px] text-xs leading-5 text-slate-600" title={row.cs_comment}>{row.cs_comment || "-"}</div></td>
                <td className={`sticky right-0 px-4 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}><div className="flex gap-1"><button type="button" onClick={() => setEditing({ ...row })} className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700" title="Chỉnh sửa"><Pencil size={13}/></button><button type="button" onClick={() => void remove(row.id)} className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-red-300 hover:text-red-700" title="Xóa"><Trash2 size={13}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EditModal record={editing} saving={saving} onChange={setEditing} onClose={() => setEditing(null)} onSave={() => void save()}/>} 
    </div>
  );
}

function EditModal({ record, saving, onChange, onClose, onSave }: { record: FailedEkycRecord; saving: boolean; onChange: (record: FailedEkycRecord) => void; onClose: () => void; onSave: () => void }) {
  const inputClass = "mt-1 h-9 w-full rounded border border-slate-300 px-3 text-xs font-normal outline-none focus:border-emerald-500";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"><div className="mb-4 flex items-center justify-between border-b pb-3"><div><h3 className="font-bold text-slate-800">Cập nhật Failed eKYC #{record.id}</h3><p className="text-xs text-slate-500">{record.account_number || record.phone || record.email || "Không có thông tin định danh"}</p></div><button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18}/></button></div><div className="grid gap-4 sm:grid-cols-2">
    <label className="text-xs font-semibold text-slate-700">PIC<input value={record.pic} onChange={(e) => onChange({ ...record, pic: e.target.value })} className={inputClass}/></label>
    <label className="text-xs font-semibold text-slate-700">Ngày gọi<input type="date" value={record.call_date || ""} onChange={(e) => onChange({ ...record, call_date: e.target.value })} className={inputClass}/></label>
    <label className="text-xs font-semibold text-slate-700">Số lần follow<input type="number" min="0" value={record.follow_count} onChange={(e) => onChange({ ...record, follow_count: Number(e.target.value) })} className={inputClass}/></label>
    <label className="text-xs font-semibold text-slate-700">Tình trạng<select value={record.call_status} onChange={(e) => onChange({ ...record, call_status: e.target.value as FailedEkycRecord["call_status"] })} className={inputClass}><option value="">-</option>{FAILED_EKYC_CALL_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Kết quả<select value={record.call_result} onChange={(e) => onChange({ ...record, call_result: e.target.value as FailedEkycRecord["call_result"] })} className={inputClass}><option value="">-</option>{FAILED_EKYC_CALL_RESULTS.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">CS comment<textarea value={record.cs_comment} onChange={(e) => onChange({ ...record, cs_comment: e.target.value })} rows={3} className="mt-1 w-full rounded border border-slate-300 p-3 text-xs font-normal outline-none focus:border-emerald-500"/></label>
  </div><div className="mt-5 flex justify-end gap-2 border-t pt-4"><button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hủy</button><button type="button" disabled={saving} onClick={onSave} className="rounded bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div></div></div>;
}
