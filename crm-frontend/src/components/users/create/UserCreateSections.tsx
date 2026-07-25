"use client";

import type { ReactNode } from "react";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { useUserCreate } from "@/hooks/useUserCreate";

import { EmployeePicker } from "./EmployeePicker";
import {
  CheckboxInput,
  FieldHint,
  FieldLabel,
  ReadonlyValue,
  SelectInput,
  TextInput,
} from "./UserCreateFormControls";

type UserCreateController = ReturnType<typeof useUserCreate>;

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="text-sky-700">{icon}</span>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function getScopeLabel(scope?: string | null) {
  const labels: Record<string, string> = {
    OWN: "Cá nhân",
    ORGANIZATION_UNIT: "Đơn vị tổ chức",
    BRANCH: "Chi nhánh",
    MULTI_BRANCH: "Nhiều chi nhánh",
    ALL: "Toàn hệ thống",
  };

  return scope ? labels[scope] || scope : "-";
}

export function UserAccountSection({
  create,
}: {
  create: UserCreateController;
}) {
  return (
    <SectionCard icon={<KeyRound size={17} />} title="Tài khoản đăng nhập">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <FieldLabel htmlFor="username" required>
            Tên đăng nhập
          </FieldLabel>
          <TextInput
            id="username"
            value={create.form.username}
            onChange={create.changeUsername}
            placeholder="vd: nv001"
            autoComplete="username"
          />
          <FieldHint>
            Mật khẩu mặc định: <b>{create.defaultPassword || "username123"}</b>
          </FieldHint>
        </div>

        <div className="col-span-12 md:col-span-5">
          <FieldLabel htmlFor="account-email" required>
            Email đăng nhập
          </FieldLabel>
          <TextInput
            id="account-email"
            type="email"
            value={create.form.email}
            onChange={(value) => create.setField("email", value)}
            placeholder="nhanvien@phs.vn"
            autoComplete="email"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <FieldLabel htmlFor="account-status" required>
            Trạng thái tài khoản
          </FieldLabel>
          <SelectInput
            id="account-status"
            value={create.form.status}
            onChange={(value) => {
              create.setField("status", value);
              create.setField("isActive", value === "ACTIVE");
            }}
          >
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </SelectInput>
        </div>
      </div>
    </SectionCard>
  );
}

export function UserEmployeeSection({
  create,
}: {
  create: UserCreateController;
}) {
  return (
    <SectionCard icon={<UserRound size={17} />} title="Hồ sơ nhân viên">
      <div className="mb-4">
        <FieldLabel required>Nhân viên</FieldLabel>
        <EmployeePicker
          value={create.form.employeeId}
          employees={create.employees}
          loading={create.loadingMaster}
          onChange={create.changeEmployeeSelection}
        />
        <FieldHint>
          Chọn “Tạo nhân viên mới” hoặc tìm nhân viên có sẵn theo tên, mã,
          email. Khi chọn nhân viên có sẵn, thông tin bên dưới được tự động điền.
        </FieldHint>
      </div>

      {create.employeeLocked && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Đang liên kết nhân viên có sẵn. Thông tin hồ sơ chỉ đọc và không bị cập
          nhật khi tạo tài khoản.
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <FieldLabel htmlFor="employee-code" required>
            Mã nhân viên
          </FieldLabel>
          <TextInput
            id="employee-code"
            value={create.form.employeeCode}
            readOnly={create.employeeLocked}
            onChange={create.changeEmployeeCode}
            placeholder="VD: NV001"
          />
        </div>

        <div className="col-span-12 md:col-span-5">
          <FieldLabel htmlFor="employee-full-name" required>
            Họ và tên
          </FieldLabel>
          <TextInput
            id="employee-full-name"
            value={create.form.employeeFullName}
            readOnly={create.employeeLocked}
            onChange={create.changeEmployeeFullName}
            placeholder="Nguyễn Văn A"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel htmlFor="employee-phone">Số điện thoại</FieldLabel>
          <TextInput
            id="employee-phone"
            value={create.form.employeePhone}
            readOnly={create.employeeLocked}
            onChange={(value) => create.setField("employeePhone", value)}
            placeholder="0909 123 456"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel htmlFor="employee-branch" required>
            Chi nhánh công tác
          </FieldLabel>
          <SelectInput
            id="employee-branch"
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

        <div className="col-span-12 md:col-span-5">
          <FieldLabel htmlFor="organization-unit" required>
            Đơn vị tổ chức chính
          </FieldLabel>
          <SelectInput
            id="organization-unit"
            value={create.form.employeeOrganizationUnitId}
            disabled={create.employeeLocked || !create.form.employeeBranchId}
            onChange={create.changeOrganizationUnit}
          >
            <option value="">
              {!create.form.employeeBranchId
                ? "Chọn chi nhánh trước"
                : "Chọn đơn vị tổ chức"}
            </option>
            {create.availableOrganizationUnits.map((item) => (
              <option key={item.id} value={item.id}>
                {create.getOrganizationUnitName(item)}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-3">
          <FieldLabel htmlFor="responsibility" required>
            Trách nhiệm
          </FieldLabel>
          <SelectInput
            id="responsibility"
            value={create.form.employeeResponsibility}
            disabled={
              create.employeeLocked ||
              !create.form.employeeOrganizationUnitId
            }
            onChange={(value) =>
              create.setField("employeeResponsibility", value)
            }
          >
            <option value="">Chọn trách nhiệm</option>
            {create.responsibilities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-8">
          <FieldLabel htmlFor="employee-position">Chức danh</FieldLabel>
          <TextInput
            id="employee-position"
            value={create.form.employeePosition}
            readOnly={create.employeeLocked}
            onChange={(value) => create.setField("employeePosition", value)}
            placeholder="VD: Chuyên viên chăm sóc khách hàng"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel htmlFor="employee-status" required>
            Trạng thái nhân viên
          </FieldLabel>
          <SelectInput
            id="employee-status"
            value={create.form.employeeStatus}
            disabled={create.employeeLocked}
            onChange={(value) => create.setField("employeeStatus", value)}
          >
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </SelectInput>
        </div>
      </div>
    </SectionCard>
  );
}

export function UserRoleAccessSection({
  create,
}: {
  create: UserCreateController;
}) {
  const selectedBranch = create.branches.find(
    (item) => String(item.id) === create.form.employeeBranchId
  );

  return (
    <SectionCard icon={<ShieldCheck size={17} />} title="Vai trò và phạm vi quyền">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <FieldLabel htmlFor="role-group" required>
            Phân hệ
          </FieldLabel>
          <SelectInput
            id="role-group"
            value={create.form.groupCode}
            onChange={create.changeGroupCode}
          >
            <option value="CCC">Customer Care Center</option>
            <option value="SALE_ADMIN">Sale Admin</option>
            <option value="GLOBAL">Toàn hệ thống / Admin</option>
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-5">
          <FieldLabel htmlFor="role" required>
            Vai trò
          </FieldLabel>
          <SelectInput
            id="role"
            value={create.form.roleId}
            onChange={create.changeRoleId}
          >
            <option value="">
              {create.loadingMaster ? "Đang tải..." : "Chọn vai trò"}
            </option>
            {create.filteredRoles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.role_name} ({item.role_code})
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Phạm vi</FieldLabel>
          <ReadonlyValue value={getScopeLabel(create.selectedRole?.scope_type)} />
          <FieldHint>
            {create.isOrganizationScope
              ? "Áp dụng tại đơn vị tổ chức chính."
              : create.isBranchScope
                ? `Áp dụng tại ${selectedBranch ? create.getBranchName(selectedBranch) : "chi nhánh công tác"}.`
                : create.isMultiBranch
                  ? "Chọn các chi nhánh được truy cập bên dưới."
                  : create.isAllScope
                    ? "Áp dụng trên toàn hệ thống."
                    : "Áp dụng cho dữ liệu của chính người dùng."}
          </FieldHint>
        </div>

        {create.isOrganizationScope && (
          <div className="col-span-12 md:col-span-5">
            <CheckboxInput
              checked={create.form.includeDescendants}
              onChange={(checked) =>
                create.setField("includeDescendants", checked)
              }
              label="Bao gồm đơn vị con"
              description="Cho phép xem dữ liệu của các team/phòng trực thuộc."
            />
          </div>
        )}

        {create.isMultiBranch && (
          <div className="col-span-12">
            <FieldLabel required>Chi nhánh được truy cập</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {create.branches.map((branch) => {
                const branchId = String(branch.id);
                return (
                  <CheckboxInput
                    key={branch.id}
                    checked={create.form.branchIds.includes(branchId)}
                    onChange={() => create.toggleBranchAccess(branchId)}
                    label={create.getBranchName(branch)}
                    description={branch.branch_code || undefined}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
