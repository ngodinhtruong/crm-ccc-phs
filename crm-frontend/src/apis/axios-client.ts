import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * Để rỗng: trình duyệt gọi đường dẫn tương đối (/api/...) tới chính origin
 * đang mở, rồi Next.js chuyển tiếp sang Django.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,

  // Không đặt Content-Type cố định ở đây.
  // Axios sẽ tự chọn:
  // - application/json cho object JSON.
  // - multipart/form-data kèm boundary cho FormData.
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

    // Xóa Content-Type cũ nếu request gửi FormData.
    // Trình duyệt phải tự sinh multipart boundary; không được giữ
    // application/json hoặc tự viết multipart/form-data thủ công.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      config.headers.delete("Content-Type");
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
        return new Promise(() => { });
      }

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/token/refresh/`,
          { refresh: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccessToken = response.data.access;

        localStorage.setItem("access_token", newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Nếu request gốc là FormData thì tiếp tục để browser tự tạo boundary
        // khi Axios gửi lại request sau refresh token.
        if (
          typeof FormData !== "undefined" &&
          originalRequest.data instanceof FormData
        ) {
          originalRequest.headers.delete("Content-Type");
        }

        return api(originalRequest);
      } catch {
        clearAuthAndRedirect();
        return new Promise(() => { });
      }
    }

    return Promise.reject(error);
  }
);

export default api;