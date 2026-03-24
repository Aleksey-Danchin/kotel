---

## step-imp — 2026-03-23T17:22:34+03:00

**Result**: SUCCESS

### Changed Files
- `apps/backend/src/admin/roles.decorator.ts` — added `@Roles()` metadata decorator for role-based access.
- `apps/backend/src/admin/roles.guard.ts` — added guard that checks required roles against `request.user.role`.
- `apps/backend/src/admin/admin.service.ts` — implemented admin use cases: create/list/delete users and session revocation with role restrictions.
- `apps/backend/src/admin/admin.controller.ts` — added `/api/admin/*` endpoints guarded by `SessionGuard` + `RolesGuard`.
- `apps/backend/src/admin/admin.module.ts` — wired controller/service/guard and module dependencies.
- `apps/backend/src/admin/admin.controller.integration.spec.ts` — added integration coverage for role matrix and admin endpoints behavior.
- `apps/backend/src/app.module.ts` — registered `AdminModule`.
- `docs/AUTH_DESIGN.md` — documented admin API endpoints in the API routes section.

### Tests
- Task-specific: 6 passed, 0 failed (`src/admin/admin.controller.integration.spec.ts`).
- Regression: 87 passed, 0 failed (`docker exec kris-backend-test npm test`).

### Acceptance Criteria
- [x] AC-1: ROOT can create ADMIN and USER accounts — verified by: `src/admin/admin.controller.integration.spec.ts` (`allows ROOT to create ADMIN and USER accounts`).
- [x] AC-2: ADMIN can create USER accounts only — verified by: `src/admin/admin.controller.integration.spec.ts` (`allows ADMIN to create USER only...`).
- [x] AC-3: Attempt to create ADMIN as ADMIN returns 403 — verified by: `src/admin/admin.controller.integration.spec.ts` (`allows ADMIN to create USER only...`).
- [x] AC-4: ROOT user cannot be deleted — verified by: `src/admin/admin.controller.integration.spec.ts` (`forbids deleting ROOT and self`).
- [x] AC-5: Self-deletion returns 403 — verified by: `src/admin/admin.controller.integration.spec.ts` (`forbids deleting ROOT and self`).
- [x] AC-6: Session revocation returns revoked count — verified by: `src/admin/admin.controller.integration.spec.ts` (`revokes user sessions and returns revokedCount`).
- [x] AC-7: Regular USER gets 403 on admin endpoints — verified by: `src/admin/admin.controller.integration.spec.ts` (`forbids regular USER from accessing admin endpoints`).
- [x] AC-8: User list returns users with roles — verified by: `src/admin/admin.controller.integration.spec.ts` (`lists users with roles`).

### Discoveries
- Dev smoke check for new backend routes can be executed reliably via `docker exec kotel-backend-1 ...` when host-based domain routing differs from test Traefik hostnames.
