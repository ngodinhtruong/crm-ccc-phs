#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/crm"
FRONTEND_DIR="$ROOT_DIR/crm-frontend"
PYTHON_EXE="$BACKEND_DIR/.venv/bin/python"

# Project-local ports. Override from shell if needed:
#   BACKEND_PORT=8012 FRONTEND_PORT=3012 ./start-dev-isolated.sh
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8011}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-3011}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6380}"

REDIS_BROKER_DB="${REDIS_BROKER_DB:-10}"
REDIS_RESULT_DB="${REDIS_RESULT_DB:-11}"
REDIS_CACHE_DB="${REDIS_CACHE_DB:-12}"

if [[ ! -x "$PYTHON_EXE" ]]; then
    echo "[ERROR] Không tìm thấy Python virtualenv: $PYTHON_EXE" >&2
    echo "Tạo virtualenv trong đúng project này rồi cài requirements:" >&2
    echo "  cd \"$BACKEND_DIR\" && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt" >&2
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

if ! "$PYTHON_EXE" - <<PY >/dev/null 2>&1
import redis
redis.Redis(host="$REDIS_HOST", port=int("$REDIS_PORT"), db=int("$REDIS_BROKER_DB")).ping()
PY
then
    echo "[ERROR] Redis riêng cho project chưa chạy tại $REDIS_HOST:$REDIS_PORT." >&2
    echo "Project này không dùng Docker. Hãy chạy Redis local ở port này, hoặc trỏ script sang Redis local đang có:" >&2
    echo "  REDIS_PORT=6379 ./start-dev-isolated.sh" >&2
    echo "Nếu Redis chưa được cài trên máy, cài/chạy redis-server local trước rồi chạy lại script." >&2
    exit 1
fi

export CELERY_BROKER_URL="redis://$REDIS_HOST:$REDIS_PORT/$REDIS_BROKER_DB"
export CELERY_RESULT_BACKEND="redis://$REDIS_HOST:$REDIS_PORT/$REDIS_RESULT_DB"
export REDIS_CACHE_URL="redis://$REDIS_HOST:$REDIS_PORT/$REDIS_CACHE_DB"
export CORS_ALLOWED_ORIGINS="http://$FRONTEND_HOST:$FRONTEND_PORT,http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT"
export CSRF_TRUSTED_ORIGINS="$CORS_ALLOWED_ORIGINS"
export ALLOWED_HOSTS="localhost,127.0.0.1,$BACKEND_HOST"
export NEXT_PUBLIC_API_URL="http://$BACKEND_HOST:$BACKEND_PORT/api"

pids=()

stop_services() {
    echo
    echo "Đang dừng các tiến trình của crm-ccc-phs..."
    if ((${#pids[@]})); then
        kill "${pids[@]}" 2>/dev/null || true
        wait "${pids[@]}" 2>/dev/null || true
    fi
}

trap stop_services EXIT INT TERM

echo "Project: $ROOT_DIR"
echo "Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
echo "Frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "Redis:    redis://$REDIS_HOST:$REDIS_PORT DB $REDIS_BROKER_DB/$REDIS_RESULT_DB/$REDIS_CACHE_DB"

echo "Áp dụng migration cho database của project..."
(cd "$BACKEND_DIR" && "$PYTHON_EXE" manage.py migrate --noinput)

echo "Đang khởi động Django, Next.js, Celery Worker và Celery Beat..."

(cd "$BACKEND_DIR" && exec "$PYTHON_EXE" manage.py runserver "$BACKEND_HOST:$BACKEND_PORT") &
pids+=("$!")

(cd "$FRONTEND_DIR" && exec env NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" npm run dev -- --hostname "$FRONTEND_HOST" --port "$FRONTEND_PORT") &
pids+=("$!")

(cd "$BACKEND_DIR" && exec "$PYTHON_EXE" -m celery -A config worker --loglevel=info --pool=solo) &
pids+=("$!")

(cd "$BACKEND_DIR" && exec "$PYTHON_EXE" -m celery -A config beat --loglevel=info) &
pids+=("$!")

echo "Đã khởi động 4 tiến trình. Nhấn Ctrl+C để dừng riêng các tiến trình này."

wait -n "${pids[@]}"
echo "Một tiến trình đã dừng; đang đóng các tiến trình còn lại." >&2
