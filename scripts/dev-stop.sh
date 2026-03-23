#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
export PROJECT_ROOT
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://127.0.0.1:3000}"
export HOST_IP="${HOST_IP:-127.0.0.1}"

MOBILE_CONTAINERS="$(
  docker ps -aq \
    --filter "label=com.docker.compose.project=kotel" \
    --filter "label=com.docker.compose.service=mobile"
)"
if [[ -n "${MOBILE_CONTAINERS}" ]]; then
  docker rm -f ${MOBILE_CONTAINERS} >/dev/null 2>&1 || true
fi

docker compose \
  --project-directory "${PROJECT_ROOT}" \
  -f "${PROJECT_ROOT}/infra/compose/dev.yml" \
  down

echo "Kotel dev environment stopped."
