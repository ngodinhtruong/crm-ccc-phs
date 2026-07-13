"use client";

import { useUserCreate } from "@/hooks/useUserCreate";

import {
    FieldLabel,
    SelectInput,
    TextInput,
} from "./UserCreateFormControls";

type UserCreateController = ReturnType<typeof useUserCreate>;

export function UserAccountSection({
    create,
}: {
    create: UserCreateController;
}) {
    return (
        <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                Thông tin tài khoản
            </h2>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                    <FieldLabel required>Email</FieldLabel>
                    <TextInput
                        type="email"
                        value={create.form.email}
                        onChange={(value) => create.setField("email", value)}
                        placeholder="Tự điền từ email Employee hoặc nhập thủ công"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel required>Status</FieldLabel>
                    <SelectInput
                        value={create.form.status}
                        onChange={(value) => {
                            create.setField("status", value);
                            create.setField("isActive", value === "ACTIVE");
                        }}
                    >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="LOCKED">LOCKED</option>
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-5">
                    <FieldLabel>Tài khoản đăng nhập</FieldLabel>
                    <div className="flex h-9 items-center rounded border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
                        Username:{" "}
                        <span className="ml-1 font-semibold text-slate-800">
                            {create.form.username || "MÃ NHÂN VIÊN "}
                        </span>
                        <span className="ml-3 text-slate-400">
                            Mật khẩu mặc định:{" "}
                            {create.form.username ? `${create.form.username}123` : "-"}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function UserEmployeeSection({
    create,
}: {
    create: UserCreateController;
}) {
    return (
        <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                Hồ sơ nhân viên
            </h2>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                    <FieldLabel>Chọn Employee có sẵn</FieldLabel>
                    <SelectInput
                        value={create.form.employeeId}
                        onChange={create.changeEmployee}
                    >
                        <option value="">
                            {create.loadingMaster ? "Đang tải..." : "Không chọn - nhập Employee mới"}
                        </option>

                        {create.employees.map((item) => (
                            <option key={item.id} value={item.id}>
                                {create.getEmployeeName(item)}
                            </option>
                        ))}
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-2">
                    <FieldLabel required>Mã nhân viên</FieldLabel>
                    <TextInput
                        value={create.form.employeeCode}
                        readOnly={create.employeeLocked}
                        onChange={create.changeEmployeeCode}
                        placeholder="VD: NV001"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel required>Họ tên nhân viên</FieldLabel>
                    <TextInput
                        value={create.form.employeeFullName}
                        readOnly={create.employeeLocked}
                        onChange={create.changeEmployeeFullName}
                        placeholder="Nguyễn Văn A"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel required>Chi nhánh nhân viên</FieldLabel>
                    <SelectInput
                        value={create.form.employeeBranchId}
                        disabled={create.employeeLocked}
                        onChange={create.changeEmployeeBranch}
                    >
                        <option value="">Chọn chi nhánh</option>

                        {create.branches.map((item) => (
                            <option key={item.id} value={item.id}>
                                {create.getBranchName(item)}
                            </option>
                        ))}
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Phòng ban</FieldLabel>
                    <TextInput
                        value={create.form.employeeDepartment}
                        readOnly={create.employeeLocked}
                        onChange={(value) => create.setField("employeeDepartment", value)}
                        placeholder="VD: Sale Admin"
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Chức vụ</FieldLabel>
                    <TextInput
                        value={create.form.employeePosition}
                        readOnly={create.employeeLocked}
                        onChange={(value) => create.setField("employeePosition", value)}
                        placeholder="VD: Staff / Supervisor"
                    />
                </div>
            </div>
        </section>
    );
}

export function UserRoleAccessSection({
    create,
}: {
    create: UserCreateController;
}) {
    return (
        <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">
                Phân quyền
            </h2>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3">
                    <FieldLabel required>Group</FieldLabel>
                    <SelectInput
                        value={create.form.groupCode}
                        onChange={create.changeGroupCode}
                    >
                        <option value="SALE_ADMIN">Sale Admin</option>
                        <option value="CCC">CCC</option>
                        <option value="GLOBAL">Global/Admin</option>
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-4">
                    <FieldLabel required>Role</FieldLabel>
                    <SelectInput
                        value={create.form.roleId}
                        onChange={create.changeRoleId}
                    >
                        <option value="">
                            {create.loadingMaster ? "Đang tải..." : "Chọn role"}
                        </option>

                        {create.filteredRoles.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.role_name} ({item.role_code})
                            </option>
                        ))}
                    </SelectInput>
                </div>

                <div className="col-span-12 md:col-span-2">
                    <FieldLabel>Scope</FieldLabel>
                    <div className="flex h-9 items-center rounded border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                        {create.selectedRole?.scope_type || "-"}
                    </div>
                </div>

                <div className="col-span-12 md:col-span-3">
                    <FieldLabel>Phân hệ</FieldLabel>
                    <div className="flex h-9 items-center rounded border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                        {create.selectedRole?.group_code || create.form.groupCode}
                    </div>
                </div>

                {/* <div className="col-span-12 md:col-span-6">
          <FieldLabel required={create.requiresBranch}>
            Branch access
          </FieldLabel>

          {create.isMultiBranch ? (
            <select
              multiple
              value={create.form.branchIds}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map(
                  (option) => option.value
                );

                create.setField("branchIds", values);
              }}
              className="min-h-[120px] w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
            >
              {create.branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {create.getBranchName(item)}
                </option>
              ))}
            </select>
          ) : (
            <SelectInput
              value={create.form.branchIds[0] || ""}
              disabled={!create.requiresBranch}
              onChange={(value) =>
                create.setField("branchIds", value ? [value] : [])
              }
            >
              <option value="">
                {create.requiresBranch ? "Chọn chi nhánh" : "Không cần chọn chi nhánh"}
              </option>

              {create.branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {create.getBranchName(item)}
                </option>
              ))}
            </SelectInput>
          )}

          <p className="mt-1 text-[11px] text-slate-500">
            Nếu chọn Employee có sẵn, chi nhánh phân quyền sẽ tự điền theo chi nhánh của Employee.
          </p>
        </div> */}
            </div>
        </section>
    );
}