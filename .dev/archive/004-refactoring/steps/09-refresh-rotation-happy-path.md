# Step 09: Refresh endpoint — token rotation happy path

## Goal
Implement `POST /api/session/refresh` with the happy path: an active refresh token is rotated to produce a new token pair, with atomic SQL to prevent race conditions.

## Motivation
Refresh token rotation is the core mechanism that keeps sessions alive transparently. The access token expires every 15 minutes; the client refreshes it without user interaction. Each rotation invalidates the old refresh token and issues a new pair.

## Type
feature, backend

## Affected Area
- `apps/backend/src/session/session.controller.ts` — add refresh endpoint
- `apps/backend/src/session/session.service.ts` — add `refreshSession` method
<CORRECTION by="step-executor" reason="controller file missing in current codebase">
`apps/backend/src/session/session.controller.ts` does not exist yet in this branch.  
Resolution: create this controller file and register it in `session.module.ts` to expose `POST /api/session/refresh`.
</CORRECTION>

## Dependencies
Depends on Step 07 (SessionService with markAsUsed, createSession) and Step 08 (guard with @Public).

## Current Behavior
No refresh endpoint exists.

## Expected Behavior

### `POST /api/session/refresh`

Decorated with `@Public()` — called when the access token has expired.

**Token extraction** (dual-channel):
- WEB: refresh token from cookie `refreshToken` (path-scoped to `/api/session/refresh`).
- EXPO: refresh token from `Authorization: Bearer <token>` header.

**Happy path algorithm:**

1. Extract refresh token. Missing → 401.
2. Hash with SHA-256.
3. Call `SessionService.markAsUsed(hash)` — atomic SQL:
   ```sql
   UPDATE "Session"
   SET status = 'USED', "refreshUsedAt" = NOW(), "noActiveAt" = NOW()
   WHERE "refreshTokenHash" = $1 AND status = 'ACTIVE'
   RETURNING id, "sessionId", "userId", "clientType", fingerprint
   ```
4. If returned null → **not active**. For now, return 401. (Reuse detection logic added in Step 10.)
5. If returned session → rotation succeeded:
   a. Generate new access token and refresh token.
   b. Hash both.
   c. Create new Session record via `SessionService.createSession`:
      - Same `sessionId` (chain continuity)
      - Same `userId`, `clientType`, `fingerprint`
      - `prevSessionId` = old session `id`
      - Fresh hashes and expiry timestamps
   d. **Deliver tokens:**
      - WEB: set new cookies via `response.cookie(...)`.
      - EXPO: return `{ accessToken, refreshToken, sessionId }`.
6. Return `{ sessionId }` (for WEB).

### Channel verification at refresh

The refresh token source must match the session's `clientType`:
- WEB session → token must be in cookie.
- EXPO session → token must be in Bearer.
Mismatch → 401.

## Specification

1. Add `POST /session/refresh` to `SessionController`, decorated with `@Public()`.
2. Implement `refreshSession(refreshToken: string, source: 'cookie' | 'bearer', response: Response)` in `SessionService` or controller.
3. Use `markAsUsed` from Step 07 for atomic transition.
4. Use `createSession` from Step 07 for new session record.
5. Use cookie option functions from Step 04 for WEB delivery.
6. Determine source from request: check cookie first, then Bearer header.

## Acceptance Criteria
1. `POST /api/session/refresh` with valid active refresh token → 200, new token pair.
2. Old session record: `status = USED`, `refreshUsedAt` set, `noActiveAt` set.
3. New session record: same `sessionId`, `prevSessionId` → old session `id`, `status = ACTIVE`.
4. WEB: new cookies set with correct paths and options.
5. EXPO: tokens in response body.
6. Missing token → 401.
7. Channel mismatch → 401.
8. Already-used token → 401 (basic handling, reuse detection in Step 10).

## Verification Scenario
1. Login via OAuth → get tokens.
2. `POST /api/session/refresh` with refresh token cookie → new cookies set.
3. Use new access token → `GET /api/users` succeeds.
4. Use old access token → 401 (old session is USED, access token lookup fails for ACTIVE).
5. `POST /api/session/refresh` with old refresh token → 401.

## Testing
Integration tests in Step 25.

## Notes
- The atomic `UPDATE ... WHERE status = 'ACTIVE' RETURNING` ensures that even concurrent requests won't both succeed. Only one will match the WHERE clause.
- The `prevSessionId` has a UNIQUE constraint — if somehow two rotations race past the UPDATE, the second INSERT will fail on the unique constraint.
- This step only handles the happy path (active token → rotate) and simple failure (not active → 401). Step 10 adds the reuse detection logic that distinguishes USED vs EXPIRED vs REVOKED.
