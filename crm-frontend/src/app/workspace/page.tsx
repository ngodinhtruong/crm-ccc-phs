"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { accountService } from "@/services/account.service";
import { authService } from "@/services/auth.service";
import {
  getDefaultHomePath,
  getDefaultWorkspaceByUser,
} from "@/utils/default-home.util";
import { setActiveWorkspace } from "@/utils/workspace.util";

export default function WorkspacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const redirectToDefaultHome = async () => {
      try {
        setLoading(true);
        setError("");

        const user = await accountService.getMe();
        const defaultHomePath = getDefaultHomePath(user);
        const defaultWorkspace = getDefaultWorkspaceByUser(user);

        setActiveWorkspace(defaultWorkspace);
        router.replace(defaultHomePath);
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

        setError(`Không tải được thông tin tài khoản. Status: ${status} - ${detail}`);
      } finally {
        setLoading(false);
      }
    };

    void redirectToDefaultHome();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4fbf7] p-6">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-base font-semibold text-slate-800">
          Đang chuyển đến trang chính
        </h1>

        {loading && (
          <p className="mt-2 text-sm text-slate-500">
            Hệ thống đang kiểm tra tài khoản và mở trang mặc định.
          </p>
        )}

        {error && (
          <>
            <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-left text-xs text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 h-9 rounded bg-[#10b981] px-4 text-xs font-semibold text-white hover:bg-[#059669]"
            >
              Thử lại
            </button>
          </>
        )}
      </div>
    </main>
  );
}
