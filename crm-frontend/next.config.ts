import type { NextConfig } from "next";

/** Backend Django. Đổi bằng biến môi trường BACKEND_URL nếu chạy ở nơi khác. */
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.200.133",
    "http://192.168.2.16",
    "13.215.176.236",
    "http:13.215.176.236"
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
};

export default nextConfig;
