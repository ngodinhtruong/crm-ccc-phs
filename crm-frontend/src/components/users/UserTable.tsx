import { Edit, Lock, MoreVertical } from "lucide-react";

import {
  ColumnSelectFilter,
  ColumnTextFilter,
  TableState,
} from "@/components/common";
import type { useUsers } from "@/hooks/useUsers";
import { UserListItem } from "@/types/user.type";

function getNameParts(user: UserListItem) {
  const displayName =
    user.employee_name ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim();

  const parts = displayName.split(" ").filter(Boolean);
  const firstName = parts[parts.length - 1] || user.first_name || "-";

  return {
    middleName: displayName || "-",
    firstName,
  };
}

function UserActiveBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Hoạt động
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      Ngừng hoạt động
    </span>
  );
}

function getBranchName(branch: ReturnType<typeof useUsers>["branches"][number]) {
  return branch.branch_name || branch.name || `Chi nhánh ${branch.id}`;
}

function getRoleLabel(role: ReturnType<typeof useUsers>["roles"][number]) {
  return `${role.role_name} (${role.group_code})`;
}

export function UserTable({
  userState,
}: {
  userState: ReturnType<typeof useUsers>;
}) {
  const users = userState.users;

  return (
    <div className="table-scroll-container">
      <table className="data-table w-full min-w-[1980px] border-collapse text-left text-sm">
        <thead>
          <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
            <th className="sticky left-0 z-20 w-[110px] min-w-[110px] bg-slate-50 px-4 font-semibold">
              Thao tác
            </th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Chi nhánh</th>
            <th className="w-[190px] min-w-[190px] px-4 font-semibold">Đơn vị tổ chức</th>
            <th className="w-[150px] min-w-[150px] px-4 font-semibold">Trách nhiệm</th>
            <th className="w-[190px] min-w-[190px] px-4 font-semibold">Họ và tên</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Tên</th>
            <th className="w-[160px] min-w-[160px] px-4 font-semibold">Tên truy cập</th>
            <th className="w-[240px] min-w-[240px] px-4 font-semibold">Vai trò</th>
            <th className="w-[140px] min-w-[140px] px-4 font-semibold">Phân hệ</th>
            <th className="w-[130px] min-w-[130px] px-4 font-semibold">Đang online</th>
            <th className="w-[220px] min-w-[220px] px-4 font-semibold">Email</th>
            <th className="w-[150px] min-w-[150px] px-4 font-semibold">Trạng thái</th>
          </tr>

          <tr className="table-filter-row border-b border-slate-200 bg-slate-50/70 align-top">
            <th className="sticky left-0 z-20 bg-slate-50/70 px-3 py-2.5" />

            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={userState.branch}
                onChange={userState.setBranch}
                options={userState.branches.map((item) => ({
                  label: getBranchName(item),
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-4 py-2.5">
              <ColumnTextFilter
                value={userState.department}
                onChange={userState.setDepartment}
                placeholder="Đơn vị tổ chức"
              />
            </th>

            <th className="px-4 py-2.5" />

            <th className="px-4 py-2.5">
              <ColumnTextFilter
                value={userState.fullName}
                onChange={userState.setFullName}
                placeholder="Họ tên"
              />
            </th>

            <th className="px-4 py-2.5" />

            <th className="px-4 py-2.5">
              <ColumnTextFilter
                value={userState.username}
                onChange={userState.setUsername}
                placeholder="Username"
              />
            </th>

            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={userState.role}
                onChange={userState.setRole}
                options={userState.roles.map((item) => ({
                  label: getRoleLabel(item),
                  value: String(item.id),
                }))}
              />
            </th>

            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={userState.groupCode}
                onChange={userState.setGroupCode}
                options={[
                  {
                    label: "Global",
                    value: "GLOBAL",
                  },
                  {
                    label: "CCC",
                    value: "CCC",
                  },
                  {
                    label: "Sale Admin",
                    value: "SALE_ADMIN",
                  },
                ]}
              />
            </th>

            <th className="px-4 py-2.5">
              <ColumnSelectFilter
                value={userState.online}
                onChange={userState.setOnline}
                options={[
                  {
                    label: "Có",
                    value: "yes",
                  },
                  {
                    label: "Không",
                    value: "no",
                  },
                ]}
              />
            </th>

            <th className="px-4 py-2.5">
              <ColumnTextFilter
                value={userState.email}
                onChange={userState.setEmail}
                placeholder="Email"
              />
            </th>

            <th className="px-4 py-2.5" />
          </tr>
        </thead>

        <tbody>
          <TableState
            loading={userState.loading}
            error={userState.error}
            empty={
              !userState.loading &&
              !userState.error &&
              users.length === 0
            }
            colSpan={12}
            emptyText="Không có dữ liệu người dùng."
          />

          {!userState.loading &&
            !userState.error &&
            users.map((user, index) => {
              const { middleName, firstName } = getNameParts(user);
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";

              return (
                <tr
                  key={user.id}
                  className={`h-[46px] border-b border-slate-200 ${rowBg} hover:bg-emerald-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Sửa"
                        className="hover:text-emerald-600"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        title="Khóa"
                        className="hover:text-emerald-600"
                      >
                        <Lock size={15} />
                      </button>

                      <button
                        type="button"
                        title="Thêm"
                        className="hover:text-emerald-600"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 text-slate-700">{user.branch_name || "Hội sở"}</td>

                  <td className="px-4 text-slate-700">
                    {user.primary_organization_unit_name || user.department || "-"}
                  </td>

                  <td className="px-4 text-slate-700">
                    {user.primary_membership_responsibility_label || "-"}
                  </td>

                  <td className="px-4 text-slate-700">
                    <span className="font-semibold text-emerald-600">
                      {middleName}
                    </span>
                  </td>

                  <td className="px-4 text-slate-700">
                    <span className="text-emerald-600">{firstName}</span>
                  </td>

                  <td className="px-4 text-slate-700">
                    <span className="text-emerald-600">{user.username || "-"}</span>
                  </td>

                  <td className="px-4 text-slate-700">
                    <span className="line-clamp-2 text-emerald-600">
                      {user.role_names?.join(", ") || "-"}
                    </span>
                  </td>

                  <td className="px-4 text-slate-700">
                    <span className="line-clamp-2">
                      {user.role_group_codes?.join(", ") || "-"}
                    </span>
                  </td>

                  <td className="px-4 text-slate-700">Không</td>

                  <td className="px-4 text-slate-700">
                    <span className="text-emerald-600">{user.email || "-"}</span>
                  </td>

                  <td className="px-4 text-slate-700">
                    <UserActiveBadge active={user.is_active} />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}