---

## step-imp — 2026-03-23T17:01:57+03:00

**Result**: SUCCESS

### Changed Files
- `apps/backend/src/session/session.controller.ts` — added `GET /session/status` and `POST /session/logout` with Zod body validation and WEB cookie clearing.
- `apps/backend/src/session/session.module.ts` — added maintenance cleanup on module init and hourly interval with proper teardown.
- `apps/backend/src/session/session.controller.integration.spec.ts` — added status/logout integration coverage (single device, all devices, old token invalidation).
- `apps/backend/src/session/session.module.spec.ts` — added module lifecycle tests for cleanup scheduling and interval disposal.
- `.dev/steps/11-session-status-logout-maintenance.md` — added `<CORRECTION>` describing login omission from guarded user payload.
- `.dev/context.md` — added cross-step discovery about Prisma global omit impact on `request.user`.

### Tests
- Task-specific: 38 passed, 0 failed (`session.module.spec.ts`, `session.service.spec.ts`, `session.controller.integration.spec.ts`)
- Regression: 75 passed, 0 failed (full backend suite)

### Acceptance Criteria
- [x] AC-1: `/api/session/status` with valid token returns 200 and session/user payload — verified by: `session.controller.integration.spec.ts` (`returns session status for valid access token`)
- [x] AC-2: `/api/session/status` without token returns 401 — verified by: `session.controller.integration.spec.ts` (`returns 401 for status without token`)
- [x] AC-3: `logout allDevices=false` revokes current session and clears cookies — verified by: `session.controller.integration.spec.ts` (`logout current revokes current session and clears cookies`)
- [x] AC-4: old access token returns 401 after single logout — verified by: `session.controller.integration.spec.ts` (`old access token returns 401 after current logout`)
- [x] AC-5: `logout allDevices=true` revokes all user sessions — verified by: `session.controller.integration.spec.ts` (`logout all devices revokes every active user session`)
- [x] AC-6: maintenance runs on module init and hourly — verified by: `session.module.spec.ts` (`runs cleanup on module init and every hour`)
- [x] AC-7: expired sessions are marked EXPIRED — verified by: `session.service.spec.ts` (`cleanupExpiredSessions marks expired active sessions`)

### Discoveries
- Prisma global omit policy hides `user.login` in authenticated request payloads, so status response intentionally returns `id`, `fullname`, `role`.
