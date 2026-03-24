# Step 09: Create docs/ROAD_MAP.md

## Goal

Create `docs/ROAD_MAP.md` — a full audit of the project's current state covering implemented features, test coverage, architecture, infrastructure, open risks, and security. This is a snapshot document reflecting the state of the repository **after steps 01–08 of this development round have been applied**.

## Motivation

There is no single document that gives a new contributor (or AI agent) a complete picture of where the project stands: what works, what is tested, what is known to be incomplete, and what are the next logical steps. `ROAD_MAP.md` serves as the project's orientation document.

## Type

docs

## Affected Area

- `docs/ROAD_MAP.md` — new file

## Dependencies

- Steps 01–08 (the document should reflect the state after all those steps are applied)

## Current Behavior

No project status or road map document exists. The closest thing is `README.md` (developer instructions) and `docs/AUTH_DESIGN.md` (auth architecture). Neither provides a feature inventory, test coverage summary, or known gaps.

## Expected Behavior

A comprehensive `docs/ROAD_MAP.md` that can be read top-to-bottom as a project orientation document.

## Specification

Write `docs/ROAD_MAP.md` with the following sections. All content must be accurate — the agent must read the actual source code and tests to produce this document. Do not speculate or invent.

---

### Section 1: Что реализовано (What is implemented)

A structured inventory of all implemented features. Organize by area:

**Инфраструктура и окружение:**
- Two-server local dev environment (Traefik + `kotel1.localhost` + `kotel2.localhost`)
- TLS via mkcert (HTTPS required, SameSite=None cookie works)
- Docker Compose dev stack (`infra/compose/dev.yml`) and test stack (`infra/compose/test.yml`)
- Expo LAN dev mode with `HOST_IP` routing for mobile device testing

**Backend:**
- OAuth 2.0 authorization flow: login page (static HTML), auth code store (in-memory Map with TTL), PKCE verification (`code_challenge` S256), code exchange endpoint
- Session management: access token + refresh token (SHA-256 hashed, stored in DB), stateful sessions in PostgreSQL via Prisma
- Refresh token rotation with atomic `UPDATE ... WHERE status = 'ACTIVE' RETURNING` (no race condition)
- Reuse detection with configurable alertness mode (`debug / isolation / quarantine / lockdown`)
- Channel delivery check on every request (cookie for WEB, Bearer for EXPO)
- Origin/fingerprint check on every request (GET: warn; non-GET: reject if mismatch)
- Session cleanup: startup + hourly interval marks expired sessions
- Logout (current session / all sessions)
- Role-based access: `USER / ADMIN / ROOT` roles, `RolesGuard`, admin endpoints (list/create/delete users, revoke sessions)
- First-run setup: `GET /api/setup/status` + `POST /api/setup/init` (one-time, locked after root created)
- Well-known endpoint: `GET /.well-known/client` (recommended client URL)
- Rate limiting on `/api/auth/login`: sliding window per IP (CAPTCHA threshold + block threshold) + per username (block threshold); in-memory counters

**Frontend (web SPA):**
- Multi-server Jotai store keyed by server URL
- OAuth popup flow with PKCE + state, postMessage callback
- Axios per-server client with `axios-auth-refresh` 401-interceptor
- SharedWorker for cross-tab refresh deduplication and single WebSocket slot
- Sidebar with server list, add server form
- Session-test page (check status, force refresh, logout, logout all)
- Setup page (`/setup`) for first-run initialization
- OAuth callback route (`/callback`) — postMessage bridge

**Mobile (Expo):**
- OAuth flow via `expo-web-browser` (system browser) + Deep Link callback (`kotel://auth/callback`)
- PKCE via `expo-crypto`
- Token storage in `expo-secure-store`
- Per-server axios client with `axios-auth-refresh`
- Session-test tab (signin, check status, signout)
- LAN access: HTTP downgrade for IPv4 hosts (dev/LAN workaround)

---

### Section 2: Тестовое покрытие (Test coverage)

List all existing test files and what they cover. Organize by area:

**Backend unit tests (Vitest):**
- `auth.service.spec.ts` — auth service: login, code exchange, PKCE verification
- `auth.controller.spec.ts` — auth controller: login redirect, token exchange endpoint
- `code-store.spec.ts` — in-memory code store: set/get/expire/cleanup
- `rate-limiter.spec.ts` — sliding window rate limiter: IP and username counters
- `alertness.spec.ts` — `getAlertMode()`: env var parsing, defaults, invalid values
- `session.guard.spec.ts` — guard: token extraction, client type check, origin check
- `session.service.spec.ts` — service: findByAccessTokenHash, markAsUsed, createSession, handleReuseDetection, refreshSession, revokeChain, revokeAllUserSessions
- `session.module.spec.ts` — module: cleanup interval on init, interval cleared on destroy
- `setup.service.spec.ts` — setup: status check, init, lockout after first use
- `roles.guard.spec.ts` — roles guard: USER/ADMIN/ROOT role enforcement
- `admin.service.spec.ts` — admin: createUser, listUsers, deleteUser, revokeUserSessions
- `token-cookie.constants.spec.ts` — cookie constants: TTL defaults, cookie options shape
- `token.utils.spec.ts` — generateToken, hashToken: format and length
- `contracts.schemas.spec.ts` — Zod schemas: parse valid/invalid input for all contract schemas

**Backend integration tests (Vitest + Docker test containers):**
- `session.guard.integration.spec.ts` — guard against real DB: valid token, expired, revoked
- `session.controller.integration.spec.ts` — refresh rotation, reuse detection, logout against real DB
- `setup.controller.integration.spec.ts` — setup init and lockout against real DB
- `admin.controller.integration.spec.ts` — admin CRUD against real DB

**Frontend unit tests (Vitest):**
- `api/auth.test.ts` — OAuth flow: PKCE generation, state validation, popup message handling, addServer/removeServer
- `state/servers.test.ts` — Jotai servers store: add/remove sessions, localStorage persistence, active server
- `components/sidebar.test.tsx` — sidebar rendering and add-server form

**Frontend E2E tests (Playwright):**
- `e2e/auth/oauth-flow.spec.ts` — OAuth popup, multi-server, invalid credentials
- `e2e/auth/session-lifecycle.spec.ts` — refresh, single logout, logout all devices
- `e2e/auth/setup-flow.spec.ts` — setup page init, lockout, normal login after setup

**Mobile unit tests (Vitest):**
- `src/api/auth.test.ts` — `addMobileServer`: PKCE, state validation, token exchange, session status
- `src/api/create-server-client.test.ts` — per-server axios client: auth header, refresh rotation, token cleanup on 401
- `src/api/secure-store.test.ts` — SecureStore wrapper: save/get/delete tokens
- `src/api/session.test.ts` — session status and signout API calls
- `src/state/servers.test.ts` — Jotai mobile store: serversAtom, activeServerUrlAtom, activeServerSessionAtom

**Workers (Vitest):**
- `src/workers/shared-refresh-worker.test.ts` — SharedWorker: deduplication, broadcast, timeout, invalid messages

---

### Section 3: Известные ограничения и технический долг (Known limitations and tech debt)

List items from `docs/auth/overview.md` Known Limitations, plus any observed tech debt:

- Mobile HTTP downgrade for LAN (see `docs/auth/overview.md`)
- Mobile OAuth callback screen is a stub (see `docs/auth/overview.md`)
- Rate limiting counters are in-memory — reset on restart, no Redis backing
- CAPTCHA integration is stubbed on the backend (rate limiter flags `captchaRequired` but no actual CAPTCHA challenge is served)
- DPoP (RFC 9449) is not implemented — described in `docs/auth/security.md` as deferred
- `notify_user` / `notify_admin` alertness mode notifications are not implemented — no notification channel exists
- Logout retry queue (web) is in-memory — lost on tab close
- Automated Expo E2E tests are out of scope (manual testing only)

---

### Section 4: Архитектурные риски (Architecture risks)

Items that could cause problems if not addressed:

- **Channel mismatch now triggers alertness mode** (fixed in step 05 of this round) — previously this was a silent 401
- **Single in-process code store** — `CodeStore` is an in-memory Map. Horizontal scaling of backend would cause code exchange failures. Acceptable for self-hosted single-instance, not for multi-replica deploy.
- **Auth code TTL** — codes expire after 60 seconds (check `code-store.ts` for actual value). Short TTL is good for security but may cause UX issues on slow connections.

---

### Section 5: Следующие логические шаги (Next logical steps)

Based on the current state, the next development areas in priority order:

1. **Messenger functionality** — the auth infrastructure is complete. The next layer is the actual messenger: rooms/channels, messages, real-time via WebSocket through SharedWorker.
2. **User invitation flow** — currently only `root`/`admin` can create users via admin API. A user invitation UX (invite link or admin-initiated flow) is the natural next step.
3. **Admin UI** — admin endpoints exist but there is no frontend UI for them. A basic admin panel is needed for user management and session revocation.
4. **CAPTCHA integration** — rate limiter already signals `captchaRequired: true`. A real CAPTCHA challenge (e.g. hCaptcha) needs to be served and verified.
5. **Notification system** — `notify_admin` / `notify_user` alertness mode flags need a channel (email, push, in-app).
6. **Horizontal scaling readiness** — move CodeStore to Redis for multi-replica support when needed.
7. **DPoP (RFC 9449)** — deferred crypto token binding. Implement when base OAuth flow is stable.

---

## Acceptance Criteria

1. `docs/ROAD_MAP.md` exists.
2. All 5 sections are present.
3. Section 2 (test coverage) lists all test files that actually exist in the repository — verify by listing files before writing.
4. Section 3 (known limitations) includes all items from `docs/auth/overview.md` plus rate limiting and DPoP notes.
5. No content is invented — all feature descriptions are verified by reading the source code.

## Verification Scenario

1. Open `docs/ROAD_MAP.md`.
2. Find "Session management" under Section 1 — verify it describes what is actually in `apps/backend/src/session/`.
3. Find "shared-refresh-worker.test.ts" under Section 2 — verify the file exists in `apps/frontend/src/workers/` (created in step 06).
4. Find "следующие логические шаги" — verify the items match the project's natural next steps.

## Testing

Manual only — documentation.

## Notes

- Read all test files in `apps/backend/src/`, `apps/frontend/src/`, `apps/mobile/src/` to produce the accurate test coverage list. Do not write from memory.
- The document is a snapshot — it reflects the state at the time of writing. It will need to be updated as the project evolves.
- Write in Russian (consistent with project documentation language).
- After writing the document, re-read it and verify that no feature is described that does not actually exist in the codebase.
