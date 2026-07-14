import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * Để rỗng: trình duyệt gọi đường dẫn tương đối (/api/...) tới chính origin
 * đang mở, rồi Next.js chuyển tiếp sang Django (xem next.config.ts).
 *
 * Nhờ vậy mở trang bằng localhost, 127.0.0.1 hay IP LAN đều chạy và không dính
 * CORS. Hardcode 127.0.0.1 sẽ gây Network Error khi truy cập từ máy khác.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

function clearAuthAndRedirect() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("access_token");

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        clearAuthAndRedirect();
        return new Promise(() => {});
      }

      try {
        // Dùng axios trần (không qua instance `api`) để tránh interceptor này
        // gọi lại chính nó khi refresh cũng trả 401.
        const response = await axios.post(
          `${API_BASE_URL}/api/token/refresh/`,
          { refresh: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccessToken = response.data.access;

        localStorage.setItem("access_token", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch {
        // Refresh token cũng hỏng -> phiên hết hạn thật. Xoá token và về trang
        // đăng nhập. Trả về promise treo để component không kịp render lỗi
        // "unknown" trong lúc trình duyệt đang chuyển trang.
        clearAuthAndRedirect();
        return new Promise(() => {});
      }
    }

    return Promise.reject(error);
  }
);

export default api;