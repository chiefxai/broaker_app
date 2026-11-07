#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd -- "$script_dir/.." && pwd)"
backend_dir="$app_dir/backend"
frontend_dir="$app_dir/frontend"

if [[ -z "${HOST_LAN_IP:-}" ]]; then
  if command -v ipconfig >/dev/null 2>&1; then
    for interface in en0 en1 en2 en3 en4 en5 en6 en7 en8 en9; do
      candidate_ip="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
      if [[ -z "$candidate_ip" ]] && command -v ifconfig >/dev/null 2>&1; then
        candidate_ip="$(ifconfig "$interface" 2>/dev/null | awk '$1 == "inet" && $2 != "127.0.0.1" {print $2; exit}' || true)"
      fi
      if [[ -n "$candidate_ip" && "$candidate_ip" != 169.254.* ]]; then
        HOST_LAN_IP="$candidate_ip"
        break
      fi
    done
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
if [[ ! -f "$frontend_dir/.env.local" ]]; then
  echo "Frontend env file not found: $frontend_dir/.env.local" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install and start Docker Desktop, then retry." >&2
  exit 1
fi

export HOST_LAN_IP
export MINIO_BIND_HOST=0.0.0.0
export KEYCLOAK_BIND_HOST=0.0.0.0
cd "$app_dir"
docker compose --env-file "$backend_dir/.env" -p broaker-app \
  -f "$backend_dir/docker-compose.yml" \
  -f "$app_dir/docker-compose.fullstack.yml" \
  up --build -d

echo
echo "Broaker is starting. Open exp://$HOST_LAN_IP:8082 in Expo Go."
echo "API: http://$HOST_LAN_IP:8001/api/v1"
