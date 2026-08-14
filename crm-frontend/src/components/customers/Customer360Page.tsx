"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, UsersRound } from "lucide-react";

import { customerApi } from "@/apis/customer.api";
import { SearchInput } from "@/components/common";
import { Customer360Panel } from "@/components/customers/Customer360Panel";
import { PotentialCustomerTable } from "@/components/customers/PotentialCustomerTable";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { CustomerListItem } from "@/types/customer.type";
import { getErrorMessage } from "@/utils/error.util";

const SEARCH_DEBOUNCE_MS = 350;
const SUGGESTION_LIMIT = 8;

/**
 * Trang Customer 360: chọn một khách rồi xem số liệu tổng hợp ngay tại chỗ.
 *
 * Phần hiển thị dùng chung ``Customer360Panel`` với tab "Tổng quan" của trang
 * chi tiết khách hàng — hai lối vào, một khối trình bày, sửa một chỗ là cả hai
 * cùng đổi. Muốn xem hồ sơ đầy đủ thì bấm "Xem chi tiết" trên panel.
 */
export function Customer360Page() {
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggestions, setSuggestions] = useState<CustomerListItem[]>([]);
  // Chỉ giữ id: panel 360 tự gọi API lấy đủ thông tin khách, giữ thêm cả object
  // ở đây sẽ thành hai bản dữ liệu của cùng một khách và lệch nhau khi cập nhật.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword.trim()), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (!debounced) return;

    let cancelled = false;

    async function search() {
      setSearching(true);
      setError("");

      try {
        const result = await customerApi.getCustomers({ q: debounced });

        // Cắt ở client: API không nhận page_size (DRF chưa bật
        // page_size_query_param) nên truyền lên cũng bị bỏ qua.
        if (!cancelled) {
          setSuggestions((result.results || []).slice(0, SUGGESTION_LIMIT));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Không tìm được khách hàng"));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }

    void search();

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const breadcrumbs = useMemo(
    () => [{ label: "Khách hàng", href: "/customers" }, { label: "Customer 360" }],
    []
  );

  // Đã chọn khách thì chỉ còn số liệu của khách đó: ô tìm kiếm và bảng danh
  // sách lùi ra sau một nút quay lại, để màn hình không lẫn dữ liệu của người
  // khác vào lúc đang đọc một hồ sơ.
  if (selectedId) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-3 pr-4">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            Quay lại danh sách
          </button>

          <Customer360Panel customerId={selectedId} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-3 pr-4">
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <UsersRound size={16} className="text-[#00713d]" />
            <h1 className="text-xs font-black tracking-wide text-[#00713d]">
              CUSTOMER 360
            </h1>
            <span className="text-[11px] text-slate-400">
              tìm theo tên, mã khách hoặc số điện thoại
            </span>
          </div>

          <div className="mt-3 max-w-md">
            <SearchInput
              value={keyword}
              onChange={setKeyword}
              placeholder="Nhập tên, mã khách hàng hoặc số điện thoại..."
            />
          </div>

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

          {searching && (
            <p className="mt-2 text-xs text-slate-400">Đang tìm...</p>
          )}

          {!searching && debounced && suggestions.length === 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Không có khách hàng nào khớp &ldquo;{debounced}&rdquo;.
            </p>
          )}

          {debounced && suggestions.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {suggestions.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(customer.id);
                      setSuggestions([]);
                      setKeyword("");
                    }}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-left transition hover:bg-slate-50"
                  >
                    <span className="text-xs font-bold text-slate-800">
                      {customer.full_name}
                    </span>
                    {customer.customer_code && (
                      <span className="font-mono text-[11px] text-sky-600">
                        {customer.customer_code}
                      </span>
                    )}
                    {customer.phone && (
                      <span className="text-[11px] text-slate-500">
                        {customer.phone}
                      </span>
                    )}
                    {customer.branch_name && (
                      <span className="ml-auto text-[11px] text-slate-400">
                        {customer.branch_name}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <PotentialCustomerTable onSelect={setSelectedId} />
      </div>
    </DashboardLayout>
  );
}
