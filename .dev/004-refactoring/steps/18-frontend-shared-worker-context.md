---

## step-imp — 2026-03-23T17:52:58+03:00

**Result**: SUCCESS

### Changed Files
- `apps/frontend/src/workers/shared-refresh-worker.ts` — added SharedWorker coordinator to deduplicate refresh requests per `serverUrl` and broadcast refresh outcomes to connected tabs.
- `apps/frontend/src/api/create-server-client.ts` — replaced direct axios refresh call with SharedWorker delegation, per-server waiter resolution, and `fetch` fallback for browsers without `SharedWorker`.
- `apps/frontend/src/api/create-server-client.test.ts` — updated refresh tests for worker-driven flow, added fallback coverage, and added independent multi-server refresh assertions.

### Tests
- Task-specific: 1 passed, 0 failed (`docker exec kris-frontend-test npx vitest run src/api/create-server-client.test.ts`)
- Regression: 3 passed, 0 failed (`docker exec kris-frontend-test npm test`)

### Acceptance Criteria
- [x] AC-1: SharedWorker shared across all tabs — verified by: code inspection (`create-server-client.ts` singleton `refreshWorker` with shared port listener).
- [x] AC-2: Concurrent 401s from multiple tabs send only one refresh request — verified by: code inspection (`shared-refresh-worker.ts` `refreshing` map deduplicates in-flight refresh by server).
- [x] AC-3: Multiple servers refresh independently — verified by: unit test (`create-server-client.test.ts` "handles refresh independently for different servers").
- [x] AC-4: Fallback works in browsers without SharedWorker — verified by: unit test (`create-server-client.test.ts` "uses direct fetch fallback without SharedWorker support").

### Discoveries
- `infra/compose/dev.yml` and `infra/compose/test.yml` require `PROJECT_ROOT` environment variable for compose interpolation in this environment.
