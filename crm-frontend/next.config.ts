import type { NextConfig } from "next";

/** Backend Django. Đổi bằng biến môi trường BACKEND_URL nếu chạy ở nơi khác. */
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.200.133",
    "http://192.168.2.16",
    "13.215.176.236",
    "http://13.215.176.236",
    "192.168.200.112",
    "http://192.168.200.112",
    "http://172.31.0.1:3000",
    "172.31.0.1"

  ],
  /**
   * Giữ nguyên URL, không để Next.js trả 308 redirect cắt dấu "/" cuối —
   * Django bắt buộc phải có nó.
   */
  skipTrailingSlashRedirect: true,

  /**
   * Chuyển tiếp mọi lời gọi /api/... sang Django.
   *
   * Nhờ vậy trình duyệt luôn gọi cùng origin với trang đang mở (localhost,
   * 127.0.0.1 hay IP LAN đều được), nên không bao giờ dính CORS và không cần
   * biết địa chỉ thật của backend.
   *
   * Nối thêm "/" ở đích vì Next.js cắt mất nó khi khớp :path*.
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
   *
   * Giữ lại để link đã gửi cho nhau và bookmark của người dùng không chết.
   * Dùng permanent: false (307) chứ không phải 308 — trình duyệt sẽ không nhớ
   * vĩnh viễn, sau này muốn đổi tiếp thì không phải bảo mọi người xoá cache.
   */
  async redirects() {
    return [
      { source: "/sale-admin/kpi", destination: "/sale-admin/kpis/personal", permanent: false },
      { source: "/sale-admin/kpi-personal", destination: "/sale-admin/kpis/personal", permanent: false },
      { source: "/sale-admin/kpi-admin", destination: "/sale-admin/kpis/admin", permanent: false },
      { source: "/sale-admin/kpi-ranking", destination: "/sale-admin/kpis/ranking", permanent: false },
      { source: "/sale-admin/customers", destination: "/sale-admin/inactive-customers", permanent: false },
      { source: "/external-errors/catalogs", destination: "/external-errors/error-catalogs", permanent: false },
    ];
  },
};

export default nextConfig;
