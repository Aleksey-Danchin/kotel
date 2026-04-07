#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <round-name>" >&2
  exit 1
fi

ROUND_NAME="$1"
if [[ -z "${ROUND_NAME}" ]]; then
  echo "Error: round name must not be empty." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
DEV_DIR="${PROJECT_ROOT}/.dev"
ARCHIVE_DIR="${DEV_DIR}/archive"

mkdir -p "${ARCHIVE_DIR}"

MAX_NUMBER=-1
shopt -s nullglob
for entry in "${ARCHIVE_DIR}"/*; do
  [[ -d "${entry}" ]] || continue
  base_name="$(basename "${entry}")"
  if [[ "${base_name}" =~ ^([0-9]{3})- ]]; then
    current_number=$((10#${BASH_REMATCH[1]}))
    if (( current_number > MAX_NUMBER )); then
      MAX_NUMBER="${current_number}"
    fi
  fi
done
shopt -u nullglob

NEXT_NUMBER=$((MAX_NUMBER + 1))
ROUND_PREFIX="$(printf "%03d" "${NEXT_NUMBER}")"
ROUND_DIR_NAME="${ROUND_PREFIX}-${ROUND_NAME}"
ROUND_DIR_PATH="${DEV_DIR}/${ROUND_DIR_NAME}"
ARCHIVED_ROUND_PATH="${ARCHIVE_DIR}/${ROUND_DIR_NAME}"

if [[ -e "${ARCHIVED_ROUND_PATH}" || -e "${ROUND_DIR_PATH}" ]]; then
  echo "Error: round directory already exists: ${ROUND_DIR_NAME}" >&2
  exit 1
fi

mkdir -p "${ROUND_DIR_PATH}"

shopt -s dotglob nullglob
for entry in "${DEV_DIR}"/*; do
  entry_name="$(basename "${entry}")"
  if [[ "${entry_name}" == "archive" || "${entry_name}" == "${ROUND_DIR_NAME}" ]]; then
    continue
  fi
  mv "${entry}" "${ROUND_DIR_PATH}/"
done
shopt -u dotglob nullglob

mv "${ROUND_DIR_PATH}" "${ARCHIVE_DIR}/"
touch "${DEV_DIR}/suggestion.md"

echo "Development round archived to ${ARCHIVED_ROUND_PATH}"
