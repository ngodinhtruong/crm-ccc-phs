#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/crm"
FRONTEND_DIR="$ROOT_DIR/crm-frontend"
PYTHON_EXE="$BACKEND_DIR/.venv/bin/python"

if [[ ! -x "$PYTHON_EXE" ]]; then
    echo "[ERROR] Không tìm thấy Python virtualenv: $PYTHON_EXE" >&2
    echo "Hãy tạo virtualenv và cài requirements trước khi chạy." >&2
    exit 1
fi

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
    echo "[ERROR] Không tìm thấy frontend: $FRONTEND_DIR" >&2
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] Không tìm thấy npm. Hãy cài Node.js và npm." >&2
    exit 1
fi

if ! "$PYTHON_EXE" -c "import redis; redis.Redis(host='127.0.0.1', port=6379).ping()" >/dev/null 2>&1; then
    echo "[ERROR] Redis chưa chạy hoặc không kết nối được tại 127.0.0.1:6379." >&2
    echo "Hãy khởi động Redis, ví dụ: sudo systemctl start redis-server" >&2
    exit 1
fi

echo "Redis đang hoạt động tại 127.0.0.1:6379."

pids=()

stop_services() {
    echo
    echo "Đang dừng các dịch vụ..."
    if ((${#pids[@]})); then
        kill "${pids[@]}" 2>/dev/null || true
        wait "${pids[@]}" 2>/dev/null || true
    fi
}

trap stop_services EXIT INT TERM

echo "Đang khởi động Django, React, Celery Worker và Celery Beat..."

(cd "$BACKEND_DIR" && exec "$PYTHON_EXE" manage.py runserver 0.0.0.0:8000) &
pids+=("$!")

(cd "$FRONTEND_DIR" && exec npm run dev -- --hostname 0.0.0.0) &
pids+=("$!")

(cd "$BACKEND_DIR" && exec "$PYTHON_EXE" -m celery -A config worker --loglevel=info --pool=solo) &
pids+=("$!")

(cd "$BACKEND_DIR" && exec "$PYTHON_EXE" -m celery -A config beat --loglevel=info) &
pids+=("$!")

echo "Đã khởi động 4 tiến trình. Nhấn Ctrl+C để dừng tất cả."

wait -n "${pids[@]}"
echo "Một tiến trình đã dừng; đang đóng các tiến trình còn lại." >&2
