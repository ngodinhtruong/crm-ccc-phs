import { Edit, Lock, MoreVertical } from "lucide-react";

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

export function UserTable({
  users,
  loading,
  error,
}: {
  users: UserListItem[];
  loading: boolean;
  error: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1300px] border-collapse text-left text-xs">
        <thead>
          <tr className="h-10 border-b bg-white text-slate-700">
            <th className="sticky left-0 z-10 w-[110px] bg-white px-3 font-semibold">
              Thao tác
            </th>
            <th className="w-[160px] px-3 font-semibold">Chi nhánh</th>
            <th className="w-[170px] px-3 font-semibold">Phòng ban</th>
            <th className="w-[190px] px-3 font-semibold">Họ và tên</th>
            <th className="w-[140px] px-3 font-semibold">Tên</th>
            <th className="w-[160px] px-3 font-semibold">Tên truy cập</th>
            <th className="w-[240px] px-3 font-semibold">Vai trò</th>
            <th className="w-[130px] px-3 font-semibold">Đang online</th>
            <th className="w-[220px] px-3 font-semibold">Email</th>
            <th className="w-[150px] px-3 font-semibold">Trạng thái</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan={10} className="h-28 text-center text-slate-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          )}

          {error && (
            <tr>
              <td colSpan={10} className="h-28 px-4 text-center text-red-600">
                {error}
              </td>
            </tr>
          )}

          {!loading && !error && users.length === 0 && (
            <tr>
              <td colSpan={10} className="h-28 text-center text-slate-500">
                Không có dữ liệu người dùng.
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            users.map((user, index) => {
              const { middleName, firstName } = getNameParts(user);
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]";

              return (
                <tr
                  key={user.id}
                  className={`h-14 border-b border-slate-100 ${rowBg} hover:bg-sky-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Sửa"
                        className="hover:text-sky-600"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        title="Khóa"
                        className="hover:text-sky-600"
                      >
                        <Lock size={15} />
                      </button>

                      <button
                        type="button"
                        title="Thêm"
                        className="hover:text-sky-600"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>

                  <td className="px-3">{user.branch_name || "Hội sở"}</td>
                  <td className="px-3">{user.department || "-"}</td>

                  <td className="px-3">
                    <span className="font-semibold text-sky-600">
                      {middleName}
                    </span>
                  </td>

                  <td className="px-3">
                    <span className="text-sky-600">{firstName}</span>
                  </td>

                  <td className="px-3">
                    <span className="text-sky-600">{user.username || "-"}</span>
                  </td>

                  <td className="px-3">
                    <span className="line-clamp-2 text-sky-600">
                      {user.role_names?.join(", ") || "-"}
                    </span>
                  </td>

                  <td className="px-3">Không</td>

                  <td className="px-3">
                    <span className="text-sky-600">{user.email || "-"}</span>
                  </td>

                  <td className="px-3">
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