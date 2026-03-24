# Step 01: Build Test Compose and Runner Scripts

## Goal
Create a dedicated Docker test environment and executable scripts that start/stop it safely and run the full automated test cycle used by implementation agents.

## Motivation
Session endpoint tests must run against a real database with isolated test data, not against the development stack or mocks. A reproducible test harness is required before endpoint implementation and verification.

## Type
infra, architectural, backend

## Affected Area
`infra/compose/dev.yml`, `infra/compose/test.yml` (new), `scripts/test-start.sh` (new), `scripts/test-stop.sh` (new), `scripts/test-run.sh` (new), `scripts/dev-stop.sh`

## Dependencies
None

## Current Behavior
Only `dev` compose exists in `infra/compose/dev.yml`, and scripts only control that stack (`dev-start.sh`, `dev-stop.sh`). There is no dedicated test stack, no test lifecycle scripts, and no isolated test database workflow.

## Expected Behavior
A separate `test` compose manifest exists with test-prefixed service names, isolated DB storage policy, TLS-enabled Traefik, and a non-UI studio service used for migration/seed bootstrap. Scripts can start/stop test services independently and execute all tests in this environment.

## Specification
- Add `infra/compose/test.yml` by mirroring `infra/compose/dev.yml` structure, but with explicit test-purpose differences:
  - Compose project name is test-specific (for isolated networks/containers).
  - Service naming uses a `test-` prefix.
  <CORRECTION by="step-executor" reason="Repository conventions for test service names">
  In this codebase, test services and containers are consistently named with a `-test` suffix (e.g. `backend-test`, `kris-backend-test`) in skills and runner conventions. Implementation will use `-test` suffix naming to stay compatible with existing test tooling.
  </CORRECTION>
  - Postgres has no persistent host volume (ephemeral test data only).
  - Studio is present but not published as interactive UI; it is used to run migration and seed before tests.
  - Traefik is included with TLS checks similarly to development flow.
- Define script contract:
  - `scripts/test-start.sh`
    - validates required tools (docker, mkcert, openssl, same style as `dev-start.sh`)
    - ensures test certificates are available
    - starts test compose services
    - triggers migration + seed in the test stack before tests execute
  - `scripts/test-stop.sh`
    - shuts down only the test stack and leaves dev stack untouched
  - `scripts/test-run.sh`
    - orchestrates full automated tests in test environment (backend + frontend where configured)
    - is the canonical entrypoint for step agents (`steps-man`/`step-imp`)
    - exits non-zero on any failure
- Keep compatibility rule:
  - `scripts/dev-stop.sh` must not stop the test stack.
- Preserve and reuse existing style in scripts (`set -euo pipefail`, project-root resolution, explicit compose command arrays) from:
  - `scripts/dev-start.sh`
  - `scripts/prisma-migrate.sh`
  - `scripts/prisma-seed.sh`

## Acceptance Criteria
1. `infra/compose/test.yml` exists and defines isolated test services (including postgres, backend, frontend, studio, traefik) with test-specific naming.
2. Test postgres storage is non-persistent between stack recreations.
3. `test-start.sh` starts the test stack and performs migration + seed before tests.
4. `test-stop.sh` only affects test compose resources.
5. `test-run.sh` is executable and runs the full configured test suite with proper exit codes.
6. Running `dev-stop.sh` does not shut down test containers.

## Verification Scenario
1. Run `./scripts/test-start.sh`.
2. Confirm test containers are up and healthy.
3. Confirm migration and seed completed for test DB.
4. Run `./scripts/test-run.sh` and observe pass/fail propagation.
5. Run `./scripts/dev-stop.sh` and verify test containers remain running.
6. Run `./scripts/test-stop.sh` and verify test containers are removed/stopped.

## Testing
- Manual infrastructure verification via docker compose health/state checks.
- Script behavior checks for success and failure paths.
- Integration check that test DB is seeded and isolated from dev DB.

## Notes
- Keep environment-variable names explicit and separate for dev/test domain and ports where needed.
- Do not silently reuse dev compose resources in test scripts.
