#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
export PROJECT_ROOT
COMPOSE_FILE="${PROJECT_ROOT}/infra/compose/test.yml"
COMPOSE_CMD=(docker compose --project-directory "${PROJECT_ROOT}" -f "${COMPOSE_FILE}")

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker command is not available." >&2
  exit 1
fi

has_npm_script() {
  local package_json="$1"
  local script_name="$2"

  node -e "
const fs = require('node:fs');
const path = process.argv[1];
const script = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
process.exit(pkg.scripts && pkg.scripts[script] ? 0 : 1);
" "${package_json}" "${script_name}"
}

if [[ -z "$("${COMPOSE_CMD[@]}" ps --status running -q postgres-test)" ]]; then
  "${PROJECT_ROOT}/scripts/test-start.sh"
fi

echo "Running backend test suite..."
"${COMPOSE_CMD[@]}" exec -T backend-test npm test

if has_npm_script "${PROJECT_ROOT}/apps/frontend/package.json" "test"; then
  echo "Running frontend test suite..."
  "${COMPOSE_CMD[@]}" exec -T frontend-test npm test
else
  echo "Skipping frontend tests: no \"test\" script in apps/frontend/package.json."
fi

echo "All configured test suites finished successfully."
