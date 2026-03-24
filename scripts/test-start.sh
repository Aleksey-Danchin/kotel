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

if ! command -v mkcert >/dev/null 2>&1; then
  echo "Error: mkcert command is not available." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl command is not available." >&2
  exit 1
fi

MKCERT_CAROOT="$(mkcert -CAROOT)"
CERT_DIR="${MKCERT_CAROOT}/kotel"
CERT_FILE="${CERT_DIR}/kotel1.localhost.pem"
KEY_FILE="${CERT_DIR}/kotel1.localhost-key.pem"

generate_cert=0
if [[ ! -f "${CERT_FILE}" || ! -f "${KEY_FILE}" ]]; then
  generate_cert=1
elif ! openssl x509 -checkend 86400 -noout -in "${CERT_FILE}" >/dev/null 2>&1; then
  generate_cert=1
fi

if [[ "${generate_cert}" -eq 1 ]]; then
  mkdir -p "${CERT_DIR}"
  mkcert -cert-file "${CERT_FILE}" -key-file "${KEY_FILE}" kotel1.localhost
  echo "SSL certificate generated."
else
  echo "SSL certificate is valid."
fi

export MKCERT_CAROOT
export TEST_SESSION_COOKIE_DOMAIN="${TEST_SESSION_COOKIE_DOMAIN:-kotel1.localhost}"

if [[ -z "${TEST_SESSION_COOKIE_DOMAIN}" ]]; then
  echo "Error: TEST_SESSION_COOKIE_DOMAIN must be non-empty." >&2
  exit 1
fi

"${COMPOSE_CMD[@]}" up -d postgres-test studio-test

wait_for_healthy() {
  local service="$1"
  local timeout_seconds="${2:-120}"
  local elapsed=0

  while (( elapsed < timeout_seconds )); do
    local container_id
    container_id="$("${COMPOSE_CMD[@]}" ps -q "${service}")"

    if [[ -n "${container_id}" ]]; then
      local status
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}")"
      if [[ "${status}" == "healthy" || "${status}" == "running" ]]; then
        echo "Service ${service} is ${status}."
        return 0
      fi
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Error: service ${service} did not become healthy within ${timeout_seconds}s." >&2
  return 1
}

wait_for_healthy postgres-test
wait_for_healthy studio-test

"${COMPOSE_CMD[@]}" exec -T studio-test npx prisma migrate deploy
"${COMPOSE_CMD[@]}" exec -T studio-test npx prisma db seed

"${COMPOSE_CMD[@]}" up -d backend-test frontend-test traefik-test

wait_for_healthy backend-test
wait_for_healthy frontend-test
wait_for_healthy traefik-test

echo "Kotel test environment started and bootstrapped."
echo "  Backend (TLS via Traefik): https://kotel1.localhost:${TEST_HTTPS_PORT:-8443}/api"
echo "  Frontend (TLS via Traefik): https://kotel1.localhost:${TEST_HTTPS_PORT:-8443}"
echo "  Postgres: localhost:${TEST_POSTGRES_PORT:-55432}"
