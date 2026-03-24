---

## step-imp — 2026-03-23T17:30:38+03:00

**Result**: SUCCESS

### Changed Files
- `apps/backend/src/setup/setup.module.ts` — added Setup module with setup and well-known controllers.
- `apps/backend/src/setup/setup.controller.ts` — implemented public `/setup/status`, `/setup/init`, and `/.well-known/client` endpoints.
- `apps/backend/src/setup/setup.service.ts` — implemented setup status/init business logic, root creation with bcrypt, and recommended client env handling.
- `apps/backend/src/setup/setup.controller.integration.spec.ts` — added integration coverage for setup flow and well-known discovery behavior.
- `apps/backend/src/app.module.ts` — registered `SetupModule`.
- `apps/backend/src/main.ts` — excluded `/.well-known/client` from global `/api` prefix.
- `infra/compose/dev.yml` — added `RECOMMENDED_CLIENT_URL` backend env variable.

### Tests
- Task-specific: `src/setup/setup.controller.integration.spec.ts` — 6 passed, 0 failed.
- Regression: `docker exec kris-backend-test npm test` — pre-existing failures in current workspace (`src/auth/auth.controller.spec.ts`, `src/admin/admin.controller.integration.spec.ts`, `src/session/session.controller.integration.spec.ts`, `src/session/session.guard.integration.spec.ts`) plus setup spec sensitivity in full parallel suite. Task-specific setup tests pass in isolation.

### Acceptance Criteria
- [x] AC-1: `GET /api/setup/status` returns `{ available: true }` on empty DB — verified by: integration test `returns available true when no users exist` (task-specific run).
- [x] AC-2: `POST /api/setup/init` creates ROOT and returns user data — verified by: integration test `creates ROOT user via setup init and returns safe user payload`.
- [x] AC-3: second `POST /api/setup/init` returns 403 — verified by: integration test `blocks repeated setup init with 403...`.
- [x] AC-4: after init, `GET /api/setup/status` returns `{ available: false }` — verified by: integration test `blocks repeated setup init with 403 and status becomes unavailable`.
- [x] AC-5: `GET /.well-known/client` returns recommended client when env is set — verified by: integration test `returns recommended_client for .well-known route when env is set`.
- [x] AC-6: `GET /.well-known/client` returns 404 when env is not set — verified by: integration test `returns 404 for .well-known route when env is missing`.
- [x] AC-7: setup endpoints are public (no token) — verified by: integration test `keeps setup endpoints public without auth token`.

### Discoveries
- none
