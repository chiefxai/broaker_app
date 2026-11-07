#!/usr/bin/env bash
set -euo pipefail

api_port="${API_PORT:-8000}"
expo_port="${EXPO_PORT:-8081}"

cd /app/backend
if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
  python -m alembic upgrade head
fi

python -m uvicorn app.main:app --host 0.0.0.0 --port "$api_port" &
api_pid=$!

cd /app/frontend
./node_modules/.bin/expo start --host lan --port "$expo_port" --go &
expo_pid=$!

stop_children() {
  kill "$api_pid" "$expo_pid" 2>/dev/null || true
  wait "$api_pid" "$expo_pid" 2>/dev/null || true
}

trap stop_children TERM INT

set +e
wait -n "$api_pid" "$expo_pid"
status=$?
set -e

stop_children
exit "$status"
