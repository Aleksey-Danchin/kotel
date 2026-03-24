# Step 06: Dev Start/Stop Scripts

## Goal
Create `scripts/dev-start.sh` and `scripts/dev-stop.sh` — the primary entry points for starting and stopping the development environment. `dev-start.sh` includes SSL certificate verification/generation before starting compose. `dev-stop.sh` simply stops compose.

## Motivation
Developers should start the entire dev stack with a single command. The startup script handles infrastructure prerequisites (TLS certs) automatically, so developers don't need to remember manual setup steps. The stop script provides a clean shutdown.

## Type
infra

## Affected Area
- `scripts/dev-start.sh` (new)
- `scripts/dev-stop.sh` (new)

## Dependencies
Depends on steps 01, 02, 03, 04, 05.

## Current Behavior
<CORRECTION by="step-executor" reason="factual mismatch: scripts directory already exists">
`scripts/` already exists and currently contains `scripts/step-queue.js`. No startup/shutdown scripts exist yet.
</CORRECTION>

## Expected Behavior
- `scripts/dev-start.sh` checks/generates TLS certificates, then starts the Docker Compose stack.
- `scripts/dev-stop.sh` stops the Docker Compose stack.
- Both scripts are executable (`chmod +x`).
- Both scripts work correctly regardless of the current working directory.

## Specification

### `scripts/dev-start.sh`

**Shebang:** `#!/usr/bin/env bash`

**Error handling:** `set -euo pipefail`

**Step 1 — Resolve paths:**
```
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
```
All subsequent paths are derived from `PROJECT_ROOT`.

**Step 2 — Check prerequisites:**
- Verify `docker` is available (`command -v docker`). Exit with error message if not.
- Verify `mkcert` is available (`command -v mkcert`). Exit with error message if not.

**Step 3 — SSL certificate check/generation:**

Certificate location: `$(mkcert -CAROOT)/kotel/kotel.localhost.pem` and `kotel.localhost-key.pem`.

Logic:
1. Get `MKCERT_CAROOT` by running `mkcert -CAROOT`.
2. Define `CERT_DIR="${MKCERT_CAROOT}/kotel"`.
3. Define `CERT_FILE="${CERT_DIR}/kotel.localhost.pem"` and `KEY_FILE="${CERT_DIR}/kotel.localhost-key.pem"`.
4. If `CERT_FILE` or `KEY_FILE` does not exist → generate.
5. If files exist, check expiry: `openssl x509 -checkend 86400 -noout -in "${CERT_FILE}"` (checks if cert expires within 24 hours). If expired or expiring → regenerate.
6. To generate:
   - `mkdir -p "${CERT_DIR}"`
   - `mkcert -cert-file "${CERT_FILE}" -key-file "${KEY_FILE}" kotel.localhost`
7. Print status message: "✓ SSL certificate is valid" or "✓ SSL certificate generated".

**Step 4 — Export MKCERT_CAROOT:**
```bash
export MKCERT_CAROOT
```
This ensures the compose file's `${MKCERT_CAROOT}` variable resolves correctly when docker compose reads the volume mount.

**Step 5 — Start Docker Compose:**
```bash
docker compose --project-directory "${PROJECT_ROOT}" -f "${PROJECT_ROOT}/infra/compose/dev.yml" up -d --build
```
- `--project-directory "${PROJECT_ROOT}"` — ensures `.env` is read from the project root.
- `-d` — detached mode.
- `--build` — rebuild images if Dockerfiles changed.

**Step 6 — Print status:**
After compose up, print a summary:
```
Kotel dev environment started.
  Frontend: https://kotel.localhost
  Backend:  https://kotel.localhost/api
  Studio:   http://localhost:5555
  Postgres: localhost:${POSTGRES_PORT}

  Logs: docker compose --project-directory "${PROJECT_ROOT}" -f "${PROJECT_ROOT}/infra/compose/dev.yml" logs -f
```

### `scripts/dev-stop.sh`

**Shebang:** `#!/usr/bin/env bash`

**Error handling:** `set -euo pipefail`

**Steps:**
1. Resolve `SCRIPT_DIR` and `PROJECT_ROOT` (same as dev-start).
2. Run: `docker compose --project-directory "${PROJECT_ROOT}" -f "${PROJECT_ROOT}/infra/compose/dev.yml" down`
3. Print: "Kotel dev environment stopped."

### File Permissions
Both scripts must be executable. The implementing agent should run `chmod +x scripts/dev-start.sh scripts/dev-stop.sh` after creating them.

## Acceptance Criteria
1. `scripts/dev-start.sh` exists and is executable.
2. `scripts/dev-stop.sh` exists and is executable.
3. `dev-start.sh` checks for `docker` and `mkcert` commands, exits with clear error if missing.
4. `dev-start.sh` checks for cert files at `$(mkcert -CAROOT)/kotel/kotel.localhost.pem` and `kotel.localhost-key.pem`.
5. If certs are missing or expired (within 24h), `dev-start.sh` generates new ones using `mkcert -cert-file ... -key-file ...`.
6. `dev-start.sh` exports `MKCERT_CAROOT` for compose variable interpolation.
7. `dev-start.sh` runs `docker compose up -d --build` with correct `--project-directory` and `-f` flags.
8. `dev-stop.sh` runs `docker compose down` with matching flags.
9. Both scripts work when called from any directory (use `SCRIPT_DIR`/`PROJECT_ROOT` resolution).

## Verification Scenario
1. From the project root, run `bash scripts/dev-start.sh`.
2. Verify cert files exist at `$(mkcert -CAROOT)/kotel/`.
3. Run `docker compose --project-directory . -f infra/compose/dev.yml ps` — verify all 5 services are running and healthy.
4. Open `https://kotel.localhost` — verify frontend loads (browser must trust mkcert CA).
5. Open `https://kotel.localhost/api` — verify backend responds.
6. Open `http://localhost:5555` — verify Prisma Studio loads.
7. Run `bash scripts/dev-stop.sh` — verify all containers stop.
8. Run `docker compose --project-directory . -f infra/compose/dev.yml ps` — verify no containers running.

## Testing
Manual end-to-end verification as described in the scenario above. No automated tests for shell scripts at this stage.

## Notes
- The `openssl x509 -checkend` command returns exit code 1 if the certificate will expire within the specified seconds (86400 = 24 hours). Handle this with `if ! openssl x509 ... 2>/dev/null; then` to also cover the case where the cert file exists but is malformed.
- The `docker compose up --build` flag ensures images are rebuilt if Dockerfiles change, but doesn't force a full rebuild if nothing changed (it's fast for no-op rebuilds).
- For POSTGRES_PORT in the status message, either source the `.env` file or use a default value. Sourcing `.env` is acceptable: `source "${PROJECT_ROOT}/.env"`.
- The `mkcert` root CA must already be installed in the system trust store (`mkcert -install`). If not, browsers won't trust the generated certs. Consider adding a check for this in `dev-start.sh` or at least a note in the output.
