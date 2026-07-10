"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { accountService } from "@/services/account.service";
import { authService } from "@/services/auth.service";
import { CurrentUser } from "@/types/account.type";
import {
  getDefaultPathByWorkspace,
  setActiveWorkspace,
  WorkspaceCode,
} from "@/utils/workspace.util";

export default function WorkspacePage() {
  const router = useRouter();

  const [me, setMe] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const chooseWorkspace = (workspace: WorkspaceCode) => {
    setActiveWorkspace(workspace);
    router.push(getDefaultPathByWorkspace(workspace));
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const loadMe = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await accountService.getMe();
        setMe(data);

        const groups = data.accessible_groups || [];

        if (groups.length === 1) {
          const onlyGroup = groups[0];

          if (onlyGroup === "CCC" || onlyGroup === "SALE_ADMIN") {
            setActiveWorkspace(onlyGroup);
            router.push(getDefaultPathByWorkspace(onlyGroup));
          }
        }
      } catch (err) {
        const error = err as {
          response?: {
            status?: number;
            data?: unknown;
          };
          message?: string;
        };

        const status = error?.response?.status || "unknown";
        const detail = error?.response?.data
          ? JSON.stringify(error.response.data)
          : error?.message;

        setError(
          `Không tải được thông tin phân hệ. Status: ${status} - ${detail}`
        );
      } finally {
        setLoading(false);
      }
    };

    void loadMe();
  }, [router]);

  const groups = me?.accessible_groups || [];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f5] p-6">
      <div className="w-full max-w-3xl rounded-md border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">
          Chọn phân hệ làm việc
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Tài khoản của bạn có quyền truy cập nhiều phân hệ. Vui lòng chọn phân hệ muốn làm việc.
        </p>

        {loading && (
          <div className="mt-6 rounded border bg-slate-50 p-4 text-sm text-slate-500">
            Đang tải thông tin tài khoản...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="mt-6 rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
            Tài khoản chưa được gán phân hệ CCC hoặc Sale Admin.
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.includes("CCC") && (
              <button
                type="button"
                onClick={() => chooseWorkspace("CCC")}
                className="rounded-md border border-slate-200 bg-white p-5 text-left hover:border-sky-400 hover:bg-sky-50"
              >
                <div className="text-lg font-semibold text-slate-800">CCC</div>

                <p className="mt-2 text-sm text-slate-500">
                  Ticket, Chatbot, SLA, CSKH và báo cáo CCC.
                </p>
              </button>
            )}

            {groups.includes("SALE_ADMIN") && (
              <button
                type="button"
                onClick={() => chooseWorkspace("SALE_ADMIN")}
                className="rounded-md border border-slate-200 bg-white p-5 text-left hover:border-emerald-400 hover:bg-emerald-50"
              >
                <div className="text-lg font-semibold text-slate-800">
                  Sale Admin
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  SA Records, Dashboard Sale Admin, KPI và import Excel.
                </p>
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}