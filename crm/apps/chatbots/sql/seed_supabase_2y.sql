-- =====================================================================
--  SEED DỮ LIỆU CHATBOT 2 NĂM CHO SUPABASE
--  Chạy trong: Supabase Dashboard -> SQL Editor
--
--  Phạm vi   : 2024-07-01 .. 2026-07-31
--              = 8 quý TRỌN (Q3/2024 .. Q2/2026) + T7/2026 (quý hiện tại)
--  Sản lượng : 1.670 phiên · 4.676 chat log · 668 state · 501 request
--
--  AN TOÀN   : mọi dòng seed đều có session_id LIKE 'seed-%'
--              -> KHÔNG đụng tới dữ liệu thật đang có trong bảng
--              -> chạy lại nhiều lần được (tự dọn seed cũ ở bước 0)
--
--  GỠ BỎ     : xem block "ROLLBACK" ở cuối file
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Dọn kết quả seed của lần chạy trước (chỉ xóa dòng 'seed-%')
-- ---------------------------------------------------------------------
delete from public.cskh_requests  where session_id like 'seed-%';
delete from public.cskh_state     where session_id like 'seed-%';
delete from public.xpro_chat_logs where session_id like 'seed-%';


do $$
declare
    -- ---------- Tham số ----------
    c_start_month constant date := date '2024-07-01';
    c_months      constant int  := 25;   -- 24 tháng (8 quý) + T7/2026

    -- Chủ đề: lấy đúng taxonomy đang có thật trong xpro_chat_logs
    c_cat constant text[] := array[
        'PHS App/Web Platform',
        'Statement',
        'Securities Deposit',
        'Underlying Securities Trading',
        'Professional Investor Verification',
        'Account Manager Information (AM) (Broker)',
        'Câu hỏi về Giao Dịch Ký Quỹ Chứng Khoán (Margin)',
        'Ứng Trước Tiền Bán (UTTB)'
    ];

    c_question constant text[] := array[
        'App PHS báo lỗi khi tôi đăng nhập, xử lý thế nào?',
        'Cho tôi xin sao kê tài khoản tháng này',
        'Thủ tục lưu ký chứng khoán cần giấy tờ gì?',
        'Phí giao dịch cổ phiếu cơ sở hiện tại là bao nhiêu?',
        'Tôi muốn đăng ký nhà đầu tư chuyên nghiệp',
        'Cho tôi thông tin nhân viên quản lý tài khoản',
        'Lãi suất ký quỹ margin tính như thế nào?',
        'Tôi muốn ứng trước tiền bán chứng khoán'
    ];

    c_answer constant text[] := array[
        'Quý khách vui lòng cập nhật ứng dụng lên bản mới nhất và thử lại.',
        'PHS sẽ gửi sao kê về email đã đăng ký trong vòng 24 giờ.',
        'Quý khách cần CCCD và giấy chứng nhận sở hữu chứng khoán bản gốc.',
        'Biểu phí giao dịch cơ sở hiện hành là 0,15% giá trị khớp lệnh.',
        'Quý khách cần đáp ứng điều kiện theo Nghị định 155 và nộp hồ sơ tại quầy.',
        'Thông tin nhân viên quản lý tài khoản đã được gửi tới Quý khách.',
        'Lãi suất margin tính theo dư nợ thực tế, hiện áp dụng 12%/năm.',
        'Quý khách có thể ứng trước tiền bán ngay trên app mục Tiện ích.'
    ];

    -- Lý do chuyển CCC (cho biểu đồ "Top lý do")
    c_reason constant text[] := array[
        'Khách yêu cầu gặp nhân viên tư vấn',
        'Chatbot chưa trả lời được câu hỏi',
        'Khách cần hỗ trợ mở tài khoản',
        'Khách gặp lỗi khi đăng nhập ứng dụng',
        'Khách hỏi về phí giao dịch và ký quỹ',
        'Khách yêu cầu sao kê tài khoản'
    ];

    -- Khung giờ: 2 đỉnh sáng (9-11h) và chiều (14-16h)
    c_hour constant int[] := array[
        8, 9, 9,10,10,10,11,11,13,14,
       14,15,15,15,16,16,17,19,20,21];

    -- ---------- Biến chạy ----------
    m         int;
    q         int;
    s         int;
    n         int;
    i         int;
    seq       bigint := 0;

    v_month   date;
    v_dim     int;
    v_sid     text;
    v_uid     text;
    v_chan    text;
    v_outcome text;
    v_cat     text;
    v_catidx  int;
    v_nmsg    int;
    v_start   timestamptz;
    v_ctype   text;
    v_contact text;
    v_step    text;
    v_sreason text;
begin
    -- id của xpro_chat_logs và cskh_requests là GENERATED ALWAYS AS IDENTITY,
    -- cskh_state.id dùng sequence -> KHÔNG truyền id, để Postgres tự cấp.

    for m in 0 .. (c_months - 1) loop
        v_month := (c_start_month + make_interval(months => m))::date;

        -- Mỗi quý tăng 10 phiên/tháng: 30,40,50,60,70,80,90,100 và T7/2026 = 110
        q := m / 3;
        n := 30 + 10 * q;

        v_dim := extract(day from (date_trunc('month', v_month::timestamp)
                                   + interval '1 month - 1 day'))::int;

        for s in 1 .. n loop
            seq := seq + 1;

            v_sid := 'seed-' || to_char(v_month, 'YYYYMM') || '-' || lpad(s::text, 4, '0');
            v_uid := '022C' || lpad(((seq % 150) + 100000)::text, 6, '0');

            -- Kênh: 70% xpro · 20% zalo · 5% facebook · 5% web
            v_chan := case
                when seq % 20 < 14  then 'xpro'
                when seq % 20 < 18  then 'zalo'
                when seq % 20 = 18  then 'facebook'
                else 'web'
            end;

            -- Nhóm xử lý: n luôn là bội của 10 -> tỷ lệ CHÍNH XÁC 30/40/20/10
            v_outcome := case
                when s % 10 between 1 and 3 then 'CCC'
                when s % 10 between 4 and 7 then 'BOT_DONE'
                when s % 10 in (8, 9)       then 'SPAM'
                else 'PENDING'
            end;

            -- gcd(7,8)=1 -> chủ đề rải đều, không tương quan với nhóm xử lý
            v_catidx := ((seq * 7) % 8)::int + 1;
            v_cat    := c_cat[v_catidx];

            v_start := ((v_month + ((s * 7) % v_dim)::int)::timestamp
                        + make_interval(hours => c_hour[(s % 20) + 1],
                                        mins  => (s * 17) % 60,
                                        secs  => (s * 29) % 60))
                       at time zone 'Asia/Ho_Chi_Minh';

            -- ---------- Chat log ----------
            if v_outcome = 'SPAM' then
                -- 1 lượt, toàn câu rác
                insert into public.xpro_chat_logs
                    (channel, user_id, session_id, question, answer, "questionType", created_at, category)
                values (
                    v_chan, v_uid, v_sid,
                    case when s % 10 = 8 then 'alo shop ơi' else 'hôm nay trời đẹp nhỉ' end,
                    'Chào Quý khách, PHS có thể hỗ trợ gì ạ?',
                    case when s % 10 = 8 then 'GREETING' else 'UNRELATED' end,
                    v_start,
                    case when s % 10 = 8 then 'Hi/Hello' else null end
                );
                v_nmsg := 1;

            else
                -- Phiên CCC mở đầu bằng 1 câu chào (để kiểm chứng logic
                -- "câu rác luôn tính riêng vào msg_count_spam")
                if v_outcome = 'CCC' then
                    insert into public.xpro_chat_logs
                        (channel, user_id, session_id, question, answer, "questionType", created_at, category)
                    values (v_chan, v_uid, v_sid,
                            'Xin chào', 'Chào Quý khách, PHS có thể hỗ trợ gì ạ?',
                            'GREETING', v_start, 'Hi/Hello');
                end if;

                -- Số lượt hỏi thật: CCC 3 · BOT_DONE 3 · PENDING 2
                v_nmsg := case when v_outcome = 'PENDING' then 2 else 3 end;

                for i in 1 .. v_nmsg loop
                    insert into public.xpro_chat_logs
                        (channel, user_id, session_id, question, answer, "questionType", created_at, category)
                    values (
                        v_chan, v_uid, v_sid,
                        c_question[v_catidx] || case when i = 1 then '' else ' (hỏi thêm lượt ' || i || ')' end,
                        c_answer[v_catidx],
                        case when (seq + i) % 2 = 0 then 'CUSTOMER_CARE' else 'RESEARCH' end,
                        v_start + make_interval(mins => (case when v_outcome = 'CCC' then i else i - 1 end) * 3),
                        v_cat
                    );
                end loop;

                if v_outcome = 'CCC' then
                    v_nmsg := v_nmsg + 1;   -- cộng câu chào
                end if;
            end if;

            -- ---------- cskh_state (CCC + PENDING) ----------
            if v_outcome in ('CCC', 'PENDING') then
                if v_outcome = 'CCC' then
                    v_step    := 'collected';
                    v_sreason := 'Khách đã cung cấp thông tin';
                elsif seq % 2 = 0 then
                    v_step    := 'closed';
                    v_sreason := 'KH không đưa thông tin';
                else
                    v_step    := 'waiting_info';
                    v_sreason := 'Khách cần cung cấp số điện thoại hoặc số tài khoản';
                end if;

                insert into public.cskh_state
                    (user_id, session_id, channel, step, reason, updated_at)
                values (v_uid, v_sid, v_chan, v_step, v_sreason,
                        v_start + make_interval(mins => (v_nmsg + 1) * 3));
            end if;

            -- ---------- cskh_requests (chỉ CCC) ----------
            if v_outcome = 'CCC' then
                -- Xoay 3 loại liên hệ, dùng ĐÚNG dữ liệu có thật trong CRM
                -- để ticket sinh ra nối được vào khách hàng.
                if seq % 3 = 0 then
                    v_ctype   := 'account';
                    v_contact := 'CB' || lpad(((seq % 120) + 1)::text, 8, '0');
                elsif seq % 3 = 1 then
                    v_ctype   := 'phone';
                    v_contact := '091' || lpad(((seq % 120) + 1)::text, 7, '0');
                else
                    v_ctype   := 'email';
                    v_contact := 'chatbot.demo.' || lpad(((seq % 120) + 1)::text, 5, '0') || '@example.com';
                end if;

                insert into public.cskh_requests
                    (user_id, session_id, channel, contact_info, contact_type, reason, status, created_at)
                values (v_uid, v_sid, v_chan, v_contact, v_ctype,
                        c_reason[(seq % 6)::int + 1], 'collected',
                        v_start + make_interval(mins => (v_nmsg + 2) * 3));
            end if;

        end loop;
    end loop;

    raise notice 'Seed xong: % phien', seq;
end
$$;

commit;


-- =====================================================================
--  KIỂM CHỨNG NHANH (chạy sau khi seed)
-- =====================================================================
-- Số phiên theo QUÝ
--   select to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY"-Q"Q') as quy,
--          count(distinct session_id) as so_phien
--   from public.xpro_chat_logs where session_id like 'seed-%'
--   group by 1 order by 1;
--
-- Số phiên theo NĂM
--   select extract(year from created_at at time zone 'Asia/Ho_Chi_Minh') as nam,
--          count(distinct session_id) as so_phien
--   from public.xpro_chat_logs where session_id like 'seed-%'
--   group by 1 order by 1;
--
-- Tổng dòng
--   select 'chat_logs' t, count(*) from public.xpro_chat_logs where session_id like 'seed-%'
--   union all select 'state',    count(*) from public.cskh_state    where session_id like 'seed-%'
--   union all select 'requests', count(*) from public.cskh_requests where session_id like 'seed-%';


-- =====================================================================
--  ROLLBACK — gỡ sạch dữ liệu seed, trả bảng về nguyên trạng
-- =====================================================================
-- begin;
--   delete from public.cskh_requests  where session_id like 'seed-%';
--   delete from public.cskh_state     where session_id like 'seed-%';
--   delete from public.xpro_chat_logs where session_id like 'seed-%';
-- commit;
