"use client";

import React, { useEffect, useState, useRef } from "react";
import { Plus, Search, Check, HelpCircle, AlertCircle, ChevronDown, X, Sparkles, TrendingUp } from "lucide-react";
import { SaSupportCategory } from "@/types/sale-admin.type";
import { saleAdminApi } from "@/apis/sale-admin.api";

interface SaSupportCategorySelectComboboxProps {
  selectedCategoryId?: number | string | null;
  selectedCategoryName?: string | null;
  onSelectCategory: (categoryId: number | null, categoryName: string) => void;
}

export function SaSupportCategorySelectCombobox({
  selectedCategoryId,
  selectedCategoryName,
  onSelectCategory,
}: SaSupportCategorySelectComboboxProps) {
  const [categories, setCategories] = useState<SaSupportCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mode tạo danh mục mới
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [similarCategories, setSimilarCategories] = useState<SaSupportCategory[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch danh sách danh mục hỗ trợ ban đầu
  const fetchCategories = async (search?: string) => {
    try {
      setLoading(true);
      const res = await saleAdminApi.getSaSupportCategories(search);
      setCategories(res || []);
    } catch (err) {
      console.error("Lỗi tải danh mục hỗ trợ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setIsAddingNew(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tim kiem danh muc tuong tu khi gõ ten moi
  useEffect(() => {
    if (!isAddingNew || !newCategoryName.trim()) {
      setSimilarCategories([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingSimilar(true);
        const res = await saleAdminApi.getSimilarSaSupportCategories(newCategoryName);
        setSimilarCategories(res || []);
      } catch (err) {
        console.error("Lỗi tìm danh mục tương tự:", err);
      } finally {
        setLoadingSimilar(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [newCategoryName, isAddingNew]);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCategory = async (overrideName?: string) => {
    const targetName = (overrideName || newCategoryName).trim();
    if (!targetName) {
      setCreateError("Vui lòng nhập tên danh mục hỗ trợ mới.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");
      const createdCategory = await saleAdminApi.createSaSupportCategory({ name: targetName });
      await fetchCategories();
      onSelectCategory(createdCategory.id, createdCategory.name);
      setIsAddingNew(false);
      setNewCategoryName("");
      setDropdownOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.name?.[0] || err?.message || "Không thể tạo danh mục mới";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const selectedDisplayLabel =
    selectedCategoryName ||
    categories.find((c) => String(c.id) === String(selectedCategoryId))?.name ||
    "";

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Container chọn hoặc hiển thị danh mục hỗ trợ đã chọn */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {selectedDisplayLabel && !dropdownOpen ? (
            /* Badge hiển thị khi đã chọn danh mục */
            <div className="flex items-center justify-between rounded-lg border border-sky-300 bg-sky-50/80 px-3 py-2 text-xs font-bold text-[#0284c7] shadow-sm transition-all hover:bg-sky-100/80">
              <span className="flex items-center gap-2 truncate">
                <Sparkles size={14} className="shrink-0 text-sky-600" />
                <span className="truncate">{selectedDisplayLabel}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(true)}
                  className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-200/60"
                >
                  Đổi nội dung
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory(null, "")}
                  title="Xóa lựa chọn"
                  className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Button mở dropdown */
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((prev) => !prev);
                setIsAddingNew(false);
              }}
              className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm transition-all hover:border-[#0284c7] focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
            >
              <span className={selectedDisplayLabel ? "font-semibold text-[#0284c7]" : "text-slate-400"}>
                {selectedDisplayLabel || "-- Bấm để chọn danh mục thông tin hỗ trợ --"}
              </span>
              <ChevronDown size={14} className="text-slate-400 transition-transform duration-200" />
            </button>
          )}

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-[42px] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all">
              {!isAddingNew ? (
                <div>
                  {/* Search Header */}
                  <div className="border-b border-slate-100 bg-slate-50/80 p-2.5 space-y-2">
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo nội dung / danh mục hỗ trợ..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
                        autoFocus
                      />
                      <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-[#0284c7]" /> Ưu tiên xếp theo chọn nhiều
                      </span>
                      <span>{categories.length} Danh mục hiện có</span>
                    </div>
                  </div>

                  {/* Categories list */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {loading ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                        <span className="h-2 w-2 animate-ping rounded-full bg-[#0284c7]" />
                        Đang tải danh mục hỗ trợ...
                      </div>
                    ) : filteredCategories.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                        <p>Không tìm thấy danh mục khớp với &quot;{searchQuery}&quot;</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNew(true);
                            setNewCategoryName(searchQuery);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-[#0284c7] hover:bg-sky-100"
                        >
                          <Plus size={14} /> Nhập & Tạo danh mục mới này
                        </button>
                      </div>
                    ) : (
                      filteredCategories.map((cat) => {
                        const isSelected =
                          String(cat.id) === String(selectedCategoryId) || cat.name === selectedCategoryName;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              onSelectCategory(cat.id, cat.name);
                              setDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs transition-colors hover:bg-sky-50/70 ${
                              isSelected ? "bg-sky-50 font-bold text-[#0284c7]" : "text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {isSelected ? (
                                <Check size={14} className="shrink-0 text-[#0284c7]" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                              )}
                              <span className="truncate">{cat.name}</span>
                            </div>
                            {cat.usage_count > 0 && (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {cat.usage_count} lượt hỗ trợ
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown footer: Quick Create Button */}
                  <div className="border-t border-slate-100 bg-slate-50 p-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(true);
                        setNewCategoryName(searchQuery);
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-400 bg-sky-50/70 px-3 py-1.5 text-xs font-bold text-[#0284c7] transition-colors hover:bg-sky-100"
                    >
                      <Plus size={14} /> Thêm danh mục hỗ trợ mới vào hệ thống
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode Nhập danh mục mới trong dropdown */
                <div className="p-3 space-y-3 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#0284c7]">
                      <HelpCircle size={16} /> Thêm mới danh mục hỗ trợ
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewCategoryName("");
                        setCreateError("");
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="relative flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nhập tên danh mục (VD: Hướng dẫn eKYC, Mở rộng hạn mức...)"
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={creating || !newCategoryName.trim()}
                        onClick={() => handleCreateCategory()}
                        className="shrink-0 rounded-md bg-[#0284c7] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0369a1] disabled:opacity-50"
                      >
                        {creating ? "Đang tạo..." : "Tạo & Chọn"}
                      </button>
                    </div>

                    {createError && (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-red-600">
                        <AlertCircle size={13} /> {createError}
                      </div>
                    )}

                    {/* Check danh mục tương tự đã có */}
                    {newCategoryName.trim().length >= 1 && (
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                        <p className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                          <Search size={12} className="text-sky-600" /> Danh mục hỗ trợ tương tự đã tồn tại:
                        </p>
                        {loadingSimilar ? (
                          <p className="text-[11px] text-slate-400">Đang kiểm tra trùng lặp...</p>
                        ) : similarCategories.length === 0 ? (
                          <p className="text-[11px] text-sky-700 italic">
                            Chưa có danh mục nào tương tự. Bạn có thể tự tin tạo mới!
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto">
                            {similarCategories.map((sim) => (
                              <button
                                key={sim.id}
                                type="button"
                                onClick={() => {
                                  onSelectCategory(sim.id, sim.name);
                                  setIsAddingNew(false);
                                  setDropdownOpen(false);
                                  setNewCategoryName("");
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0284c7] shadow-sm hover:bg-sky-50 transition-colors"
                              >
                                <Check size={12} /> {sim.name} ({sim.usage_count} lần)
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút cộng Nhanh mở ô tạo danh mục mới */}
        {!selectedDisplayLabel && !isAddingNew && (
          <button
            type="button"
            title="Thêm danh mục hỗ trợ mới"
            onClick={() => {
              setDropdownOpen(true);
              setIsAddingNew(true);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-300 bg-sky-50 text-[#0284c7] transition-all hover:bg-[#0284c7] hover:text-white shadow-sm"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
