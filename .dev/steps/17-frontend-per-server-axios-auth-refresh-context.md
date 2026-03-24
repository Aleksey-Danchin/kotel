---

## step-imp — 2026-03-23T17:49:05+03:00

**Result**: SUCCESS

### Changed Files
- `apps/frontend/package.json` — added `axios-auth-refresh` dependency.
- `apps/frontend/package-lock.json` — lockfile updated after dependency install.
- `apps/frontend/src/api/create-server-client.ts` — added per-server axios client factory with auth-refresh interceptor and cache cleanup API.
- `apps/frontend/src/api/auth.ts` — switched post-exchange session status check to per-server axios client and wired `removeServerClient` into `removeServer`.
- `apps/frontend/src/api/create-server-client.test.ts` — added tests for client caching, per-server isolation, cleanup, and refresh interceptor wiring.
- `apps/frontend/src/api/auth.test.ts` — updated auth tests to mock per-server client status request path.

### Tests
- Task-specific: 8 passed, 0 failed
- Regression: 10 passed, 0 failed

### Acceptance Criteria
- [x] AC-1: `getServerClient(url)` returns axios instance with `baseURL` and `withCredentials: true` — verified by: `src/api/create-server-client.test.ts`.
- [x] AC-2: same URL returns same cached instance — verified by: `src/api/create-server-client.test.ts`.
- [x] AC-3: on 401 refresh flow is configured via `axios-auth-refresh` and posts to `/api/session/refresh` — verified by: `src/api/create-server-client.ts` + `src/api/create-server-client.test.ts`.
- [x] AC-4: `removeServerClient` clears cached instance — verified by: `src/api/create-server-client.test.ts`.
- [x] AC-5: multiple servers have independent instances — verified by: `src/api/create-server-client.test.ts`.

### Discoveries
- `docker compose -f infra/compose/dev.yml ps` in this environment can require additional env vars; `docker ps` provides a reliable fallback to verify dev container health.
