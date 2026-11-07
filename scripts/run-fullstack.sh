#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd -- "$script_dir/.." && pwd)"
parent_dir="$(dirname -- "$app_dir")"
backend_dir="$parent_dir/broaker app backend"

if [[ -z "${HOST_LAN_IP:-}" ]]; then
  if command -v ipconfig >/dev/null 2>&1; then
    HOST_LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  fi
  if [[ -z "${HOST_LAN_IP:-}" ]] && command -v ip >/dev/null 2>&1; then
    HOST_LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") {print $(i + 1); exit}}')"
  fi
fi

if [[ -z "${HOST_LAN_IP:-}" ]]; then
  echo "Could not detect the host LAN IPv4 address." >&2
  echo "Run again with HOST_LAN_IP set, for example: HOST_LAN_IP=192.168.1.20 $0" >&2
  exit 1
fi

if [[ ! -f "$backend_dir/.env" ]]; then
  echo "Backend env file not found: $backend_dir/.env" >&2
  exit 1
fi
if [[ ! -f "$app_dir/.env.local" ]]; then
  echo "Frontend env file not found: $app_dir/.env.local" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install and start Docker Desktop, then retry." >&2
  exit 1
fi

export HOST_LAN_IP
cd "$backend_dir"
docker compose --env-file .env -p broaker-app-backend \
  -f docker-compose.yml \
  -f "$app_dir/docker-compose.fullstack.yml" \
  --profile testing up --build -d

echo
echo "Broaker is starting. Open exp://$HOST_LAN_IP:8082 in Expo Go."
echo "API: http://$HOST_LAN_IP:8001/api/v1"
