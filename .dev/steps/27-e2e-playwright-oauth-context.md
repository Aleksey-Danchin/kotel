---

## step-imp — 2026-03-23T16:08:00Z

**Result**: BLOCKED infra

### Changed Files
- `.dev/steps/27-e2e-playwright-oauth.md` — added `<CORRECTION>` with executable Playwright verification command for local frontend config.
- `apps/frontend/e2e/auth/oauth-flow.spec.ts` — created OAuth popup and multi-server E2E scenario with setup bootstrap checks.
- `apps/frontend/e2e/auth/session-lifecycle.spec.ts` — created session lifecycle E2E with refresh, logout, and logout-all-devices checks.
- `apps/frontend/e2e/auth/setup-flow.spec.ts` — created setup-page E2E with lockout verification and OAuth login path.
- `infra/compose/dev.yml` — switched `backend2` cookie-domain env var to `SESSION_COOKIE_DOMAIN_2` to avoid inheriting primary server domain.
- `apps/backend/src/setup/setup.controller.ts` — fixed return type (`UserRole`) so `backend2` dev container can compile cleanly after restart.

### Approaches Tried
- Approach 1: Implemented all three Playwright specs and ran `npx playwright test --config e2e/playwright.config.ts e2e/auth/` → `katel.localhost` scenarios failed with `Token exchange failed for https://katel.localhost`.
- Approach 2: Recreated `backend2` with corrected cookie-domain env, reran tests, and validated container health → same token-exchange failure on `katel.localhost`.
- Approach 3: Fixed `backend2` TypeScript compile error (`setup.controller.ts`) triggered after recreate and reran failing test in isolation (`setup-flow.spec.ts --workers=1`) → popup login still ends with token-exchange failure on `katel.localhost`.

### Test Results
- `apps/frontend/e2e/auth/oauth-flow.spec.ts` — failed (`Token exchange failed for https://katel.localhost`).
- `apps/frontend/e2e/auth/setup-flow.spec.ts` — failed (`Token exchange failed for https://katel.localhost`).
- `apps/frontend/e2e/auth/session-lifecycle.spec.ts` — passed (kotel-only flow).

### Blocking Problem
`katel.localhost` OAuth popup login completes, but token exchange (`POST /api/auth/token`) does not establish a usable session for frontend flow; UI consistently reports `Token exchange failed for https://katel.localhost`, preventing multi-server and setup acceptance criteria from passing.

### Hypothesis
There is a remaining infrastructure/runtime mismatch in the second-server dev path (`katel.localhost`) specifically around OAuth code-to-token exchange (secondary backend or routing/state propagation), not just cookie-domain configuration. Resolver-level environment diagnosis (Traefik/backend2/auth exchange path with request/response traces) is required.

---

## Invocation 1 — 2026-03-23T16:14:00Z

**Result**: UNRESOLVED | **Classification**: application_logic
**Actions**: none (outside resolver scope)
**Changed**: _(none)_
**Health**: all 8 dev containers healthy (6 core + backend2 + postgres2)

### Root Cause (for step-imp)

Race condition in the frontend OAuth callback flow. React strict mode (dev) double-invokes `useEffect` in `apps/frontend/src/routes/~callback.tsx`, sending two identical `postMessage({ code, state })` to the opener. Both messages trigger `handleMessageEvent` in `apps/frontend/src/api/auth.ts`, which starts two concurrent `POST /api/auth/token` requests with the same one-time code. The backend `CodeStore.consume()` is single-use: one request succeeds (201), the other finds the code consumed (400). For cross-origin `katel.localhost`, the 400 arrives first → Promise rejects with "Token exchange failed". Same-origin `kotel.localhost` works by luck of response ordering.

Evidence (Playwright network interception):
```
>>> REQUEST: POST https://katel.localhost/api/auth/token
>>> REQUEST: POST https://katel.localhost/api/auth/token
<<< RESPONSE: 400 https://katel.localhost/api/auth/token  (code already consumed)
<<< RESPONSE: 201 https://katel.localhost/api/auth/token  (success, but too late)
```

Infra verified healthy: backend2 token endpoint works (curl full OAuth flow returns 201), CORS preflight passes, TLS accepted by Playwright (`ignoreHTTPSErrors: true`), postgres2 schema migrated.

### Fix Options (all require application code changes)

1. Guard `~callback.tsx` useEffect with a `useRef` flag to prevent double `postMessage`.
2. Guard `handleMessageEvent` in `auth.ts`: delete the pending flow entry from `pendingFlows` map **before** the async `exchangeCode` call (prevents the second message from finding a flow to process).
3. Both (belt-and-suspenders).

---

## step-imp — 2026-03-23T19:20:39+03:00

**Result**: SUCCESS

### Changed Files
- `apps/frontend/src/routes/~callback.tsx` — guarded callback `useEffect` with a `useRef` flag to prevent duplicate `postMessage` in dev Strict Mode.
- `apps/frontend/src/api/auth.ts` — consume `pendingFlows` entry before async token exchange to prevent duplicate processing of the same OAuth state.
- `infra/compose/dev.yml` — set `backend2` cookie-domain env to `SESSION_COOKIE_DOMAIN_2` with fallback `katel.localhost` for host-scoped cookies in two-server dev.
- `apps/frontend/e2e/auth/oauth-flow.spec.ts` — stabilized sidebar server-switch selectors to avoid strict locator ambiguity.
- `.dev/context.md` — documented Strict Mode callback race and backend2 cookie-domain requirement.

### Tests
- Task-specific: 3 passed, 0 failed (`npx playwright test --config e2e/playwright.config.ts e2e/auth/`)
- Regression: 5 passed, 0 failed (`docker exec kris-frontend-test npm test`)

### Acceptance Criteria
- [x] AC-1: All E2E tests pass — verified by: Playwright auth suite.
- [x] AC-2: OAuth popup flow works end-to-end — verified by: `oauth-flow.spec.ts`.
- [x] AC-3: Multi-server scenario tested — verified by: `oauth-flow.spec.ts` (kotel + katel).
- [x] AC-4: Refresh/rotation verified indirectly — verified by: `session-lifecycle.spec.ts` (force refresh + status continuity).
- [x] AC-5: Logout verified — verified by: `session-lifecycle.spec.ts` (logout + logout all devices).
- [x] AC-6: Setup flow verified — verified by: `setup-flow.spec.ts` (status/init lockout + OAuth login).
- [x] AC-7: Playwright used (not Vitest browser) — verified by: Playwright command and `*.spec.ts` files under `apps/frontend/e2e/auth`.

### Discoveries
- React Strict Mode duplicate effects can race one-time OAuth code exchange unless callback/send path is idempotent.
