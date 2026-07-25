"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, UserRound, X } from "lucide-react";

import { NEW_EMPLOYEE_VALUE, UserEmployeeOption } from "@/types/user.type";

function normalize(value: unknown) {
  return String(value || "").trim().toLocaleLowerCase("vi");
}

function getEmployeeBranchName(employee: UserEmployeeOption) {
  if (employee.branch_name) return employee.branch_name;
  if (employee.branch && typeof employee.branch === "object") {
    return employee.branch.branch_name || "";
  }
  return "";
}

function getEmployeeLabel(employee: UserEmployeeOption) {
  const name = employee.full_name || `Nhân viên ${employee.id}`;
  const code = employee.employee_code ? ` · ${employee.employee_code}` : "";
  return `${name}${code}`;
}

function getEmployeeMeta(employee: UserEmployeeOption) {
  return [
    employee.email,
    getEmployeeBranchName(employee),
    employee.primary_organization_unit_name || employee.department,
    employee.position,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function EmployeePicker({
  value,
  employees,
  loading,
  onChange,
}: {
  value: string;
  employees: UserEmployeeOption[];
  loading?: boolean;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const selectedEmployee = useMemo(() => {
    if (value === NEW_EMPLOYEE_VALUE) return null;
    return employees.find((item) => String(item.id) === value) || null;
  }, [employees, value]);

  const selectedLabel = selectedEmployee
    ? getEmployeeLabel(selectedEmployee)
    : "Tạo nhân viên mới";

  const filteredEmployees = useMemo(() => {
    const searchText = normalize(keyword);

    const data = searchText
      ? employees.filter((employee) => {
          const haystack = [
            employee.full_name,
            employee.employee_code,
            employee.email,
            employee.phone,
            getEmployeeBranchName(employee),
            employee.primary_organization_unit_name,
            employee.department,
            employee.position,
          ]
            .map(normalize)
            .join(" ");

          return haystack.includes(searchText);
        })
      : employees;

    return data.slice(0, 30);
  }, [employees, keyword]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setKeyword("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setKeyword("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex h-10 items-center rounded-md border border-slate-300 bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
        <Search size={15} className="ml-3 shrink-0 text-slate-400" />
        <input
          value={open ? keyword : selectedLabel}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setKeyword(event.target.value);
            setOpen(true);
          }}
          placeholder="Tìm theo tên, mã nhân viên, email..."
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />

        {value !== NEW_EMPLOYEE_VALUE && (
          <button
            type="button"
            onClick={() => selectValue(NEW_EMPLOYEE_VALUE)}
            className="flex h-full w-8 items-center justify-center text-slate-400 hover:text-red-500"
            title="Bỏ chọn nhân viên có sẵn"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          className="flex h-full w-9 items-center justify-center border-l border-slate-200 text-slate-500 hover:bg-slate-50"
          title="Mở danh sách"
        >
          <ChevronDown size={15} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-11 z-[200] max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectValue(NEW_EMPLOYEE_VALUE)}
            className="flex w-full items-start gap-3 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-sky-50"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
              <Plus size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-slate-800">
                Tạo nhân viên mới
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Nhập hồ sơ Employee mới ở các trường bên dưới.
              </span>
            </span>
            {value === NEW_EMPLOYEE_VALUE && (
              <Check size={15} className="mt-1 shrink-0 text-sky-600" />
            )}
          </button>

          {loading ? (
            <div className="px-3 py-4 text-xs text-slate-500">
              Đang tải danh sách nhân viên...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500">
              Không tìm thấy nhân viên chưa có tài khoản.
            </div>
          ) : (
            filteredEmployees.map((employee) => {
              const employeeId = String(employee.id);
              const active = employeeId === value;

              return (
                <button
                  key={employee.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectValue(employeeId)}
                  className={[
                    "flex w-full items-start gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-sky-50",
                    active ? "bg-sky-50" : "bg-white",
                  ].join(" ")}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <UserRound size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-800">
                      {getEmployeeLabel(employee)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                      {getEmployeeMeta(employee) || "Chưa có thông tin bổ sung"}
                    </span>
                  </span>
                  {active && (
                    <Check size={15} className="mt-1 shrink-0 text-sky-600" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
