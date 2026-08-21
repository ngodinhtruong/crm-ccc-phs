"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { accountService } from "@/services/account.service";
import { authService } from "@/services/auth.service";
import { getDefaultHomePath } from "@/utils/default-home.util";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      accountService
        .getMe()
        .then((currentUser) => {
          router.replace(getDefaultHomePath(currentUser));
        })
        .catch(() => {
          authService.logout();
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await authService.login({
        username,
        password,
      });

      const currentUser = await accountService.getMe();
      router.replace(getDefaultHomePath(currentUser));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Sai username hoặc password.");
        } else if (err.response?.status === 404) {
          setError("Không tìm thấy API /api/token/. Kiểm tra backend JWT.");
        } else {
          setError("Đăng nhập thất bại. Vui lòng thử lại.");
        }
      } else {
        setError("Có lỗi không xác định.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00713d] border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Đang kiểm tra trạng thái đăng nhập...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section
          className="relative hidden items-center justify-center overflow-hidden p-10 lg:flex"
          style={
            {
              "--tw-bg-opacity": 1,
              backgroundColor: "rgba(0, 113, 61, var(--tw-bg-opacity))",
            } as React.CSSProperties
          }
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white" />
            <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-white" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center text-white">
            <div className="mb-8 rounded-3xl bg-white p-8 shadow-2xl">
              <Image
                src="/images/logo-PHS-nbg.png"
                alt="PHS Logo"
                width={280}
                height={120}
                priority
                className="h-auto w-[260px] object-contain"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-wide">CRM Mini System</h1>

            <p className="mt-4 max-w-md text-base leading-7 text-white/85">
              Hệ thống quản lý khách hàng, ticket, SLA và phân quyền nội bộ.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Image
                src="/images/logo-PHS-nbg.png"
                alt="PHS Logo"
                width={220}
                height={90}
                priority
                className="mx-auto h-auto w-[200px] object-contain"
              />
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Vui lòng nhập tài khoản để truy cập hệ thống CRM.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
                    placeholder="Nhập username"
                    autoComplete="username"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
                    placeholder="Nhập password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={
                    {
                      "--tw-bg-opacity": 1,
                      backgroundColor: "rgba(0, 113, 61, var(--tw-bg-opacity))",
                    } as React.CSSProperties
                  }
                >
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-400">© PHS CRM Mini</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
