"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Edit2,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { ekycApi } from "@/apis/ekyc.api";
import { masterDataApi } from "@/apis/master-data.api";
import {
  ColumnDateRangeFilter,
  ColumnSelectFilter,
  ColumnTextFilter,
  TablePagination,
} from "@/components/common";
import {
  EkycCallResult,
  EkycCallStatus,
  EkycListParams,
  EkycRecord,
} from "@/types/ekyc.type";

export function EkycTable() {
  const [records, setRecords] = useState<EkycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Column Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const loadBranches = async () => {
      const optionMap = new Map<string, string>();
      try {
        const branches: any[] = await masterDataApi.getBranches();
        branches.forEach((b) => {
          const name = b.branch_name || b.name;
          if (name) optionMap.set(name, name);
        });
      } catch {
        // silent
      }

      const options = Array.from(optionMap.keys()).map((name) => ({
        label: name,
        value: name,
      }));
      setBranchOptions(options);
    };
    loadBranches();
  }, []);

  useEffect(() => {
    if (records.length > 0) {
      setBranchOptions((prev) => {
        const optionMap = new Map<string, string>();
        prev.forEach((opt) => optionMap.set(opt.value, opt.label));
        records.forEach((rec) => {
          if (rec.branch_name) {
            optionMap.set(rec.branch_name, rec.branch_name);
          }
        });
        return Array.from(optionMap.keys()).map((name) => ({
          label: name,
          value: name,
        }));
      });
    }
  }, [records]);
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [followCount, setFollowCount] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [callResult, setCallResult] = useState("");

  const [exporting, setExporting] = useState(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<EkycRecord | null>(null);
  const [editStatus, setEditStatus] = useState<EkycCallStatus>("Nghe máy");
  const [editResult, setEditResult] =
    useState<EkycCallResult>("Khách hàng bấm phím");
  const [editFollowCount, setEditFollowCount] = useState<number>(1);
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: EkycListParams = {
        page,
        page_size: pageSize,
        account_number: accountNumber || undefined,
        customer_name: customerName || undefined,
        branch_name: branchName || undefined,
        manager_name: managerName || undefined,
        phone: phone || undefined,
        follow_count: followCount || undefined,
        call_status: callStatus || undefined,
        call_result: callResult || undefined,
        call_date_from: dateFrom || undefined,
        call_date_to: dateTo || undefined,
      };
      const res = await ekycApi.getRecords(params);
      setRecords(res.results || []);
      setTotalCount(res.count || 0);
    } catch {
      setRecords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [
    page,
    pageSize,
    dateFrom,
    dateTo,
    accountNumber,
    customerName,
    branchName,
    managerName,
    phone,
    followCount,
    callStatus,
    callResult,
  ]);

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setAccountNumber("");
    setCustomerName("");
    setBranchName("");
    setManagerName("");
    setPhone("");
    setFollowCount("");
    setCallStatus("");
    setCallResult("");
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await ekycApi.exportExcel({
        account_number: accountNumber || undefined,
        customer_name: customerName || undefined,
        branch_name: branchName || undefined,
        manager_name: managerName || undefined,
        phone: phone || undefined,
        follow_count: followCount || undefined,
        call_status: callStatus || undefined,
        call_result: callResult || undefined,
        call_date_from: dateFrom || undefined,
        call_date_to: dateTo || undefined,
      });
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const handleOpenEdit = (rec: EkycRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.call_status);
    setEditResult(rec.call_result);
    setEditFollowCount(rec.follow_count);
    setEditNote(rec.note || "");
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      await ekycApi.updateRecord(editingRecord.id, {
        call_status: editStatus,
        call_result: editResult,
        follow_count: editFollowCount,
        note: editNote,
      });
      setEditingRecord(null);
      fetchRecords();
    } catch {
      // silent catch
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi eKYC này không?")) return;
    setDeletingId(id);
    try {
      await ekycApi.deleteRecord(id);
      fetchRecords();
    } catch {
      // silent catch
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const fromRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRecord = Math.min(page * pageSize, totalCount);

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">
            Danh sách cuộc gọi eKYC
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Quản lý và tra cứu toàn bộ thông tin cuộc gọi eKYC đã ghi nhận trên hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TablePagination
            fromRecord={fromRecord}
            toRecord={toRecord}
            count={totalCount}
            page={page}
            totalPages={totalPages}
            loading={loading}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 20, 50]}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
            onPrevious={() => setPage(Math.max(1, page - 1))}
            onNext={() => setPage(Math.min(totalPages, page + 1))}
          />

          <button
            type="button"
            onClick={handleClearFilters}
            className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Xóa lọc
          </button>

          <button
            type="button"
            onClick={fetchRecords}
            disabled={loading}
            className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Tải lại</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex h-8 items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-scroll-container">
        <table className="data-table w-full border-collapse text-left text-sm">
          <thead>
            {/* Header Labels Row */}
            <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-[170px] min-w-[170px] px-4 font-semibold">Ngày gọi</th>
              <th className="w-[150px] min-w-[150px] px-4 font-semibold">Số TK Lưu Kí</th>
              <th className="w-[180px] min-w-[180px] px-4 font-semibold">Tên Khách Hàng</th>
              <th className="w-[150px] min-w-[150px] px-4 font-semibold">Chi Nhánh</th>
              <th className="w-[170px] min-w-[170px] px-4 font-semibold">Quản Lý</th>
              <th className="w-[140px] min-w-[140px] px-4 font-semibold">SĐT</th>
              <th className="w-[110px] min-w-[110px] px-4 font-semibold text-center">Follow</th>
              <th className="w-[120px] min-w-[120px] px-4 font-semibold">PIC</th>
              <th className="w-[170px] min-w-[170px] px-4 font-semibold">Tình Trạng</th>
              <th className="w-[190px] min-w-[190px] px-4 font-semibold">Kết Quả Cuộc Gọi</th>
              <th className="w-[180px] min-w-[180px] px-4 font-semibold">Ghi Chú</th>
              <th className="w-[100px] min-w-[100px] px-4 font-semibold text-right">Thao Tác</th>
            </tr>

            {/* Column Filter Row */}
            <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
              <th className="px-3 py-2.5">
                <ColumnDateRangeFilter
                  fromValue={dateFrom}
                  toValue={dateTo}
                  onFromChange={(val) => {
                    setDateFrom(val);
                    setPage(1);
                  }}
                  onToChange={(val) => {
                    setDateTo(val);
                    setPage(1);
                  }}
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={accountNumber}
                  onChange={(val) => {
                    setAccountNumber(val);
                    setPage(1);
                  }}
                  placeholder="Số TK"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={customerName}
                  onChange={(val) => {
                    setCustomerName(val);
                    setPage(1);
                  }}
                  placeholder="Tên KH"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnSelectFilter
                  value={branchName}
                  onChange={(val) => {
                    setBranchName(val);
                    setPage(1);
                  }}
                  options={branchOptions}
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={managerName}
                  onChange={(val) => {
                    setManagerName(val);
                    setPage(1);
                  }}
                  placeholder="Quản lý"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    setPage(1);
                  }}
                  placeholder="SĐT"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnTextFilter
                  value={followCount}
                  onChange={(val) => {
                    setFollowCount(val);
                    setPage(1);
                  }}
                  placeholder="Lần"
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnSelectFilter
                  value={callStatus}
                  onChange={(val) => {
                    setCallStatus(val);
                    setPage(1);
                  }}
                  options={[
                    { label: "Nghe máy", value: "Nghe máy" },
                    { label: "Không nghe máy", value: "Không nghe máy" },
                    { label: "Thuê bao không tồn tại", value: "Thuê bao không tồn tại" },
                  ]}
                />
              </th>

              <th className="px-3 py-2.5">
                <ColumnSelectFilter
                  value={callResult}
                  onChange={(val) => {
                    setCallResult(val);
                    setPage(1);
                  }}
                  options={[
                    { label: "Khách hàng bấm phím", value: "Khách hàng bấm phím" },
                    { label: "KH không bấm phím", value: "KH không bấm phím" },
                    { label: "Khách hàng tắt máy ngang", value: "Khách hàng tắt máy ngang" },
                  ]}
                />
              </th>

              <th className="px-3 py-2.5" />
              {/* PIC - empty filter */}
              <th className="px-3 py-2.5" />
              <th className="px-3 py-2.5" />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={11} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                  <span className="mt-2 block text-xs text-slate-400">
                    Đang tải danh sách eKYC...
                  </span>
                </td>
              </tr>
            ) : records.length > 0 ? (
              records.map((rec) => (
                <tr key={rec.id} className="hover:bg-emerald-50/20 transition-colors">
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    {rec.call_date}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {rec.account_number}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {rec.customer_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {rec.branch_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {rec.manager_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono">
                    {rec.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                      Lần {rec.follow_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {rec.pic ? (
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          rec.pic.toLowerCase() === "autocall"
                            ? "bg-blue-100 text-blue-800"
                            : rec.pic.toLowerCase().includes("không gọi")
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {rec.pic}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        rec.call_status === "Nghe máy"
                          ? "bg-emerald-100 text-emerald-800"
                          : rec.call_status === "Không nghe máy"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {rec.call_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        rec.call_result === "Khách hàng bấm phím"
                          ? "bg-blue-100 text-blue-800"
                          : rec.call_result === "Khách hàng tắt máy ngang"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {rec.call_result}
                    </span>
                  </td>
                  <td
                    className="max-w-[180px] truncate px-4 py-3 text-slate-500"
                    title={rec.note || ""}
                  >
                    {rec.note || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rec)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
                        title="Sửa bản ghi"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rec.id)}
                        disabled={deletingId === rec.id}
                        className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50"
                        title="Xóa bản ghi"
                      >
                        {deletingId === rec.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={11}
                  className="py-12 text-center text-xs text-slate-400"
                >
                  Không có bản ghi cuộc gọi eKYC nào thỏa mãn bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination Bar */}
      <div className="flex items-center justify-end border-t px-4 py-3">
        <TablePagination
          fromRecord={fromRecord}
          toRecord={toRecord}
          count={totalCount}
          page={page}
          totalPages={totalPages}
          loading={loading}
          pageSize={pageSize}
          pageSizeOptions={[10, 15, 20, 50]}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
          onPrevious={() => setPage(Math.max(1, page - 1))}
          onNext={() => setPage(Math.min(totalPages, page + 1))}
        />
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800">
                CHỈNH SỬA BẢN GHI eKYC #{editingRecord.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
              <p>
                <span className="font-bold">Số TK:</span>{" "}
                {editingRecord.account_number}
              </p>
              <p>
                <span className="font-bold">Khách hàng:</span>{" "}
                {editingRecord.customer_name || "N/A"}
              </p>
              <p>
                <span className="font-bold">Ngày gọi:</span>{" "}
                {editingRecord.call_date}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Số lần follow
                </label>
                <input
                  type="number"
                  min={1}
                  value={editFollowCount}
                  onChange={(e) =>
                    setEditFollowCount(parseInt(e.target.value) || 1)
                  }
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Tình trạng cuộc gọi
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as EkycCallStatus)
                  }
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                >
                  <option value="Nghe máy">Nghe máy</option>
                  <option value="Không nghe máy">Không nghe máy</option>
                  <option value="Thuê bao không tồn tại">
                    Thuê bao không tồn tại
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Kết quả cuộc gọi
                </label>
                <select
                  value={editResult}
                  onChange={(e) =>
                    setEditResult(e.target.value as EkycCallResult)
                  }
                  className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                >
                  <option value="Khách hàng bấm phím">
                    Khách hàng bấm phím
                  </option>
                  <option value="KH không bấm phím">KH không bấm phím</option>
                  <option value="Khách hàng tắt máy ngang">
                    Khách hàng tắt máy ngang
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded border border-slate-300 p-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="rounded border px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center gap-1.5 rounded bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingEdit && <Loader2 size={14} className="animate-spin" />}
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
