Котел мессенджер.

## Project Rules

- Testing and DTO policy: `.cursor/rules/testing.mdc`
- Required stack: Vitest for non-E2E tests, Playwright for E2E tests
- Backend DTO validation policy: Zod-first for new request/response contracts

## Shared Contracts and Session Envs

- Frontend imports shared backend contracts via `@contracts/*` (mapped to `apps/backend/src/contracts/*`).
- Avoid cross-app relative imports like `../../backend/...` from frontend code.
- Required session env vars:
  - `SESSION_COOKIE_DOMAIN` - required for backend cookie domain.
  - `IDLE_TIMEOUT` - required positive integer in seconds.
- Test stack deterministic env inputs:
  - `TEST_SESSION_COOKIE_DOMAIN` (mapped to backend `SESSION_COOKIE_DOMAIN` in `infra/compose/test.yml`).
  - `TEST_IDLE_TIMEOUT` (mapped to backend `IDLE_TIMEOUT` in `infra/compose/test.yml`).

## Dev Start Behavior

- `scripts/dev-start.sh` starts core services in background, then attaches the terminal to the mobile Expo CLI.
- Expo runs in LAN mode (`expo start --lan`) so QR code and hotkeys remain visible in the same terminal.
- `scripts/dev-start.sh` auto-detects `HOST_IP` and exports mobile runtime envs:
  - `EXPO_PUBLIC_API_BASE_URL=https://<HOST_IP>/api`
  - `EXPO_PUBLIC_API_HOST_HEADER=kotel.localhost`
- To exit attached Expo, press `Ctrl+C`.
- To stop all dev containers, run `scripts/dev-stop.sh`.

## Mobile Manual Testing

- Canonical mobile runbook and manual checklist: `apps/mobile/README.md`.
- Playwright coverage in this repository is web-focused; native Expo manual testing is currently intentional.
