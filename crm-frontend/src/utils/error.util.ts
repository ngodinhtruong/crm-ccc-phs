/**
 * Message nghiệp vụ để hiển thị cho người dùng cuối.
 *
 * Backend trả lỗi dạng {"detail": "..."} (DRF) hoặc
 * {"field": ["..."]} (validation). Ưu tiên lấy đúng câu tiếng Việt
 * thay vì dán JSON thô lên màn hình như getErrorMessage.
 */
export function getApiErrorDetail(err: unknown, fallback: string): string {
  const data = (
    err as { response?: { data?: unknown } }
  )?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }

    // Lỗi validation theo field: lấy thông báo đầu tiên tìm được
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

/** Trạng thái HTTP của lỗi, dùng để phân nhánh xử lý (409, 400...). */
export function getErrorStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

export function getErrorMessage(err: unknown, fallback: string): string {
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

  return `${fallback}. Status: ${status} - ${detail}`;
}
