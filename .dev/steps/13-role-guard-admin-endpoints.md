# Step 13: Role guard and admin endpoints

## Goal
Implement the role-based access system (`@Roles()` decorator + `RolesGuard`) and admin endpoints for user management and session revocation.

## Motivation
Closed registration means only administrators create users. The role guard prevents unauthorized access to admin functionality. Three roles (USER, ADMIN, ROOT) with hierarchical permissions.

## Type
feature, backend

## Affected Area
- `apps/backend/src/admin/` — new module (generate via `npx nest generate resource admin --no-spec`)
- `apps/backend/src/admin/admin.module.ts`
- `apps/backend/src/admin/admin.controller.ts`
- `apps/backend/src/admin/admin.service.ts`
- `apps/backend/src/admin/roles.guard.ts`
- `apps/backend/src/admin/roles.decorator.ts`
- `apps/backend/src/app.module.ts` — register AdminModule

## Dependencies
Depends on Step 08 (access token guard populates request.user with role) and Step 07 (SessionService for revoking sessions).

## Current Behavior
No role system. No admin endpoints.

## Expected Behavior

### `@Roles()` decorator (`roles.decorator.ts`)

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### `RolesGuard` (`roles.guard.ts`)

Runs after the access token guard. Reads required roles from `@Roles()` metadata, checks `request.user.role`.

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, ...);
    if (!requiredRoles) return true;
    const user = context.switchToHttp().getRequest().user;
    return requiredRoles.includes(user.role);
  }
}
```

### Admin endpoints

All decorated with `@Roles('ADMIN', 'ROOT')` and `@UseGuards(RolesGuard)`.

**`POST /api/admin/users`** — Create user

Body validated with `createUserSchema`. Logic:
- ADMIN can create role=USER only.
- ROOT can create role=USER or ADMIN.
- Nobody creates ROOT (setup only).
- Hash password with bcrypt, create user.
- Return user without passwordHash.

**`GET /api/admin/users`** — List all users

Returns all users with roles (without passwordHash).

**`DELETE /api/admin/users/:id`** — Delete user

Restrictions:
- Cannot delete ROOT → 403.
- Cannot delete self → 403.
- ADMIN can delete USER only.
- ROOT can delete USER or ADMIN.
- Sessions cascade-deleted by Prisma.

**`POST /api/admin/sessions/revoke`** — Revoke sessions

Body validated with `revokeSessionsSchema`. Logic:
- ADMIN can revoke sessions of USER-role users.
- ROOT can revoke sessions of any user except ROOT.
- Calls `SessionService.revokeAllUserSessions(userId, 'MANUAL_REVOKE')`.
- Stores `reason` in `noActiveDescribe` if provided.
- Returns `{ revokedCount }`.

## Specification

1. Generate: `npx nest generate resource admin --no-spec`.
2. Create `@Roles()` decorator and `RolesGuard`.
3. Implement 4 endpoints with role-based permission checks.
4. Use Zod schemas from `@contracts/admin` for validation.
5. Register `AdminModule` in `AppModule`.
6. Import `SessionModule` (global) for revocation.

## Acceptance Criteria
1. ROOT can create ADMIN and USER accounts.
2. ADMIN can create USER accounts only.
3. Attempt to create ADMIN as ADMIN → 403.
4. ROOT user cannot be deleted.
5. Self-deletion → 403.
6. Session revocation returns count of revoked sessions.
7. Regular USER accessing admin endpoints → 403.
8. User list returns all users with roles.

## Verification Scenario
1. Login as `user1` (ROOT). Create a new user with role ADMIN.
2. Login as `user2` (ADMIN). Create a new user with role USER → success.
3. Login as `user2` (ADMIN). Try creating ADMIN → 403.
4. Login as `user2`. Try deleting `user1` (ROOT) → 403.
5. Login as `user5` (USER). Access `/api/admin/users` → 403.

## Testing
Integration tests in Step 26.

## Notes
- `RolesGuard` is NOT registered as APP_GUARD — it's applied per-controller/per-method with `@UseGuards(RolesGuard)`. The access token guard (APP_GUARD) runs first and populates the user.
- The `noActiveDescribe` field is only set for `MANUAL_REVOKE` — it stores the admin's reason text.
