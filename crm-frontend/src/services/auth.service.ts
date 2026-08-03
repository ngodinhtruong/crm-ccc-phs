import api from "./api";

export type LoginPayload = {
  username: string;
  password: string;
};

export type TokenResponse = {
  access: string;
  refresh: string;
};

/** Đọc thời điểm hết hạn (exp) trong payload của JWT. */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenUsable(token: string | null) {
  if (!token) return false;

  const expiry = getTokenExpiry(token);

  // Token không đọc được coi như hỏng.
  if (expiry === null) return false;

  return expiry > Date.now();
}

export const authService = {
  login: async (payload: LoginPayload) => {
    const response = await api.post<TokenResponse>("/token/", payload);

    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);

    return response.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  /**
   * Chỉ kiểm tra token có tồn tại là chưa đủ: token hết hạn vẫn lọt qua, rồi
   * mọi lời gọi API trả 401 và refresh cũng hỏng -> màn hình báo "Network
   * Error" khó hiểu. Nên kiểm tra hạn thật trong JWT.
   *
   * Access token hết hạn nhưng refresh token còn sống thì vẫn coi là đăng
   * nhập — interceptor sẽ tự lấy access token mới.
   */
  isAuthenticated: () => {
    if (typeof window === "undefined") return false;

    const access = localStorage.getItem("access_token");
    const refresh = localStorage.getItem("refresh_token");

    if (isTokenUsable(access) || isTokenUsable(refresh)) {
      return true;
    }

    // Cả hai đều hỏng/hết hạn -> dọn sạch để không kẹt ở trạng thái nửa vời.
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    return false;
  },
};