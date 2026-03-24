---

## step-imp — 2026-03-23T18:01:18+03:00

**Result**: SUCCESS

### Changed Files
- `apps/frontend/src/api/logout.ts` — added logout API with in-memory retry queue and online reconnect flush.
- `apps/frontend/src/api/logout.test.ts` — added tests for queueing, retry flush, and all-devices warning.
- `apps/frontend/src/components/sidebar.tsx` — switched disconnect action to use new `logout()` API.
- `apps/frontend/src/routes/~session-test.tsx` — added session test route with add/check/refresh/logout actions and raw store state.
- `apps/frontend/src/routes/~setup.tsx` — added setup route with availability check, init form, and post-init add-server action.
- `apps/frontend/src/global/routeTree.gen.ts` — route tree regenerated with `/session-test` and `/setup` routes.

### Tests
- Task-specific: 10 passed, 0 failed (`src/api/logout.test.ts`, `src/components/sidebar.test.tsx`, `src/api/auth.test.ts`).
- Regression: 18 passed, 0 failed (`npm test` in `kris-frontend-test`).

### Acceptance Criteria
- [x] AC-1: `/session-test` page shows server input, connected servers, action buttons — verified by code inspection of new route component.
- [x] AC-2: all buttons trigger correct API calls — verified by code inspection of handlers calling `addServer`, per-server client status/refresh, and `logout`.
- [x] AC-3: raw state display shows current store contents — verified by code inspection (`JSON.stringify(Array.from(serversMap.entries()))`).
- [x] AC-4: `/setup` checks availability and shows appropriate UI — verified by code inspection of availability states and conditional rendering.
- [x] AC-5: setup form creates root user on fresh server — verified by code inspection of `POST /api/setup/init` flow and success state.
- [x] AC-6: logout failure queues retry — verified by `src/api/logout.test.ts`.
- [x] AC-7: network reconnect retries queued logout — verified by `src/api/logout.test.ts` and `flushLogoutQueue()` implementation.
- [x] AC-8: all-devices logout failure shows warning — verified by `src/api/logout.test.ts`.

### Discoveries
- `docker compose -f infra/compose/test.yml` in this workspace requires explicit `PROJECT_ROOT` environment variable for command execution.
