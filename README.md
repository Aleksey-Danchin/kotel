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
- Test stack deterministic env inputs:
  - `TEST_SESSION_COOKIE_DOMAIN` (mapped to backend `SESSION_COOKIE_DOMAIN` in `infra/compose/test.yml`).

## Dev Start Behavior

- `scripts/dev-start.sh` starts core services in background, then attaches the terminal to the mobile Expo CLI.
- Expo runs in LAN mode (`expo start --lan`) so QR code and hotkeys remain visible in the same terminal.
- `HOST_IP` is required for mobile LAN mode and should be set in `.env` (or passed in shell env before run).
- `scripts/dev-start.sh` uses `HOST_IP` and exports mobile runtime envs:
  - `EXPO_PUBLIC_API_BASE_URL=https://<HOST_IP>:3001/api`
  - `EXPO_PUBLIC_API_HOST_HEADER=kotel1.localhost`
- API routing over LAN IP:
  - `https://<HOST_IP>:3001/api/*` -> `backend` (`kotel1.localhost` equivalent)
  - `https://<HOST_IP>:3002/api/*` and `https://<HOST_IP>:3002/.well-known/*` -> `backend-2` (`kotel2.localhost` equivalent)
- Quick override for one run:
  - `HOST_IP=192.168.1.42 scripts/dev-start.sh`
- LAN QR checklist for real device:
  - phone and host are on the same Wi-Fi (no guest/client isolation);
  - host incoming ports are reachable: `8081`, `19000`, `19001`, `19002`, `3001`, `3002`.
- To exit attached Expo, press `Ctrl+C`.
- To stop all dev containers, run `scripts/dev-stop.sh`.

## Two Backend Dev Servers

- The dev stack includes two backend servers behind Traefik:
  - `https://kotel1.localhost/api/*` -> `backend` with `postgres`
  - `https://kotel2.localhost/api/*` and `https://kotel2.localhost/.well-known/*` -> `backend-2` with `postgres-2`
- The frontend is still served only from `https://kotel1.localhost`.
- `backend-2` uses `RECOMMENDED_CLIENT_URL` from `RECOMMENDED_CLIENT_URL_2` (defaults to `https://kotel1.localhost`).
- On first start for the second server DB, run migrations and seed manually:
  - `docker compose -f infra/compose/dev.yml exec backend-2 npx prisma migrate deploy`
  - `docker compose -f infra/compose/dev.yml exec backend-2 npx prisma db seed`

## Mobile Manual Testing

- Canonical mobile runbook and manual checklist: `apps/mobile/README.md`.
- Playwright coverage in this repository is web-focused; native Expo manual testing is currently intentional.
