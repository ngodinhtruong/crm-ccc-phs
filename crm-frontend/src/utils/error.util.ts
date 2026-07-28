/**
 * Message nghiệp vụ để hiển thị cho người dùng cuối.
 */
export function getApiErrorDetail(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }

    for (const value of Object.values(record)) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }

      if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
        return value[0];
      }
    }
  }

  return fallback;
}

export function getErrorStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  const error = err as {
    code?: string;
    message?: string;
    response?: {
      status?: number;
      data?: unknown;
    };
  };

  if (error?.code === "ECONNABORTED") {
    return `${fallback}: API xử lý quá thời gian cho phép.`;
  }

  if (error?.code === "ERR_NETWORK" || !error?.response) {
    return `${fallback}: không kết nối được tới backend. Kiểm tra NEXT_PUBLIC_API_URL hoặc cấu hình proxy /api.`;
  }

  const status = error.response.status ?? "unknown";
  const detail = getApiErrorDetail(error, error.message || "Lỗi không xác định");

  return `${fallback}. Status: ${status} - ${detail}`;
}
