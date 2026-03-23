# Step 11: Session status, logout, and maintenance cleanup

## Goal
Implement `GET /api/session/status`, `POST /api/session/logout`, and the scheduled maintenance job that marks expired sessions.

## Motivation
Status check lets clients verify session liveness on startup. Logout provides explicit session termination. Maintenance catches sessions that expire without any client interaction.

## Type
feature, backend

## Affected Area
- `apps/backend/src/session/session.controller.ts` — add status and logout endpoints
- `apps/backend/src/session/session.module.ts` — add scheduled cleanup

## Dependencies
Depends on Step 07 (SessionService with revokeSession, revokeAllUserSessions, cleanupExpiredSessions), Step 08 (guard populates request.user and request.session).

## Current Behavior
No status, logout, or maintenance functionality exists.

## Expected Behavior

### `GET /api/session/status`

Protected by access token guard (requires valid accessToken).

Returns the user info and session ID from the authenticated request:
```json
{
  "sessionId": "string",
  "user": { "id": "...", "fullname": "...", "role": "..." }
}
```

<CORRECTION by="step-executor" reason="global prisma omit policy hides login field">
In the current codebase, Prisma client uses global omit config (`apps/prisma/factory.ts`) that excludes `user.login` by default.
`request.user` from `SessionGuard` therefore does not include `login` at runtime. Status response returns safe user fields:
`id`, `fullname`, `role`.
</CORRECTION>

Simple endpoint — reads `request.session.sessionId` and `request.user`, returns them.

If access token expired, the guard returns 401. Client's `axios-auth-refresh` catches this, refreshes, retries.

### `POST /api/session/logout`

Protected by access token guard.

Request body validated with `logoutSchema`: `{ allDevices: boolean }`.

**Single device** (`allDevices: false`):
1. Get current session ID from `request.session.id`.
2. Call `SessionService.revokeSession(id, 'LOGOUT_CURRENT')`.
3. **Clear cookies** (for WEB clientType):
   - Clear `accessToken` cookie with matching path/domain options.
   - Clear `refreshToken` cookie with matching path/domain options.
4. Return `{ ok: true }`.

**All devices** (`allDevices: true`):
1. Get userId from `request.user.id`.
2. Call `SessionService.revokeAllUserSessions(userId, 'LOGOUT_ALL')`.
3. Clear cookies (for WEB).
4. Return `{ ok: true }`.

Cookie clearing: use `response.clearCookie(name, options)` with the same domain/path options as setting (required for browser to match and remove the cookie).

### Maintenance cleanup

Scheduled job in `SessionModule`, same pattern as the old module:

```typescript
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

@Module(...)
export class SessionModule implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.sessionService.cleanupExpiredSessions();
    this.cleanupInterval = setInterval(() => {
      this.sessionService.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }
}
```

Uses `SessionService.cleanupExpiredSessions()` from Step 07.

## Specification

1. Add `GET /session/status` to `SessionController`.
2. Add `POST /session/logout` to `SessionController`.
3. Implement cookie clearing for WEB sessions in logout.
4. Add cleanup interval to `SessionModule`.

## Acceptance Criteria
1. `GET /api/session/status` with valid token → 200 with user info and sessionId.
2. `GET /api/session/status` without token → 401.
3. `POST /api/session/logout { allDevices: false }` → current session revoked, cookies cleared.
4. After single logout: old access token → 401.
5. `POST /api/session/logout { allDevices: true }` → all user sessions revoked.
6. Maintenance job runs on module init and every hour.
7. Expired sessions (past refreshTokenExpiresAt) get status EXPIRED.

## Verification Scenario
1. Login → `GET /api/session/status` → user info.
2. `POST /api/session/logout` → `{ ok: true }`.
3. `GET /api/session/status` with old token → 401.
4. Login from two sessions. Logout with `allDevices: true` from one → both sessions revoked.

## Testing
Integration tests in Step 25.

## Notes
- Cookie clearing MUST use identical path/domain options as cookie setting. Mismatched options → browser won't remove the cookie.
- Status endpoint doesn't extend session lifetime (no idle timeout in new model — explicit expiry only).
- `USED` sessions are NOT cleaned up by maintenance — they're rotation chain history.
