"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Wrench,
} from "lucide-react";

import { authService } from "@/services/auth.service";
import {
  UserListItem,
  userService,
} from "@/services/user.service";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";

export default function UsersPage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [count, setCount] = useState(0);

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [online, setOnline] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const active = activeTab === "active";

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await userService.getUsers({
        active,
        q,
        branch,
        department,
      });

      setUsers(data.results || []);
      setCount(data.count || 0);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message;

      setError(`Không tải được danh sách người dùng. Status: ${status} - ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, activeTab]);

  const filteredUsers = useMemo(() => {
    if (!online) return users;

    return users.filter(() => {
      if (online === "no") return true;
      if (online === "yes") return false;
      return true;
    });
  }, [users, online]);

  const handleSearch = () => {
    loadUsers();
  };

  return (
    <main className="min-h-screen bg-[#eef2f5] text-slate-800">
      <MainNavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <DashboardTopbar onMenuClick={() => setMenuOpen(true)} />

      <DashboardSidebar
        open={settingsSidebarOpen}
        onClose={() => setSettingsSidebarOpen(false)}
        defaultExpandedGroupKey="user-management"
        defaultActiveChildKey="users"
        showCloseButton={false}
      />

      {/* Left setting rail */}
      <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-56px)] w-10 bg-[#263747]">
        <button
          type="button"
          onClick={() => setSettingsSidebarOpen(true)}
          className="flex h-10 w-full items-center justify-center bg-orange-500 text-white hover:bg-orange-600"
          title="Mở cài đặt"
        >
          <Settings size={22} />
        </button>
      </aside>

      <section className="min-h-screen pl-[315px] pt-14">
        {/* Breadcrumb + actions */}
        <div className="flex h-11 items-center justify-between border-b bg-white px-4">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Link href="/" className="font-medium text-slate-700 hover:text-orange-500">
              TRANG CHỦ
            </Link>
            <span>&gt;</span>
            <span>Quản lý người dùng</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">Users</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]">
              <Plus size={15} />
              Thêm Người dùng thường
            </button>

            <button className="flex h-8 items-center gap-1 rounded bg-[#0097cf] px-3 text-xs font-semibold text-white hover:bg-[#0089bd]">
              <Plus size={15} />
              Thêm Người dùng Mobile
            </button>

            <button className="flex h-8 items-center gap-1 rounded border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50">
              <Download size={15} />
              Nhập dữ liệu
            </button>

            <button className="flex h-8 w-8 items-center justify-center rounded border border-sky-300 bg-white text-sky-600 hover:bg-sky-50">
              <Wrench size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white">
          {/* Tabs and pager */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            <div className="flex flex-1 justify-center">
              <div className="inline-flex overflow-hidden rounded border border-sky-300 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("active")}
                  className={`h-8 px-5 ${
                    activeTab === "active"
                      ? "bg-[#0097cf] text-white"
                      : "bg-white text-[#0097cf] hover:bg-sky-50"
                  }`}
                >
                  Người dùng đang hoạt động
                </button>

                <button
                  onClick={() => setActiveTab("inactive")}
                  className={`h-8 border-l border-sky-300 px-5 ${
                    activeTab === "inactive"
                      ? "bg-[#0097cf] text-white"
                      : "bg-white text-[#0097cf] hover:bg-sky-50"
                  }`}
                >
                  Người dùng ngừng hoạt động
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span>
                {fromRecord} đến {toRecord} của {count}
              </span>
              <button className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400">
                <ChevronLeft size={16} />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-500">
                ...
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded border bg-white text-slate-400">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-left text-xs">
              <thead>
                <tr className="h-9 border-b bg-white text-slate-600">
                  <th className="w-[110px] px-3 font-semibold">Thao tác</th>
                  <th className="w-[150px] px-3 font-semibold">Chi nhánh</th>
                  <th className="w-[170px] px-3 font-semibold">Phòng ban</th>
                  <th className="w-[150px] px-3 font-semibold">Họ và tên đệm</th>
                  <th className="w-[150px] px-3 font-semibold">Tên</th>
                  <th className="w-[150px] px-3 font-semibold">Tên truy cập</th>
                  <th className="w-[180px] px-3 font-semibold">Vai trò</th>
                  <th className="w-[130px] px-3 font-semibold">Đang Online</th>
                  <th className="w-[220px] px-3 font-semibold">Email</th>
                </tr>

                <tr className="h-12 border-b bg-white">
                  <th className="px-3">
                    <button
                      onClick={handleSearch}
                      className="flex h-8 items-center justify-center gap-1 rounded border bg-white px-4 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                    >
                      <Search size={13} />
                      Tìm kiếm
                    </button>
                  </th>

                  <th className="px-3">
                    <input
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    />
                  </th>

                  <th className="px-3">
                    <input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    />
                  </th>

                  <th className="px-3">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    />
                  </th>

                  <th className="px-3">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    />
                  </th>

                  <th className="px-3">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    />
                  </th>

                  <th className="px-3">
                    <input
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    />
                  </th>

                  <th className="px-3">
                    <select
                      value={online}
                      onChange={(e) => setOnline(e.target.value)}
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    >
                      <option value="">Chọn...</option>
                      <option value="yes">Có</option>
                      <option value="no">Không</option>
                    </select>
                  </th>

                  <th className="px-3">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="h-8 w-full rounded border px-2 outline-none focus:border-sky-400"
                    />
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="h-24 text-center text-slate-500">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}

                {error && (
                  <tr>
                    <td colSpan={9} className="h-24 px-4 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="h-24 text-center text-slate-500">
                      Không có dữ liệu người dùng.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  filteredUsers.map((user, index) => {
                    const nameParts = (user.employee_name || user.first_name || "").split(" ");
                    const firstName = nameParts[nameParts.length - 1] || user.first_name || "";
                    const middleName =
                      user.employee_name ||
                      `${user.first_name || ""} ${user.last_name || ""}`.trim();

                    return (
                      <tr
                        key={user.id}
                        className={`h-14 border-b ${
                          index % 2 === 0 ? "bg-[#f3f7fa]" : "bg-white"
                        } hover:bg-sky-50`}
                      >
                        <td className="px-3">
                          <div className="flex items-center gap-3 text-slate-400">
                            <button title="Sửa" className="hover:text-sky-600">
                              <Edit size={15} />
                            </button>

                            <button title="Khóa" className="hover:text-sky-600">
                              <Lock size={15} />
                            </button>

                            <button title="Thêm" className="hover:text-sky-600">
                              <MoreVertical size={15} />
                            </button>
                          </div>
                        </td>

                        <td className="px-3">{user.branch_name || "Hội sở"}</td>
                        <td className="px-3">{user.department || "-"}</td>

                        <td className="px-3">
                          <span className="text-sky-600">
                            {middleName || "-"}
                          </span>
                        </td>

                        <td className="px-3">
                          <span className="text-sky-600">
                            {firstName || "-"}
                          </span>
                        </td>

                        <td className="px-3">
                          <span className="text-sky-600">
                            {user.username}
                          </span>
                        </td>

                        <td className="px-3">
                          <span className="text-sky-600">
                            {user.role_names?.join(", ") || "-"}
                          </span>
                        </td>

                        <td className="px-3">Không</td>

                        <td className="px-3">
                          <span className="text-sky-600">
                            {user.email || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}