# Chatbot dashboard backend optimization

## API tương thích ngược

Không truyền `sections`, endpoint vẫn trả toàn bộ dữ liệu như trước:

```text
GET /api/chatbots/dashboard/overview/
```

Frontend mới có thể lazy-load:

```text
GET /api/chatbots/dashboard/overview/?sections=summary
GET /api/chatbots/dashboard/overview/?sections=topics
GET /api/chatbots/dashboard/overview/?sections=traffic&granularity=day
GET /api/chatbots/dashboard/overview/?sections=operations,sla
GET /api/chatbots/dashboard/overview/?sections=quick_lists
```

Các section hợp lệ:

- `summary`
- `topics`
- `traffic`
- `operations`
- `sla`
- `quick_lists`

Alias `overview` hoặc `all` tải toàn bộ.

## Thay đổi hiệu năng

- Gộp 10 query KPI thành một aggregate.
- Gộp các biểu đồ chủ đề thành một aggregate.
- Hai biểu đồ theo giờ dùng chung một query.
- Thời gian xử lý trung bình được tính bằng SQL `AVG(duration)` thay vì tải model về Python.
- SLA được tính trong một aggregate có điều kiện.
- Mỗi section có cache và TTL riêng.
- Cache tự tăng version sau khi rebuild `ChatbotSessionSummary`.
- Filter ngày dùng khoảng `>= start` và `< next_day`, phù hợp B-tree index hơn `__date`.
- API danh sách dùng serializer riêng, không trả `full_conversation`.
- Query list dùng `.only()` và bỏ các quan hệ customer không sử dụng.
- API detail vẫn giữ đầy đủ dữ liệu và hội thoại gốc.

## Lưu ý migration

Gói nguồn được cung cấp thiếu file migration `.py` từ `0002` đến `0014`; chỉ còn `.pyc`.
Vì vậy bản tối ưu không tự tạo migration index mới để tránh dependency migration sai.
Hãy khôi phục migration nguồn từ Git trước, sau đó mới tạo migration index.

Các index nên kiểm tra bằng `EXPLAIN ANALYZE`:

```python
models.Index(fields=["outcome_type", "started_at"])
models.Index(fields=["dashboard_category", "started_at"])
models.Index(fields=["channel", "started_at"])
models.Index(fields=["session_id", "external_created_at", "id"])
```

Không thêm toàn bộ một cách mù quáng; kiểm tra index hiện hữu trong PostgreSQL trước vì model đang có một số index đơn bị khai báo trùng.

## Cài đặt

Chép app vào `apps/chatbots`, sau đó chạy:

```bash
python manage.py check
python manage.py test apps.chatbots
```

Không cần migration cho các thay đổi trong gói này.
