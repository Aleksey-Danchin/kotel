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

if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
  set +a
fi

if [[ -z "${HOST_IP:-}" ]]; then
  HOST_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}')"
fi

if [[ -z "${HOST_IP:-}" ]]; then
  HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

if [[ -z "${HOST_IP:-}" ]]; then
  echo "Error: unable to detect HOST_IP for mobile API routing." >&2
  exit 1
fi

export HOST_IP
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-https://${HOST_IP}/api}"
export EXPO_PUBLIC_API_HOST_HEADER="${EXPO_PUBLIC_API_HOST_HEADER:-kotel.localhost}"

docker compose \
  --project-directory "${PROJECT_ROOT}" \
  -f "${PROJECT_ROOT}/infra/compose/dev.yml" \
  up -d --build postgres backend frontend studio traefik

POSTGRES_PORT_DISPLAY="5432"
POSTGRES_PORT_DISPLAY="${POSTGRES_PORT:-${POSTGRES_PORT_DISPLAY}}"

echo "Kotel dev environment started."
echo "  Frontend: https://kotel.localhost"
echo "  Backend:  https://kotel.localhost/api"
echo "  Studio:   http://localhost:5555"
echo "  Mobile:   attached Expo CLI (LAN mode)"
echo "  Mobile API base URL: ${EXPO_PUBLIC_API_BASE_URL}"
echo "  Mobile host header:  ${EXPO_PUBLIC_API_HOST_HEADER}"
echo "  Postgres: localhost:${POSTGRES_PORT_DISPLAY}"
echo
echo "  Logs: docker compose --project-directory \"${PROJECT_ROOT}\" -f \"${PROJECT_ROOT}/infra/compose/dev.yml\" logs -f"
echo
echo "Attaching to mobile Expo CLI..."
echo "Use Ctrl+C to stop the attached Expo process."
echo "Core services remain running; use scripts/dev-stop.sh to stop the full stack."

docker compose \
  --project-directory "${PROJECT_ROOT}" \
  -f "${PROJECT_ROOT}/infra/compose/dev.yml" \
  up --build mobile
