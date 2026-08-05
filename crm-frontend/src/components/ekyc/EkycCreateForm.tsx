"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Phone,
  PhoneCall,
  Search,
  User,
  UserCheck,
  AlertCircle,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";
import { ekycApi } from "@/apis/ekyc.api";
import {
  CreateEkycPayload,
  EkycCallResult,
  EkycCallStatus,
  EkycCustomerLookup,
} from "@/types/ekyc.type";

export function EkycCreateForm() {
  const router = useRouter();

  // Form states
  const [accountNumber, setAccountNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerAccountId, setCustomerAccountId] = useState<number | null>(
    null
  );

  // Default to today's date formatted as YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  const [callDate, setCallDate] = useState(todayStr);

  const [followCount, setFollowCount] = useState<number>(1);
  const [callStatus, setCallStatus] = useState<EkycCallStatus>("Nghe máy");
  const [callResult, setCallResult] =
    useState<EkycCallResult>("Khách hàng bấm phím");
  const [note, setNote] = useState("");

  // Lookup & UI states
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<EkycCustomerLookup[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Initial load suggestions
  useEffect(() => {
    const fetchInitialSuggestions = async () => {
      try {
        const data = await ekycApi.getSuggestions("");
        setSuggestions(data);
      } catch {
        // silent catch
      }
    };
    fetchInitialSuggestions();
  }, []);

  const handleLookup = async (accNo: string) => {
    if (!accNo.trim()) return;
    setLoadingLookup(true);
    setLookupMessage(null);
    try {
      const res = await ekycApi.lookupCustomer(accNo.trim());
      if (res.found) {
        setAccountNumber(res.account_number);
        setCustomerName(res.customer_name || "");
        setBranchName(res.branch_name || "");
        setManagerName(res.manager_name || "");
        setPhone(res.phone || "");
        setCustomerId(res.customer_id || null);
        setCustomerAccountId(res.customer_account_id || null);
        setLookupMessage({
          type: "success",
          text: `Đã tìm thấy thông tin khách hàng: ${res.customer_name} (${res.account_number})`,
        });
      } else {
        setLookupMessage({
          type: "error",
          text:
            res.message ||
            "Không tìm thấy Số TK lưu kí này trong hệ thống.",
        });
      }
    } catch {
      setLookupMessage({
        type: "error",
        text: "Lỗi tra cứu thông tin khách hàng. Vui lòng thử lại.",
      });
    } finally {
      setLoadingLookup(false);
    }
  };

  const selectSuggestion = (item: EkycCustomerLookup) => {
    setAccountNumber(item.account_number);
    setCustomerName(item.customer_name || "");
    setBranchName(item.branch_name || "");
    setManagerName(item.manager_name || "");
    setPhone(item.phone || "");
    setCustomerId(item.customer_id || null);
    setCustomerAccountId(item.customer_account_id || null);
    setShowSuggestions(false);
    setLookupMessage({
      type: "success",
      text: `Đã chọn khách hàng: ${item.customer_name} (${item.account_number})`,
    });
  };

  const handleReset = () => {
    setAccountNumber("");
    setCustomerName("");
    setBranchName("");
    setManagerName("");
    setPhone("");
    setCustomerId(null);
    setCustomerAccountId(null);
    setCallDate(todayStr);
    setFollowCount(1);
    setCallStatus("Nghe máy");
    setCallResult("Khách hàng bấm phím");
    setNote("");
    setLookupMessage(null);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) {
      setSubmitError("Vui lòng chọn hoặc nhập Số TK lưu kí.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const payload: CreateEkycPayload = {
      account_number: accountNumber.trim().toUpperCase(),
      customer: customerId,
      customer_account: customerAccountId,
      customer_name: customerName,
      branch_name: branchName,
      manager_name: managerName,
      phone: phone,
      call_date: callDate,
      follow_count: Number(followCount) || 1,
      call_status: callStatus,
      call_result: callResult,
      note: note.trim(),
    };

    try {
      await ekycApi.createRecord(payload);
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/ekyc");
      }, 1500);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.account_number?.[0] ||
        "Lỗi khi lưu cuộc gọi eKYC. Vui lòng kiểm tra lại.";
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            TẠO BẢN GHI eKYC MỚI
          </h2>
          <p className="text-xs text-slate-500">
            Ghi nhận thông tin cuộc gọi kiểm tra eKYC tài khoản khách hàng
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <RotateCcw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {submitSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <span className="text-sm font-medium">
            Tạo bản ghi eKYC thành công! Đang chuyển hướng về danh sách...
          </span>
        </div>
      )}

      {submitError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle size={20} className="text-rose-600" />
          <span className="text-sm font-medium">{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bước 1: Tra cứu Số TK lưu kí */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-emerald-900">
            1. Chọn Khách hàng trong hệ thống (Số TK Lưu Kí) *
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Nhập hoặc chọn Số TK lưu kí (Ví dụ: 054C123456)..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold uppercase text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <Search
                  size={18}
                  className="absolute left-3.5 top-3 text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={() => handleLookup(accountNumber)}
                disabled={loadingLookup}
                className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadingLookup ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserCheck size={16} />
                )}
                <span>Tra cứu KH</span>
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-20 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                  GỢI Ý TÀI KHOẢN KHÁCH HÀNG:
                </div>
                {suggestions.map((item) => (
                  <button
                    key={item.account_number}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-emerald-50"
                  >
                    <div>
                      <span className="font-bold text-slate-800">
                        {item.account_number}
                      </span>
                      <span className="ml-2 text-xs font-medium text-slate-600">
                        - {item.customer_name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {item.branch_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lookupMessage && (
            <div
              className={`mt-3 text-xs font-medium ${
                lookupMessage.type === "success"
                  ? "text-emerald-700"
                  : "text-rose-600"
              }`}
            >
              {lookupMessage.text}
            </div>
          )}
        </div>

        {/* Thông tin Khách hàng tự động điền */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <User size={14} className="text-emerald-600" />
              <span>Tên KH</span>
            </div>
            <input
              type="text"
              readOnly
              value={customerName || "Chưa tra cứu"}
              className="w-full bg-transparent font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Building2 size={14} className="text-emerald-600" />
              <span>Chi nhánh</span>
            </div>
            <input
              type="text"
              readOnly
              value={branchName || "Chưa tra cứu"}
              className="w-full bg-transparent font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <UserCheck size={14} className="text-emerald-600" />
              <span>Tên người quản lý</span>
            </div>
            <input
              type="text"
              readOnly
              value={managerName || "Chưa có"}
              className="w-full bg-transparent font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Phone size={14} className="text-emerald-600" />
              <span>SĐT khách hàng</span>
            </div>
            <input
              type="text"
              readOnly
              value={phone || "Chưa tra cứu"}
              className="w-full bg-transparent font-semibold text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Bước 2: Thông tin cuộc gọi eKYC */}
        <div className="border-t pt-4">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-700">
            2. Chi tiết Ghi nhận Cuộc gọi eKYC
          </h3>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Ghi nhận ngày gọi */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Ghi nhận ngày gọi (Mặc định ngày hiện tại) *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Số lần follow */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Số lần follow *
              </label>
              <input
                type="number"
                min={1}
                value={followCount}
                onChange={(e) => setFollowCount(parseInt(e.target.value) || 1)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Tình trạng */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Tình trạng cuộc gọi *
              </label>
              <select
                value={callStatus}
                onChange={(e) =>
                  setCallStatus(e.target.value as EkycCallStatus)
                }
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option value="Nghe máy">Nghe máy</option>
                <option value="Không nghe máy">Không nghe máy</option>
                <option value="Thuê bao không tồn tại">
                  Thuê bao không tồn tại
                </option>
              </select>
            </div>

            {/* Kết quả cuộc gọi */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Kết quả cuộc gọi *
              </label>
              <select
                value={callResult}
                onChange={(e) =>
                  setCallResult(e.target.value as EkycCallResult)
                }
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
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
          </div>

          {/* Ghi chú */}
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Ghi chú cuộc gọi
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú thêm nếu có..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => router.push("/ekyc")}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>Lưu Cuộc Gọi eKYC</span>
          </button>
        </div>
      </form>
    </div>
  );
}
