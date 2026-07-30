"use client";

import { ArrowLeft, Pencil, Power, RotateCcw, Save } from "lucide-react";

import {
  FilterSelect,
  SearchInput,
  TableState,
  TableToolbar,
} from "@/components/common";
import { useTicketErrorCatalogs } from "@/hooks/useTicketErrorCatalogs";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { TicketErrorGroupOption, TicketErrorTypeOption } from "@/types/ticket.type";

type TabKey = "groups" | "types";

const tabs: { key: TabKey; label: string; description: string }[] = [
  {
    key: "groups",
    label: "Nhóm lỗi",
    description: "Cấp lớn nhất của lỗi, ví dụ Lỗi giao dịch, Lỗi tài khoản.",
  },
  {
    key: "types",
    label: "Loại lỗi",
    description: "Loại lỗi thuộc một nhóm lỗi cụ thể.",
  },
];

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
        Đang dùng
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
      Tạm tắt
    </span>
  );
}

function EmptyDash({ value }: { value?: string | null }) {
  return <>{value && value.trim() ? value : "-"}</>;
}

export function TicketErrorCatalogPage() {
  const catalog = useTicketErrorCatalogs();
  const activeTab = tabs.find((item) => item.key === catalog.activeTab) || tabs[0];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Tickets", href: "/tickets" },
        { label: "Danh mục lỗi" },
      ]}
      rightAction={
        <button
          type="button"
          onClick={catalog.goBack}
          className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={15} />
          Quay lại Ticket
        </button>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-white px-4 py-3">
          <h1 className="text-sm font-semibold text-slate-800">Danh mục lỗi Ticket</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Quản lý cấu trúc lỗi: Nhóm lỗi → Loại lỗi. Ghi chú lỗi thực tế sẽ do CCC nhập trực tiếp trên ticket.
          </p>
        </div>

        {(catalog.error || catalog.success) && (
          <div
            className={`border-b px-4 py-2 text-xs ${
              catalog.error
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {catalog.error || catalog.success}
          </div>
        )}

        <div className="grid grid-cols-1 border-b bg-[#f8fafc] md:grid-cols-[240px_1fr]">
          <div className="border-r border-slate-200 bg-white p-3">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const active = catalog.activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => catalog.setActiveTab(tab.key)}
                    className={`block w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                      active
                        ? "border-[#10b981] bg-emerald-50 text-[#059669]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold">{tab.label}</div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                      {tab.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <TableToolbar onSearch={catalog.loadData} onClear={catalog.clearFilter}>
              <div className="col-span-12 md:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Tìm kiếm
                </label>
                <SearchInput
                  value={catalog.keyword}
                  onChange={catalog.setKeyword}
                  placeholder="Mã, tên, mô tả..."
                />
              </div>

              {catalog.activeTab === "types" && (
                <div className="col-span-12 md:col-span-3">
                  <FilterSelect
                    label="Nhóm lỗi"
                    value={catalog.groupFilter}
                    onChange={catalog.setGroupFilter}
                    options={catalog.groups.map((item) => ({
                      label: item.group_name,
                      value: String(item.id),
                    }))}
                  />
                </div>
              )}
            </TableToolbar>

            <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[360px_1fr]">
              <div className="rounded-md border border-slate-200 bg-white">
                <div className="border-b px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {catalog.activeTab === "groups" && (catalog.groupForm.id ? "Sửa nhóm lỗi" : "Thêm nhóm lỗi")}
                    {catalog.activeTab === "types" && (catalog.typeForm.id ? "Sửa loại lỗi" : "Thêm loại lỗi")}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">{activeTab.description}</p>
                </div>

                <div className="p-4">
                  {catalog.activeTab === "groups" && <GroupForm catalog={catalog} />}
                  {catalog.activeTab === "types" && <TypeForm catalog={catalog} />}
                </div>
              </div>

              <div className="min-w-0 rounded-md border border-slate-200 bg-white">
                <div className="flex h-11 items-center justify-between border-b px-4">
                  <h2 className="text-sm font-semibold text-slate-800">{activeTab.label}</h2>
                  <span className="text-xs text-slate-500">
                    {catalog.activeTab === "groups" && `${catalog.filteredGroups.length} dòng`}
                    {catalog.activeTab === "types" && `${catalog.filteredTypes.length} dòng`}
                  </span>
                </div>

                {catalog.activeTab === "groups" && <GroupTable catalog={catalog} />}
                {catalog.activeTab === "types" && <TypeTable catalog={catalog} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

type CatalogReturn = ReturnType<typeof useTicketErrorCatalogs>;

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-600">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-500"
    />
  );
}

function ActiveCheckbox({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Đang dùng
    </label>
  );
}

function FormActions({ saving, editing, onReset }: { saving: boolean; editing: boolean; onReset: () => void }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        type="submit"
        disabled={saving}
        className="flex h-9 items-center gap-1 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={14} />
        {saving ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm mới"}
      </button>

      <button
        type="button"
        onClick={onReset}
        className="flex h-9 items-center gap-1 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      >
        <RotateCcw size={14} />
        Làm mới
      </button>
    </div>
  );
}

function GroupForm({ catalog }: { catalog: CatalogReturn }) {
  const form = catalog.groupForm;

  return (
    <form onSubmit={catalog.saveGroup} className="space-y-3">
      <div>
        <FieldLabel required>Mã nhóm lỗi</FieldLabel>
        <TextInput value={form.groupCode} onChange={(value) => catalog.setGroupForm((prev) => ({ ...prev, groupCode: value }))} placeholder="VD: TRANSACTION" />
      </div>

      <div>
        <FieldLabel required>Tên nhóm lỗi</FieldLabel>
        <TextInput value={form.groupName} onChange={(value) => catalog.setGroupForm((prev) => ({ ...prev, groupName: value }))} placeholder="VD: Lỗi giao dịch" />
      </div>

      <div>
        <FieldLabel>Mô tả</FieldLabel>
        <textarea
          value={form.description}
          onChange={(event) => catalog.setGroupForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={3}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
        />
      </div>

      <ActiveCheckbox checked={form.isActive} onChange={(value) => catalog.setGroupForm((prev) => ({ ...prev, isActive: value }))} />
      <FormActions saving={catalog.saving} editing={Boolean(form.id)} onReset={catalog.resetGroupForm} />
    </form>
  );
}

function TypeForm({ catalog }: { catalog: CatalogReturn }) {
  const form = catalog.typeForm;

  return (
    <form onSubmit={catalog.saveType} className="space-y-3">
      <div>
        <FieldLabel required>Nhóm lỗi</FieldLabel>
        <select
          value={form.group}
          onChange={(event) => catalog.setTypeForm((prev) => ({ ...prev, group: event.target.value }))}
          className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-emerald-500"
        >
          <option value="">Chọn nhóm lỗi</option>
          {catalog.groups.map((item) => (
            <option key={item.id} value={item.id}>{item.group_name}</option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel required>Mã loại lỗi</FieldLabel>
        <TextInput value={form.typeCode} onChange={(value) => catalog.setTypeForm((prev) => ({ ...prev, typeCode: value }))} placeholder="VD: ORDER_TIMEOUT" />
      </div>

      <div>
        <FieldLabel required>Tên loại lỗi</FieldLabel>
        <TextInput value={form.typeName} onChange={(value) => catalog.setTypeForm((prev) => ({ ...prev, typeName: value }))} placeholder="VD: Lỗi đặt lệnh" />
      </div>

      <div>
        <FieldLabel>Mô tả</FieldLabel>
        <textarea
          value={form.description}
          onChange={(event) => catalog.setTypeForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={3}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
        />
      </div>

      <ActiveCheckbox checked={form.isActive} onChange={(value) => catalog.setTypeForm((prev) => ({ ...prev, isActive: value }))} />
      <FormActions saving={catalog.saving} editing={Boolean(form.id)} onReset={catalog.resetTypeForm} />
    </form>
  );
}

function RowActions({ onEdit, onToggle, active }: { onEdit: () => void; onToggle: () => void; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onEdit} className="flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
        <Pencil size={12} />
        Sửa
      </button>
      <button type="button" onClick={onToggle} className="flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
        <Power size={12} />
        {active ? "Tắt" : "Bật"}
      </button>
    </div>
  );
}

function GroupTable({ catalog }: { catalog: CatalogReturn }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="h-10 border-b bg-[#f8fafc] text-slate-700">
            <th className="px-4 font-semibold">Mã</th>
            <th className="px-4 font-semibold">Tên nhóm lỗi</th>
            <th className="px-4 font-semibold">Mô tả</th>
            <th className="px-4 font-semibold">Trạng thái</th>
            <th className="px-4 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <TableState loading={catalog.loading} error="" empty={!catalog.loading && catalog.filteredGroups.length === 0} colSpan={5} emptyText="Không có nhóm lỗi." />
          {!catalog.loading && catalog.filteredGroups.map((item: TicketErrorGroupOption) => (
            <tr key={item.id} className="h-[46px] border-b border-slate-200 hover:bg-emerald-50">
              <td className="px-4 font-semibold text-slate-700">{item.group_code}</td>
              <td className="px-4 text-slate-700">{item.group_name}</td>
              <td className="max-w-[260px] truncate px-3"><EmptyDash value={item.description} /></td>
              <td className="px-4 text-slate-700"><StatusBadge active={item.is_active} /></td>
              <td className="px-4 text-slate-700"><RowActions active={item.is_active} onEdit={() => catalog.editGroup(item)} onToggle={() => void catalog.toggleGroupActive(item)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TypeTable({ catalog }: { catalog: CatalogReturn }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="h-10 border-b bg-[#f8fafc] text-slate-700">
            <th className="px-4 font-semibold">Nhóm lỗi</th>
            <th className="px-4 font-semibold">Mã</th>
            <th className="px-4 font-semibold">Tên loại lỗi</th>
            <th className="px-4 font-semibold">Mô tả</th>
            <th className="px-4 font-semibold">Trạng thái</th>
            <th className="px-4 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <TableState loading={catalog.loading} error="" empty={!catalog.loading && catalog.filteredTypes.length === 0} colSpan={6} emptyText="Không có loại lỗi." />
          {!catalog.loading && catalog.filteredTypes.map((item: TicketErrorTypeOption) => (
            <tr key={item.id} className="h-[46px] border-b border-slate-200 hover:bg-emerald-50">
              <td className="px-4 text-slate-700">{item.group_name || "-"}</td>
              <td className="px-4 font-semibold text-slate-700">{item.type_code}</td>
              <td className="px-4 text-slate-700">{item.type_name}</td>
              <td className="max-w-[260px] truncate px-3"><EmptyDash value={item.description} /></td>
              <td className="px-4 text-slate-700"><StatusBadge active={item.is_active} /></td>
              <td className="px-4 text-slate-700"><RowActions active={item.is_active} onEdit={() => catalog.editType(item)} onToggle={() => void catalog.toggleTypeActive(item)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
