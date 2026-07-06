"use client";

import {
  Bell,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  CircleHelp,
  LogOut,
  Megaphone,
  MessageCircle,
  PlusCircle,
  Search,
  Settings,
  ShieldQuestion,
  UserRound,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

import { authService } from "@/services/auth.service";
import {
  HomeDashboard,
  dashboardService,
} from "@/services/dashboard.service";
import {
  BarChartCard,
  PieChartCard,
} from "@/components/dashboard/DashboardCharts";

import { MainNavigationDrawer } from "@/components/layout/MainNavigationDrawer";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
const tabs = ["Ticket", "Call Center", "Hoạt động", "Ghi chú"];


export default function HomePage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("Ticket");
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);


  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        const dashboardData = await dashboardService.getHome();
        setDashboard(dashboardData);
      } catch (err: any) {
        console.error("HOME DASHBOARD ERROR:", err);

        const status = err?.response?.status;
        const data = err?.response?.data;

        setError(
          `Không tải được dữ liệu trang chủ từ DB. Status: ${status || "unknown"} - ${data ? JSON.stringify(data) : err?.message
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);



  return (
    <main className="min-h-screen bg-[#eef2f5] text-slate-800">
      <MainNavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* Topbar */}
      <DashboardTopbar onMenuClick={() => setMenuOpen(true)} />
      <DashboardSidebar
        open={settingsSidebarOpen}
        onClose={() => setSettingsSidebarOpen(false)}
      />

      {/* Left icon rail */}
      <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-56px)] w-10 bg-[#263747]">
        <button
          type="button"
          onClick={() => setSettingsSidebarOpen(true)}
          className="flex h-10 w-full items-center justify-center bg-[#1d2c39] text-white hover:bg-orange-500"
          title="Mở cài đặt"
        >
          <Settings size={22} />
        </button>
      </aside>

      {/* Content */}
      <section className="pl-10 pt-14">
        {/* Breadcrumb */}
        <div className="flex h-8 items-center border-b bg-white px-4 text-xs">
          <span className="font-medium text-slate-700">TRANG CHỦ</span>
        </div>

        {/* Tabs */}
        <div className="flex h-9 items-end border-b bg-white px-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-1 rounded-t border px-4 py-2 text-xs font-semibold ${activeTab === tab
                ? "border-b-white bg-white text-[#00713d]"
                : "bg-slate-50 text-slate-700 hover:bg-white"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-3">
          {loading && (
            <div className="rounded border bg-white p-4 text-sm text-slate-500">
              Đang tải dữ liệu từ DB...
            </div>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && dashboard && (
            <>
              {/* Ticket table */}
              <div className="rounded-md border bg-white shadow-sm">
                <div className="flex h-9 items-center justify-between border-b px-3">
                  <h2 className="text-[13px] font-semibold">
                    Ticket - Ticket mới chưa xử lý
                  </h2>

                  <button className="text-xs text-[#00713d] hover:underline">
                    Xem thêm
                  </button>
                </div>

                <div className="h-[135px] overflow-auto px-3 py-2">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-slate-700">
                        <th className="w-[130px] py-1 font-semibold">
                          Mã Ticket
                        </th>
                        <th className="w-[150px] py-1 font-semibold">
                          Chi nhánh xử lý
                        </th>
                        <th className="w-[140px] py-1 font-semibold">
                          Phân loại
                        </th>
                        <th className="w-[150px] py-1 font-semibold">
                          Công ty
                        </th>
                        <th className="w-[120px] py-1 font-semibold">
                          Tình trạng
                        </th>
                        <th className="py-1 font-semibold">Mô tả</th>
                        <th className="w-[130px] py-1 font-semibold">
                          Nguồn Ticket
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboard.latest_tickets.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-slate-400"
                          >
                            Chưa có ticket mới chưa xử lý.
                          </td>
                        </tr>
                      )}

                      {dashboard.latest_tickets.map((ticket) => (
                        <tr key={ticket.id} className="border-t border-slate-50">
                          <td className="py-1 text-[#0f6aa8]">
                            #{ticket.ticket_code}
                          </td>
                          <td className="py-1">{ticket.branch_name}</td>
                          <td className="py-1">{ticket.classification_name}</td>
                          <td className="py-1">{ticket.company_name}</td>
                          <td className="py-1">{ticket.status_name}</td>
                          <td className="max-w-[280px] truncate py-1">
                            {ticket.description}
                          </td>
                          <td className="py-1">{ticket.source_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex h-6 items-center justify-end gap-3 border-t px-3 text-xs text-slate-400">
                  <span>↔</span>
                  <span>□</span>
                  <span>×</span>
                </div>
              </div>

              {/* Charts */}
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                <BarChartCard
                  title="[PHS] Báo cáo tổng số lượng ticket theo kênh tiếp nhận trong tuần"
                  items={dashboard.source_summary}
                  footer={`Số bản ghi: ${dashboard.total_tickets}`}
                />

                <BarChartCard
                  title="[PHS] Báo cáo tổng số lượng ticket theo danh mục hỗ trợ trong tuần"
                  items={dashboard.category_summary}
                  footer={`Số bản ghi: ${dashboard.total_tickets}`}
                />

                <PieChartCard
                  title="[PHS] Báo cáo tổng số lượng ticket theo loại KH trong tháng"
                  items={dashboard.customer_type_summary}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}