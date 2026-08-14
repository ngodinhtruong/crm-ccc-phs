"use client";

import { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";

import { customerApi } from "@/apis/customer.api";
import { SearchInput } from "@/components/common";
import { Customer360Panel } from "@/components/customers/Customer360Panel";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { CustomerListItem } from "@/types/customer.type";
import { getErrorMessage } from "@/utils/error.util";

const SEARCH_DEBOUNCE_MS = 350;
const SUGGESTION_LIMIT = 8;

/**
 * Trang Customer 360 độc lập: chọn khách rồi xem số liệu tổng hợp.
 *
 * Phần hiển thị dùng chung ``Customer360Panel`` với tab "Tổng quan" của trang
 * chi tiết khách hàng — hai lối vào, một khối trình bày, sửa một chỗ là cả hai
 * cùng đổi.
 */
export function Customer360Page() {
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggestions, setSuggestions] = useState<CustomerListItem[]>([]);
  const [selected, setSelected] = useState<CustomerListItem | null>(null);
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

          {error && (
            <p className="mt-2 text-xs text-rose-600">{error}</p>
          )}

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
                      setSelected(customer);
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

        {selected ? (
          <Customer360Panel customerId={selected.id} />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Chọn một khách hàng để xem số liệu 360
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Màn hình gộp giao dịch, cuộc gọi, ticket và kết quả khảo sát của
              cùng một khách.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
