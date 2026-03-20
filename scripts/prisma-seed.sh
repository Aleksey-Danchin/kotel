#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_ROOT}/infra/compose/dev.yml"
COMPOSE_CMD=(docker compose --project-directory "${PROJECT_ROOT}" -f "${COMPOSE_FILE}")

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker command is not available." >&2
  exit 1
fi

HOST_UID="$(id -u)"
HOST_GID="$(id -g)"
STUDIO_WAS_RUNNING=0
STUDIO_STARTED_BY_SCRIPT=0

if [[ -n "$("${COMPOSE_CMD[@]}" ps --status running -q studio)" ]]; then
  STUDIO_WAS_RUNNING=1
fi

if [[ "${STUDIO_WAS_RUNNING}" -eq 0 ]]; then
  "${COMPOSE_CMD[@]}" up -d studio
  STUDIO_STARTED_BY_SCRIPT=1
fi

cleanup() {
  local exit_code=$?
  set +e

  if [[ -n "$("${COMPOSE_CMD[@]}" ps --status running -q studio)" ]]; then
    "${COMPOSE_CMD[@]}" exec -T studio sh -lc "chown -R ${HOST_UID}:${HOST_GID} /app/apps/prisma"
  else
    "${COMPOSE_CMD[@]}" run --rm --no-deps studio sh -lc "chown -R ${HOST_UID}:${HOST_GID} /app/apps/prisma"
  fi

  if [[ "${STUDIO_WAS_RUNNING}" -eq 1 ]]; then
    "${COMPOSE_CMD[@]}" restart studio
  elif [[ "${STUDIO_STARTED_BY_SCRIPT}" -eq 1 ]]; then
    "${COMPOSE_CMD[@]}" stop studio
  fi

  exit "${exit_code}"
}

trap cleanup EXIT

"${COMPOSE_CMD[@]}" exec -T studio npx prisma migrate reset --force
"${COMPOSE_CMD[@]}" exec -T studio npx prisma generate
"${COMPOSE_CMD[@]}" exec -T studio npx prisma db seed
