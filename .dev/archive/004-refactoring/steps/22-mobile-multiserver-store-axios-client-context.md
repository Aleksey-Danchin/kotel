---

## step-imp — 2026-03-23T18:12:00Z

**Result**: SUCCESS

### Changed Files
- `apps/mobile/src/state/servers.ts` — added Jotai multi-server session atoms and active server selectors.
- `apps/mobile/src/api/create-server-client.ts` — added per-server axios factory with Bearer request auth and token refresh interceptor via `axios-auth-refresh`.
- `apps/mobile/src/api/users.ts` — migrated to per-server client API (`getUsers(serverUrl)`).
- `apps/mobile/src/query-options/users.ts` — made query options server-aware with scoped query key.
- `apps/mobile/app/(tabs)/users.tsx` — wired active server URL from Jotai and guarded loading when no active server selected.
- `apps/mobile/src/providers/mobile-runtime-provider.tsx` — removed dependency on deleted single-server config.
- `apps/mobile/src/api/create-server-client.test.ts` — added regression tests for client caching, access token header injection, and refresh token flow.
- `apps/mobile/package.json` — added `axios-auth-refresh` and `expo-crypto` dependencies.
- `apps/mobile/package-lock.json` — lockfile updated after dependency installation.
- `apps/mobile/src/api/http-client.ts` — deleted legacy single-server HTTP client.
- `apps/mobile/src/config/api-config.ts` — deleted legacy single-server API config.
- `.dev/context.md` — recorded mobile-specific test/compile execution discovery for future steps.

### Tests
- Task-specific: 3 passed, 0 failed (`docker exec kotel-mobile-1 sh -lc 'cd /apps/mobile && npm test -- src/api/create-server-client.test.ts'`).
- Compile check: passed (`docker exec kotel-mobile-1 sh -lc 'cd /apps/mobile && npx tsc --noEmit'`).
- Regression: 8 passed, 0 failed (`docker exec kotel-mobile-1 sh -lc 'cd /apps/mobile && npm test'`).

### Acceptance Criteria
- [x] AC-1: Per-server axios instances with Bearer auth — verified by: `src/api/create-server-client.test.ts` (instance cache and interceptor setup).
- [x] AC-2: Access token attached to every request — verified by: `src/api/create-server-client.test.ts` (`Authorization: Bearer ...` request interceptor assertion).
- [x] AC-3: On 401 refresh uses Bearer refresh token and saves new tokens — verified by: `src/api/create-server-client.test.ts` (refresh call headers and `saveTokens` assertions).
- [x] AC-4: Old http-client and api-config files deleted — verified by: code inspection (files removed and imports migrated).
- [x] AC-5: Mobile project compiles — verified by: `npx tsc --noEmit` in `kotel-mobile-1`.

### Discoveries
- Mobile validation for this repo should run in `kotel-mobile-1` under `/apps/mobile`; `kris-frontend-test` is bound to the web frontend and does not execute mobile tests.
