#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
export PROJECT_ROOT

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
CERT_FILE="${CERT_DIR}/kotel.localhost.pem"
KEY_FILE="${CERT_DIR}/kotel.localhost-key.pem"

generate_cert=0
if [[ ! -f "${CERT_FILE}" || ! -f "${KEY_FILE}" ]]; then
  generate_cert=1
elif ! openssl x509 -checkend 86400 -noout -in "${CERT_FILE}" >/dev/null 2>&1; then
  generate_cert=1
fi

if [[ "${generate_cert}" -eq 1 ]]; then
  mkdir -p "${CERT_DIR}"
  mkcert -cert-file "${CERT_FILE}" -key-file "${KEY_FILE}" kotel.localhost
  echo "SSL certificate generated."
else
  echo "SSL certificate is valid."
fi

export MKCERT_CAROOT

docker compose \
  --project-directory "${PROJECT_ROOT}" \
  -f "${PROJECT_ROOT}/infra/compose/dev.yml" \
  up -d --build

POSTGRES_PORT_DISPLAY="5432"
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
  set +a
  POSTGRES_PORT_DISPLAY="${POSTGRES_PORT:-${POSTGRES_PORT_DISPLAY}}"
fi

echo "Kotel dev environment started."
echo "  Frontend: https://kotel.localhost"
echo "  Backend:  https://kotel.localhost/api"
echo "  Studio:   http://localhost:5555"
echo "  Postgres: localhost:${POSTGRES_PORT_DISPLAY}"
echo
echo "  Logs: docker compose --project-directory \"${PROJECT_ROOT}\" -f \"${PROJECT_ROOT}/infra/compose/dev.yml\" logs -f"
