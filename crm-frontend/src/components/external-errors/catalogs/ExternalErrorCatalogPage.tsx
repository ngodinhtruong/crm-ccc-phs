"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Power,
  RotateCcw,
  Save,
} from "lucide-react";

import {
  FilterSelect,
  SearchInput,
  TableState,
  TableToolbar,
} from "@/components/common";
import { useExternalErrorCatalogs } from "@/hooks/useExternalErrorCatalogs";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  ExternalErrorCode,
  ExternalErrorGroup,
} from "@/types/external-error.type";

type CatalogState = ReturnType<typeof useExternalErrorCatalogs>;

export function ExternalErrorCatalogPage() {
  const state = useExternalErrorCatalogs();

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "TRANG CHỦ", href: "/" },
        { label: "Lỗi bên ngoài", href: "/external-errors" },
        { label: "Nhóm lỗi - Mã lỗi" },
      ]}
      rightAction={
        <Link
          href="/external-errors"
          className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={14} />
          Quay lại
        </Link>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h1 className="text-sm font-semibold text-slate-800">
            Quản lý nhóm lỗi - mã lỗi
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            LLM luôn sử dụng các nhóm và mã lỗi đang Active tại thời điểm
            phân loại; không có danh mục cố định trong frontend.
          </p>
        </div>

        {(state.error || state.success) && (
          <div
            className={`border-b px-4 py-2 text-xs ${
              state.error
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {state.error || state.success}
          </div>
        )}

        <div className="grid grid-cols-1 border-b bg-[#f8fafc] md:grid-cols-[230px_1fr]">
          <div className="border-r border-slate-200 bg-white p-3">
            <button
              type="button"
              onClick={() => state.setActiveTab("groups")}
              className={`mb-2 block w-full rounded-md border px-3 py-3 text-left text-xs ${
                state.activeTab === "groups"
                  ? "border-sky-400 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <div className="font-semibold">Nhóm lỗi</div>
              <div className="mt-1 text-[11px] text-slate-500">
                Một nhóm có nhiều mã lỗi.
              </div>
            </button>

            <button
              type="button"
              onClick={() => state.setActiveTab("codes")}
              className={`block w-full rounded-md border px-3 py-3 text-left text-xs ${
                state.activeTab === "codes"
                  ? "border-sky-400 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <div className="font-semibold">Mã lỗi</div>
              <div className="mt-1 text-[11px] text-slate-500">
                Mỗi mã chỉ thuộc một nhóm.
              </div>
            </button>
          </div>

          <div className="min-w-0">
            <TableToolbar
              onSearch={state.loadData}
              onClear={state.clearFilter}
            >
              <div className="col-span-12 md:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Tìm kiếm
                </label>
                <SearchInput
                  value={state.keyword}
                  onChange={state.setKeyword}
                  placeholder="Mã, tên, mô tả, từ khóa..."
                />
              </div>

              {state.activeTab === "codes" && (
                <div className="col-span-6 md:col-span-3">
                  <FilterSelect
                    label="Nhóm lỗi"
                    value={state.groupFilter}
                    onChange={state.setGroupFilter}
                    options={state.groups.map((item) => ({
                      value: String(item.id),
                      label: item.group_name,
                    }))}
                  />
                </div>
              )}

              <div className="col-span-6 md:col-span-2">
                <FilterSelect
                  label="Trạng thái"
                  value={state.activeFilter}
                  onChange={state.setActiveFilter}
                  options={[
                    { value: "true", label: "Đang dùng" },
                    { value: "false", label: "Tạm tắt" },
                  ]}
                />
              </div>
            </TableToolbar>

            <div className="grid gap-4 p-4 xl:grid-cols-[390px_1fr]">
              <div className="rounded-md border border-slate-200 bg-white">
                <div className="border-b px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {state.activeTab === "groups"
                      ? state.groupForm.id
                        ? "Sửa nhóm lỗi"
                        : "Thêm nhóm lỗi"
                      : state.codeForm.id
                        ? "Sửa mã lỗi"
                        : "Thêm mã lỗi"}
                  </h2>
                </div>

                <div className="p-4">
                  {state.activeTab === "groups" ? (
                    <GroupForm state={state} />
                  ) : (
                    <CodeForm state={state} />
                  )}
                </div>
              </div>

              <div className="min-w-0 rounded-md border border-slate-200 bg-white">
                <div className="flex h-11 items-center justify-between border-b px-4">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {state.activeTab === "groups"
                      ? "Danh sách nhóm lỗi"
                      : "Danh sách mã lỗi"}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {state.activeTab === "groups"
                      ? `${state.filteredGroups.length} dòng`
                      : `${state.filteredCodes.length} dòng`}
                  </span>
                </div>

                {state.activeTab === "groups" ? (
                  <GroupTable state={state} />
                ) : (
                  <CodeTable state={state} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function GroupForm({ state }: { state: CatalogState }) {
  const form = state.groupForm;

  return (
    <form onSubmit={state.saveGroup} className="space-y-3">
      <Field label="Mã nhóm" required>
        <TextInput
          value={form.groupCode}
          onChange={(value) =>
            state.setGroupForm((previous) => ({
              ...previous,
              groupCode: value,
            }))
          }
          placeholder="VD: LOGIN"
        />
      </Field>

      <Field label="Tên nhóm" required>
        <TextInput
          value={form.groupName}
          onChange={(value) =>
            state.setGroupForm((previous) => ({
              ...previous,
              groupName: value,
            }))
          }
          placeholder="VD: Đăng Nhập"
        />
      </Field>

      <Field label="Mô tả">
        <textarea
          value={form.description}
          onChange={(event) =>
            state.setGroupForm((previous) => ({
              ...previous,
              description: event.target.value,
            }))
          }
          rows={3}
          className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
        />
      </Field>

      <Field label="Thứ tự">
        <input
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={(event) =>
            state.setGroupForm((previous) => ({
              ...previous,
              sortOrder: event.target.value,
            }))
          }
          className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
        />
      </Field>

      <ActiveCheckbox
        checked={form.isActive}
        onChange={(value) =>
          state.setGroupForm((previous) => ({
            ...previous,
            isActive: value,
          }))
        }
      />

      <FormActions
        saving={state.saving}
        editing={Boolean(form.id)}
        onReset={state.resetGroupForm}
      />
    </form>
  );
}

function CodeForm({ state }: { state: CatalogState }) {
  const form = state.codeForm;

  return (
    <form onSubmit={state.saveCode} className="space-y-3">
      <Field label="Nhóm lỗi" required>
        <select
          value={form.group}
          onChange={(event) =>
            state.setCodeForm((previous) => ({
              ...previous,
              group: event.target.value,
            }))
          }
          className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400"
        >
          <option value="">Chọn nhóm lỗi</option>
          {state.groups
            .filter(
              (item) =>
                item.is_active ||
                String(item.id) === form.group
            )
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.group_code} - {item.group_name}
              </option>
            ))}
        </select>
      </Field>

      <Field label="Mã lỗi" required>
        <TextInput
          value={form.errorCode}
          onChange={(value) =>
            state.setCodeForm((previous) => ({
              ...previous,
              errorCode: value,
            }))
          }
          placeholder="VD: ĐN001"
        />
      </Field>

      <Field label="Tên lỗi" required>
        <TextInput
          value={form.errorName}
          onChange={(value) =>
            state.setCodeForm((previous) => ({
              ...previous,
              errorName: value,
            }))
          }
          placeholder="VD: Không đăng nhập được"
        />
      </Field>

      <Field label="Mô tả">
        <textarea
          value={form.description}
          onChange={(event) =>
            state.setCodeForm((previous) => ({
              ...previous,
              description: event.target.value,
            }))
          }
          rows={3}
          className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
        />
      </Field>

      <Field label="Từ khóa hỗ trợ LLM">
        <textarea
          value={form.keywords}
          onChange={(event) =>
            state.setCodeForm((previous) => ({
              ...previous,
              keywords: event.target.value,
            }))
          }
          rows={3}
          placeholder="Mỗi dòng hoặc phân cách bằng dấu phẩy"
          className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
        />
      </Field>

      <Field label="Ví dụ hỗ trợ LLM">
        <textarea
          value={form.examples}
          onChange={(event) =>
            state.setCodeForm((previous) => ({
              ...previous,
              examples: event.target.value,
            }))
          }
          rows={3}
          placeholder="Mỗi dòng một ví dụ"
          className="w-full rounded border border-slate-300 px-3 py-2 text-xs outline-none focus:border-sky-400"
        />
      </Field>

      <Field label="Thứ tự">
        <input
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={(event) =>
            state.setCodeForm((previous) => ({
              ...previous,
              sortOrder: event.target.value,
            }))
          }
          className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
        />
      </Field>

      <ActiveCheckbox
        checked={form.isActive}
        onChange={(value) =>
          state.setCodeForm((previous) => ({
            ...previous,
            isActive: value,
          }))
        }
      />

      <FormActions
        saving={state.saving}
        editing={Boolean(form.id)}
        onReset={state.resetCodeForm}
      />
    </form>
  );
}

function GroupTable({ state }: { state: CatalogState }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-[#f8fafc]">
            <th className="px-3 font-semibold">Mã</th>
            <th className="px-3 font-semibold">Tên nhóm</th>
            <th className="px-3 font-semibold">Số mã lỗi</th>
            <th className="px-3 font-semibold">Trạng thái</th>
            <th className="px-3 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <TableState
            loading={state.loading}
            error=""
            empty={!state.loading && state.filteredGroups.length === 0}
            colSpan={5}
            emptyText="Không có nhóm lỗi."
          />
          {!state.loading &&
            state.filteredGroups.map((item) => (
              <tr
                key={item.id}
                className="h-12 border-b border-slate-100 hover:bg-sky-50"
              >
                <td className="px-3 font-semibold text-slate-700">
                  {item.group_code}
                </td>
                <td className="px-3">
                  <div className="font-semibold text-slate-700">
                    {item.group_name}
                  </div>
                  <div className="line-clamp-1 text-[11px] text-slate-400">
                    {item.description || "-"}
                  </div>
                </td>
                <td className="px-3 text-slate-600">
                  {item.error_code_count}
                </td>
                <td className="px-3">
                  <StatusBadge active={item.is_active} />
                </td>
                <td className="px-3">
                  <RowActions
                    item={item}
                    onEdit={() => state.editGroup(item)}
                    onToggle={() =>
                      void state.toggleGroupActive(item)
                    }
                    disabled={state.actionLoading}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeTable({ state }: { state: CatalogState }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-[#f8fafc]">
            <th className="px-3 font-semibold">Mã lỗi</th>
            <th className="px-3 font-semibold">Tên lỗi</th>
            <th className="px-3 font-semibold">Nhóm lỗi</th>
            <th className="px-3 font-semibold">Từ khóa</th>
            <th className="px-3 font-semibold">Trạng thái</th>
            <th className="px-3 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <TableState
            loading={state.loading}
            error=""
            empty={!state.loading && state.filteredCodes.length === 0}
            colSpan={6}
            emptyText="Không có mã lỗi."
          />
          {!state.loading &&
            state.filteredCodes.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-100 align-top hover:bg-sky-50"
              >
                <td className="px-3 py-3 font-semibold text-slate-700">
                  {item.error_code}
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold text-slate-700">
                    {item.error_name}
                  </div>
                  <div className="line-clamp-2 text-[11px] text-slate-400">
                    {item.description || "-"}
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {item.group_name}
                </td>
                <td className="max-w-[240px] px-3 py-3 text-[11px] text-slate-500">
                  {(item.keywords || []).join(", ") || "-"}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge active={item.is_active} />
                </td>
                <td className="px-3 py-3">
                  <RowActions
                    item={item}
                    onEdit={() => state.editCode(item)}
                    onToggle={() =>
                      void state.toggleCodeActive(item)
                    }
                    disabled={state.actionLoading}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded border border-slate-300 px-3 text-xs outline-none focus:border-sky-400"
    />
  );
}

function ActiveCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Đang dùng
    </label>
  );
}

function FormActions({
  saving,
  editing,
  onReset,
}: {
  saving: boolean;
  editing: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="submit"
        disabled={saving}
        className="flex h-9 items-center gap-1 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd] disabled:opacity-50"
      >
        <Save size={14} />
        {saving
          ? "Đang lưu..."
          : editing
            ? "Cập nhật"
            : "Thêm mới"}
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

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Đang dùng" : "Tạm tắt"}
    </span>
  );
}

function RowActions({
  item,
  onEdit,
  onToggle,
  disabled,
}: {
  item: ExternalErrorGroup | ExternalErrorCode;
  onEdit: () => void;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <Pencil size={12} />
        Sửa
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <Power size={12} />
        {item.is_active ? "Tắt" : "Bật"}
      </button>
    </div>
  );
}
