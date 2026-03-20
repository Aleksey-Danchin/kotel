#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
export PROJECT_ROOT

docker compose \
  --project-directory "${PROJECT_ROOT}" \
  -f "${PROJECT_ROOT}/infra/compose/test.yml" \
  down

echo "Kotel test environment stopped."
