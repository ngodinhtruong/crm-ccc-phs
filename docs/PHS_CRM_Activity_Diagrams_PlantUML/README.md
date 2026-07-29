# Bộ Activity Diagram - PHS CRM

Bộ file được viết bằng **PlantUML**, dựa trên backend `apps` và frontend `src` của project.

## Danh sách

- `00_danh_muc_so_do.puml`: Danh mục tổng quan.
- `01_dang_nhap_phan_quyen.puml`
- `02_tao_nguoi_dung_cap_quyen.puml`
- `03_tao_khach_hang_tai_khoan.puml`
- `04_tao_ticket_thu_cong.puml`
- `05_tiep_nhan_xu_ly_ticket.puml`
- `06_giam_sat_sla_tu_dong_dong.puml`
- `07_dong_bo_chatbot_tao_ticket.puml`
- `08_import_phan_loai_loi.puml`
- `09_sale_admin_ghi_nhan_cuoc_goi.puml`
- `10_khoi_tao_kich_hoat_ky_kpi.puml`
- `11_thiet_lap_chi_tieu_kpi.puml`
- `12_tinh_diem_xep_hang_kpi.puml`

## Mở trong VS Code

1. Cài extension **PlantUML** của `jebbs`.
2. Mở một file `.puml`.
3. Nhấn `Alt + D` để xem Preview.
4. Để xuất ảnh, nhấn `Ctrl + Shift + P` rồi chọn **PlantUML: Export Current Diagram**.
5. Chọn định dạng `SVG` hoặc `PNG`.

Nếu preview local báo thiếu Graphviz, cài Graphviz và khởi động lại VS Code, hoặc cấu hình PlantUML render bằng server.

## Cách chỉnh

- Mỗi dòng `|Tên swimlane|` là một bên tham gia.
- `:Nội dung;` là một hành động.
- `if (...) then (...)` tạo nhánh điều kiện.
- `while (...) is (...)` tạo vòng lặp.

Các sơ đồ đang dùng tiếng Việt và có thể sửa trực tiếp theo tên nghiệp vụ trong báo cáo.
