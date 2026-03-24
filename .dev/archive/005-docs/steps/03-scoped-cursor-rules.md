# Step 03: Create scoped Cursor rules for each codebase area

## Goal

Create four scoped `.cursor/rules/*.mdc` files — for backend, frontend, mobile, and infra — each containing concise AI-agent constraints and pointers to the relevant documentation files.

## Motivation

Currently the only Cursor rule is `testing.mdc` with `alwaysApply: true`. There are no rules scoped to specific areas of the codebase. When an AI agent works on backend code, it has no context about NestJS/Prisma/Zod conventions; when working on mobile code, it has no context about Expo/SecureStore patterns. Scoped rules are loaded only when the agent edits files in the matching path — keeping context tight and relevant.

## Type

infra (developer tooling / AI guidance)

## Affected Area

- `.cursor/rules/backend.mdc` — new file
- `.cursor/rules/frontend.mdc` — new file
- `.cursor/rules/mobile.mdc` — new file
- `.cursor/rules/infra.mdc` — new file
- `.cursor/rules/testing.mdc` — no change (remains `alwaysApply: true`)

## Dependencies

- Step 01 (split auth docs) — rules reference `docs/auth/*.md` files that must exist
- Step 02 (STACK.md) — rules reference `docs/STACK.md` that must exist

## Current Behavior

`.cursor/rules/` contains only `testing.mdc`:
```
---
description: Testing stack and DTO validation policy for all contributors and agents.
alwaysApply: true
---
```
It applies to all tasks regardless of which files are being edited.

## Expected Behavior

Four new rule files, each scoped with `globs`, each brief and actionable.

## Specification

### Rule format

Each `.mdc` file starts with YAML frontmatter:
```yaml
---
description: <one sentence>
globs: ["<glob-pattern>"]
alwaysApply: false
---
```

Then a markdown body: a short heading, bullet-point constraints, and a "Documentation" section pointing to relevant docs files.

---

### `.cursor/rules/backend.mdc`

```yaml
---
description: Backend (NestJS + Prisma + Zod) conventions for apps/backend.
globs: ["apps/backend/**"]
alwaysApply: false
---
```

Body:

```markdown
# Backend Conventions

## Stack
- NestJS framework. Modules, controllers, services — standard NestJS pattern.
- Prisma ORM. Client imported via `~prisma/client/client` alias. Never import from `@prisma/client` directly.
- Zod for all request/response validation. No `class-validator` or `class-transformer`.
- Shared contracts in `apps/backend/src/contracts/` — exported for frontend use via `@contracts/*` alias.

## Key Constraints
- Every new public endpoint must have a corresponding Zod schema in `src/contracts/` if the shape is shared with frontend or mobile.
- Auth-protected routes rely on `SessionGuard` (applied globally via `APP_GUARD`). Mark public routes with `@Public()` decorator from `session/public.decorator.ts`.
- Token operations: use `generateToken()` and `hashToken()` from `src/shared/token.utils.ts`.
- Cookie options: use `getAccessTokenCookieOptions()` / `getRefreshTokenCookieOptions()` from `src/shared/cookie.constants.ts`.
- Configuration: env variables only (`process.env.*`). No `@nestjs/config`, no YAML files.
- Atomic DB operations for session rotation: use `prisma.$queryRaw` with `UPDATE ... WHERE status = 'ACTIVE' RETURNING` to avoid race conditions.

## Documentation
- Auth architecture: `docs/auth/oauth-flow.md`, `docs/auth/tokens.md`, `docs/auth/sessions.md`, `docs/auth/security.md`
- Implementation decisions: `docs/auth/implementation-decisions.md`
- Stack overview: `docs/STACK.md`
```

---

### `.cursor/rules/frontend.mdc`

```yaml
---
description: Frontend (React + TanStack Router + Jotai) conventions for apps/frontend.
globs: ["apps/frontend/**"]
alwaysApply: false
---
```

Body:

```markdown
# Frontend Conventions

## Stack
- React SPA, bundled with Vite.
- TanStack Router for routing. Route files live in `src/routes/`.
- Jotai for global state. Server sessions stored in `serversAtom` (Map keyed by serverUrl) in `src/state/servers.ts`.
- axios + axios-auth-refresh for HTTP. Per-server axios instances via `getServerClient(serverUrl)` in `src/api/`.
- SharedWorker (`src/workers/shared-refresh-worker.ts`) coordinates token refresh across browser tabs and holds a single WebSocket connection.

## Key Constraints
- Import shared backend contract schemas via `@contracts/*` alias — never via relative paths crossing app boundaries.
- Use `createServerClient` pattern for per-server HTTP calls; do not create bare axios instances in components.
- Token refresh is reactive (401-interceptor via axios-auth-refresh) — no proactive refresh timers.
- SharedWorker deduplicates refresh calls across tabs: if a refresh is already in-flight for a given serverUrl, the worker awaits it and responds to the waiting port rather than starting a second request.
- For E2E tests: use Playwright. Test files live in `apps/frontend/e2e/`.

## Documentation
- Auth client architecture: `docs/auth/clients.md`
- Token storage and cookie policy: `docs/auth/tokens.md`
- Session refresh and SharedWorker: `docs/auth/sessions.md`
- Stack overview: `docs/STACK.md`
```

---

### `.cursor/rules/mobile.mdc`

```yaml
---
description: Mobile (Expo Router + SecureStore) conventions for apps/mobile.
globs: ["apps/mobile/**"]
alwaysApply: false
---
```

Body:

```markdown
# Mobile Conventions

## Stack
- Expo with Expo Router (file-based routing). App screens in `app/`.
- axios + axios-auth-refresh for HTTP. Per-server clients in `src/api/create-server-client.ts`.
- expo-secure-store for token persistence (Keychain on iOS, Keystore on Android).
- expo-web-browser + expo-linking for OAuth login (system browser, not WebView).
- expo-crypto for PKCE generation (SHA-256 digest, getRandomBytes).

## Key Constraints
- OAuth flow uses `WebBrowser.openAuthSessionAsync` — it blocks until the browser closes and returns the callback URL directly. The `app/auth/callback.tsx` screen is a redirect-only stub; it does not process OAuth parameters.
- Deep link scheme: `kotel://auth/callback` (registered in app.json as scheme `kotel`).
- Tokens are stored in SecureStore keyed by `accessToken:<serverUrl>` and `refreshToken:<serverUrl>`.
- Token delivery to API: `Authorization: Bearer <accessToken>` header — never cookies.
- `toMobileNetworkUrl(serverUrl)` in `src/api/auth.ts` and `src/api/create-server-client.ts` downgrades `https://` to `http://` for IPv4 hosts. This is a dev/LAN-only workaround (no DNS for local domains on device). In production, serverUrl is always a hostname — no downgrade occurs.
- Automated Expo E2E tests are out of scope; mobile testing is manual per `apps/mobile/README.md`.

## Documentation
- Mobile OAuth flow: `docs/auth/oauth-flow.md` (section "Авторизация на мобильном — Deep Links")
- Token storage: `docs/auth/tokens.md` (section "Expo")
- Known limitation (HTTP downgrade): `docs/auth/overview.md` (section "Известные ограничения")
- Manual test runbook: `apps/mobile/README.md`
- Stack overview: `docs/STACK.md`
```

---

### `.cursor/rules/infra.mdc`

```yaml
---
description: Infrastructure (Traefik + Docker Compose) conventions for infra/.
globs: ["infra/**"]
alwaysApply: false
---
```

Body:

```markdown
# Infrastructure Conventions

## Stack
- Traefik v3 as reverse proxy. Config: `infra/traefik/traefik.yml` (static), `infra/traefik/dynamic/tls.yml` (dynamic, TLS certs).
- Docker Compose: `infra/compose/dev.yml` (development), `infra/compose/test.yml` (backend integration tests).
- TLS (dev): mkcert self-signed certificates for `*.localhost`. HTTPS is required — HTTP is not supported.

## Key Constraints
- All new backend services in dev must be added to `infra/compose/dev.yml` with a Traefik label for hostname routing.
- TLS certificate paths referenced in `infra/traefik/dynamic/tls.yml` — update when adding new hostnames.
- Test compose (`test.yml`) must mirror the relevant env vars from `dev.yml` for the service under test, using `TEST_*` prefixed variables from `.env`.
- Session env vars: backend requires `SESSION_COOKIE_DOMAIN`. Test env uses `TEST_SESSION_COOKIE_DOMAIN` mapped to `SESSION_COOKIE_DOMAIN`.
- `PROJECT_ROOT` variable in `.env` is used in compose volume mounts — keep it pointing to the repo root.

## Documentation
- Stack overview and compose topology: `docs/STACK.md`
```

---

## Acceptance Criteria

1. Four new files created: `.cursor/rules/backend.mdc`, `.cursor/rules/frontend.mdc`, `.cursor/rules/mobile.mdc`, `.cursor/rules/infra.mdc`.
2. Each file has correct YAML frontmatter with `globs`, `alwaysApply: false`, and a `description`.
3. Each file has a "Documentation" section linking to the relevant `docs/` files that exist (created in steps 01 and 02).
4. Existing `testing.mdc` is not modified.
5. All constraints mentioned are accurate relative to the current codebase.

## Verification Scenario

1. Open `.cursor/rules/backend.mdc` — verify globs match `apps/backend/**`.
2. Confirm docs links point to files that exist (`docs/auth/tokens.md` etc.).
3. Open `.cursor/rules/mobile.mdc` — verify the HTTP downgrade limitation is mentioned.
4. Open `.cursor/rules/infra.mdc` — verify `SESSION_COOKIE_DOMAIN` / `TEST_SESSION_COOKIE_DOMAIN` mapping is documented.

## Testing

Manual only — rule file correctness is verified by inspection.

## Notes

- Keep each rule file under ~50 lines. The goal is focused, scannable guidance — not encyclopedic documentation.
- The "Documentation" section in each rule is the bridge to the narrative docs. An AI agent reading the rule should know exactly which file to open for deeper context.
