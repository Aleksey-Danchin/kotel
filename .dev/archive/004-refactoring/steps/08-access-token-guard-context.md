---

## step-imp — 2026-03-23T13:43:40Z

**Result**: SUCCESS

### Changed Files
- `apps/backend/src/session/public.decorator.ts` — added `@Public()` metadata decorator and public flag constant.
- `apps/backend/src/session/session-request.ts` — added typed authenticated request and session payload types.
- `apps/backend/src/session/session.guard.ts` — implemented global access-token guard with token extraction, session lookup, expiration handling, channel checks, origin checks, and request enrichment.
- `apps/backend/src/session/session.module.ts` — registered `SessionGuard` as `APP_GUARD`.
- `apps/backend/src/session/session.service.ts` — added `markExpired()` helper for expired token handling.
- `apps/backend/src/session/session.service.spec.ts` — added coverage for `markExpired()`.
- `apps/backend/src/session/session.guard.spec.ts` — added guard unit tests for auth logic, mismatch handling, request enrichment, and origin policy.
- `apps/backend/src/session/session.guard.integration.spec.ts` — added integration tests for protected/public endpoints and WEB/EXPO token channels.
- `apps/backend/src/auth/auth.controller.ts` — marked auth endpoints as `@Public()`.
- `apps/backend/src/app.controller.ts` — marked `/api` health endpoint as `@Public()` to keep dev container health checks passing.
- `.dev/context.md` — appended Step 08 discovery about healthcheck behavior with global guards.

### Tests
- Task-specific: 22 passed, 0 failed
- Regression: 43 passed, 0 failed

### Acceptance Criteria
- [x] AC-1: `GET /api/users` without token -> 401 — verified by: `src/session/session.guard.integration.spec.ts`
- [x] AC-2: WEB session with valid cookie token -> 200 — verified by: `src/session/session.guard.integration.spec.ts`
- [x] AC-3: EXPO session with valid bearer token -> 200 — verified by: `src/session/session.guard.integration.spec.ts`
- [x] AC-4: expired access token -> 401 and session marked EXPIRED — verified by: `src/session/session.guard.spec.ts`
- [x] AC-5: WEB session with bearer delivery -> 401 — verified by: `src/session/session.guard.spec.ts`
- [x] AC-6: EXPO session with cookie delivery -> 401 — verified by: `src/session/session.guard.spec.ts`
- [x] AC-7: `@Public()` endpoints are accessible without token — verified by: `src/session/session.guard.integration.spec.ts` and `src/auth/auth.controller.spec.ts`
- [x] AC-8: `request.user` and `request.session` are populated — verified by: `src/session/session.guard.spec.ts`
- [x] AC-9: origin mismatch on POST -> 403 — verified by: `src/session/session.guard.spec.ts`

### Discoveries
- Dev backend healthcheck calls `GET /api` and fails if guarded; this route must stay public when global auth is enabled.
