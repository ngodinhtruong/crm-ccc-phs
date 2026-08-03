import type { NextConfig } from "next";

/** Backend Django. Đổi bằng biến môi trường BACKEND_URL nếu chạy ở nơi khác. */
const BACKEND_URL =
  process.env.BACKEND_URL || "http://127.0.0.1:8000";

/**
 * Danh sách origin dùng khi chạy next dev.
 * Khai báo trong .env.local, ngăn cách bằng dấu phẩy.
 */
const ALLOWED_DEV_ORIGINS = (
  process.env.ALLOWED_DEV_ORIGINS || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ALLOWED_DEV_ORIGINS,
  /**
   * Giữ nguyên URL, không để Next.js trả 308 redirect cắt dấu "/" cuối —
   * Django bắt buộc phải có nó.
   */
  skipTrailingSlashRedirect: true,

  /**
   * Chuyển tiếp mọi lời gọi /api/... sang Django.
   *
   * Trình duyệt gọi cùng origin với trang đang mở, còn Next.js sẽ proxy
   * request sang Django qua BACKEND_URL.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*/`,
      },
    ];
  },

  /**
   * Đường dẫn cũ trước khi gom tên route cho nhất quán.
   */
  async redirects() {
    return [
      {
        source: "/sale-admin/kpi",
        destination: "/sale-admin/kpis/personal",
        permanent: false,
      },
      {
        source: "/sale-admin/kpi-personal",
        destination: "/sale-admin/kpis/personal",
        permanent: false,
      },
      {
        source: "/sale-admin/kpi-admin",
        destination: "/sale-admin/kpis/admin",
        permanent: false,
      },
      {
        source: "/sale-admin/kpi-ranking",
        destination: "/sale-admin/kpis/ranking",
        permanent: false,
      },
      {
        source: "/sale-admin/customers",
        destination: "/sale-admin/inactive-customers",
        permanent: false,
      },
      {
        source: "/external-errors/catalogs",
        destination: "/external-errors/error-catalogs",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
