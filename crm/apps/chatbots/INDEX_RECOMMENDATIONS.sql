-- Chỉ chạy sau khi kiểm tra pg_indexes và EXPLAIN (ANALYZE, BUFFERS).
-- Dùng CREATE INDEX CONCURRENTLY trên production để giảm thời gian khóa ghi.

CREATE INDEX CONCURRENTLY IF NOT EXISTS chatbot_sum_outcome_started_idx
    ON chatbot_session_summaries (outcome_type, started_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS chatbot_sum_category_started_idx
    ON chatbot_session_summaries (dashboard_category, started_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS chatbot_sum_channel_started_idx
    ON chatbot_session_summaries (channel, started_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS chatbot_log_session_time_id_idx
    ON chatbot_chat_logs (session_id, external_created_at, id);
