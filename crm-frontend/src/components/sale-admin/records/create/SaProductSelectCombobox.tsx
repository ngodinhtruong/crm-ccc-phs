"use client";

import React, { useEffect, useState, useRef } from "react";
import { Plus, Search, Check, PackagePlus, AlertCircle, ChevronDown } from "lucide-react";
import { SaProduct } from "@/types/sale-admin.type";
import { saleAdminApi } from "@/apis/sale-admin.api";

interface SaProductSelectComboboxProps {
  selectedProductId?: number | string | null;
  selectedProductName?: string | null;
  onSelectProduct: (productId: number | null, productName: string) => void;
}

export function SaProductSelectCombobox({
  selectedProductId,
  selectedProductName,
  onSelectProduct,
}: SaProductSelectComboboxProps) {
  const [products, setProducts] = useState<SaProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mode tạo sản phẩm mới
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [similarProducts, setSimilarProducts] = useState<SaProduct[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch danh sách sản phẩm ban đầu
  const fetchProducts = async (search?: string) => {
    try {
      setLoading(true);
      const res = await saleAdminApi.getSaProducts(search);
      setProducts(res || []);
    } catch (err) {
      console.error("Lỗi tải sản phẩm:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tim kiem san pham tuong tu khi gõ ten moi
  useEffect(() => {
    if (!isAddingNew || !newProductName.trim()) {
      setSimilarProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingSimilar(true);
        const res = await saleAdminApi.getSimilarSaProducts(newProductName);
        setSimilarProducts(res || []);
      } catch (err) {
        console.error("Lỗi tìm SP tương tự:", err);
      } finally {
        setLoadingSimilar(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [newProductName, isAddingNew]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProduct = async () => {
    const trimmed = newProductName.trim();
    if (!trimmed) {
      setCreateError("Vui lòng nhập tên sản phẩm mới.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");
      const createdProduct = await saleAdminApi.createSaProduct({ name: trimmed });
      // Re-fetch product list
      await fetchProducts();
      // Select newly created product
      onSelectProduct(createdProduct.id, createdProduct.name);
      setIsAddingNew(false);
      setNewProductName("");
      setDropdownOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.name?.[0] || err?.message || "Không thể tạo sản phẩm mới";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const selectedDisplayLabel =
    selectedProductName ||
    products.find((p) => String(p.id) === String(selectedProductId))?.name ||
    "";

  return (
    <div className="relative w-full" ref={containerRef}>
      {!isAddingNew ? (
        <div className="flex items-center gap-1.5">
          {/* Main Dropdown Combobox */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 transition-colors hover:border-emerald-500 focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20"
            >
              <span className={selectedDisplayLabel ? "font-semibold text-emerald-900" : "text-slate-400"}>
                {selectedDisplayLabel || "-- Chọn sản phẩm dịch vụ --"}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-[42px] z-50 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white shadow-xl">
                {/* Search Box inside dropdown */}
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 p-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Gõ để tìm kiếm sản phẩm..."
                      className="w-full rounded border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                  </div>
                </div>

                {loading ? (
                  <div className="px-3 py-3 text-xs text-slate-500">Đang tải danh sách sản phẩm...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    <p>Không thấy sản phẩm nào khớp.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(true);
                        setNewProductName(searchQuery);
                        setDropdownOpen(false);
                      }}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-[#059669] hover:underline"
                    >
                      <Plus size={13} /> Tạo sản phẩm &quot;{searchQuery}&quot; mới
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredProducts.map((prod) => {
                      const isSelected =
                        String(prod.id) === String(selectedProductId) || prod.name === selectedProductName;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            onSelectProduct(prod.id, prod.name);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-emerald-50/70 ${
                            isSelected ? "bg-emerald-50 font-bold text-[#059669]" : "text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <Check size={14} className="text-[#059669]" />}
                            <span>{prod.name}</span>
                          </div>
                          {prod.usage_count > 0 && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              Dùng {prod.usage_count} lần
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plus icon button to open new product input */}
          <button
            type="button"
            title="Thêm sản phẩm mới"
            onClick={() => {
              setIsAddingNew(true);
              setDropdownOpen(false);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-[#059669] transition-colors hover:bg-[#10b981] hover:text-white"
          >
            <Plus size={16} />
          </button>
        </div>
      ) : (
        /* Form nhập sản phẩm mới */
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#059669]">
            <span className="flex items-center gap-1.5">
              <PackagePlus size={15} /> Thêm sản phẩm mới vào hệ thống
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(false);
                setNewProductName("");
                setCreateError("");
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800"
            >
              Hủy
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Nhập tên sản phẩm mới (VD: Margin T+3, Bond Flex...)"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20"
              autoFocus
            />
            <button
              type="button"
              disabled={creating || !newProductName.trim()}
              onClick={handleCreateProduct}
              className="rounded-md bg-[#10b981] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#059669] disabled:opacity-50"
            >
              {creating ? "Đang tạo..." : "Lưu & Chọn"}
            </button>
          </div>

          {createError && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-red-600">
              <AlertCircle size={13} /> {createError}
            </div>
          )}

          {/* Gợi ý sản phẩm gần giống để tránh tạo trùng */}
          {newProductName.trim().length >= 2 && (
            <div className="mt-2 rounded bg-white p-2 border border-slate-200 text-xs">
              <p className="font-semibold text-slate-600 text-[11px] mb-1">
                🔍 Sản phẩm có tên tương tự đã tồn tại trong hệ thống:
              </p>
              {loadingSimilar ? (
                <p className="text-[11px] text-slate-400">Đang tìm kiếm...</p>
              ) : similarProducts.length === 0 ? (
                <p className="text-[11px] italic text-slate-400">Chưa có sản phẩm nào tên gần giống (bạn có thể an tâm tạo mới).</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {similarProducts.map((sim) => (
                    <button
                      key={sim.id}
                      type="button"
                      onClick={() => {
                        onSelectProduct(sim.id, sim.name);
                        setIsAddingNew(false);
                        setNewProductName("");
                      }}
                      className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-[#059669] hover:bg-emerald-100"
                    >
                      <Check size={11} /> {sim.name} ({sim.usage_count} lượt chọn)
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
