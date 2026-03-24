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
mkdir -p "${CERT_DIR}"

ensure_cert() {
  local domain="$1"
  local cert_file="${CERT_DIR}/${domain}.pem"
  local key_file="${CERT_DIR}/${domain}-key.pem"

  local generate_cert=0
  if [[ ! -f "${cert_file}" || ! -f "${key_file}" ]]; then
    generate_cert=1
  elif ! openssl x509 -checkend 86400 -noout -in "${cert_file}" >/dev/null 2>&1; then
    generate_cert=1
  fi

  if [[ "${generate_cert}" -eq 1 ]]; then
    mkcert -cert-file "${cert_file}" -key-file "${key_file}" "${domain}"
    echo "SSL certificate generated for ${domain}."
  else
    echo "SSL certificate is valid for ${domain}."
  fi
}

ensure_cert "kotel.localhost"
ensure_cert "katel.localhost"

export MKCERT_CAROOT

if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
  set +a
fi

is_valid_ipv4() {
  local ip="$1"
  [[ "${ip}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  awk -F. '
    NF != 4 { exit 1 }
    {
      for (i = 1; i <= 4; i++) {
        if ($i < 0 || $i > 255) {
          exit 1
        }
      }
    }
  ' <<<"${ip}" >/dev/null 2>&1
}

if [[ -z "${HOST_IP:-}" ]]; then
  echo "Error: HOST_IP is required for Expo LAN and must be set in .env or env." >&2
  echo "Hint: run with explicit LAN IP, e.g. HOST_IP=192.168.1.42 scripts/dev-start.sh" >&2
  exit 1
fi

if ! is_valid_ipv4 "${HOST_IP}"; then
  echo "Error: HOST_IP='${HOST_IP}' is not a valid IPv4 address." >&2
  echo "Hint: run with explicit LAN IP, e.g. HOST_IP=192.168.1.42 scripts/dev-start.sh" >&2
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
  run --build --rm --service-ports mobile
