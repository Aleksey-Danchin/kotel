# Step 07: Session service and data access layer

## Goal
Create the `SessionModule` with `SessionService` providing data access methods for session lookup, creation (refactored from AuthService if needed), and bulk operations (revoke chain, revoke all user sessions, cleanup expired).

## Motivation
The session service is the central data layer used by the guard (Step 08), refresh endpoint (Step 09), logout (Step 11), reuse detection (Step 10), and admin operations (Step 13). Centralizing it avoids duplication.

## Type
feature, backend

## Affected Area
- `apps/backend/src/session/` — new module (generate via `npx nest generate resource session --no-spec`)
- `apps/backend/src/session/session.module.ts`
- `apps/backend/src/session/session.service.ts`
- `apps/backend/src/app.module.ts` — register SessionModule

## Dependencies
Depends on Step 04 (token utils) and Step 06 (session records exist in DB from token exchange).

## Current Behavior
No session module exists. Session creation is done inline in `AuthService.exchangeCode` (Step 06).

## Expected Behavior

### SessionService methods

```typescript
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  // Look up active session by access token hash — used by guard
  async findByAccessTokenHash(hash: string): Promise<SessionWithUser | null>
    // Prisma findUnique where accessTokenHash + include user

  // Create a new session — used by auth (token exchange) and refresh (rotation)
  async createSession(params: {
    userId: string;
    clientType: ClientType;
    fingerprint: string;
    sessionId: string;
    accessTokenHash: string;
    refreshTokenHash: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    prevSessionId?: string;
  }): Promise<Session>

  // Look up session by refresh token hash — used by refresh endpoint
  async findByRefreshTokenHash(hash: string): Promise<Session | null>

  // Atomic rotation via raw SQL — used by refresh endpoint
  async markAsUsed(refreshTokenHash: string): Promise<Session | null>
    // UPDATE "Session" SET status='USED', "refreshUsedAt"=NOW(), "noActiveAt"=NOW()
    // WHERE "refreshTokenHash"=$1 AND status='ACTIVE'
    // RETURNING id, "sessionId", "userId", "clientType", fingerprint

  // Revoke a specific session chain — used by reuse detection (isolation mode)
  async revokeChain(sessionId: string, userId: string, reason: NoActiveReason): Promise<number>

  // Revoke all active sessions of a user — used by reuse detection (quarantine/lockdown) and logout
  async revokeAllUserSessions(userId: string, reason: NoActiveReason): Promise<number>

  // Revoke a single session by id — used by logout (current device)
  async revokeSession(id: string, reason: NoActiveReason): Promise<void>

  // Mark expired active sessions — used by maintenance cleanup
  async cleanupExpiredSessions(): Promise<number>
    // UPDATE "Session" SET status='EXPIRED', "noActiveAt"=NOW(), "noActiveReason"='EXPIRED'
    // WHERE status='ACTIVE' AND "refreshTokenExpiresAt" < NOW()
}
```

### Type definitions

```typescript
type SessionWithUser = Session & { user: User };
```

Where `Session` and `User` are Prisma generated types.

### Refactoring from Step 06

If session creation was implemented inline in `AuthService.exchangeCode`, refactor it to call `SessionService.createSession`. Import `SessionModule` in `AuthModule` (or make `SessionModule` global).

### Module configuration

`SessionModule` should be `@Global()` since it's used by multiple modules (Auth, Admin, Setup, and the guard).

## Specification

1. Generate NestJS resource: `npx nest generate resource session --no-spec`.
2. Implement all `SessionService` methods listed above.
3. Raw SQL for `markAsUsed` via `prisma.$queryRaw`.
4. Raw SQL for `revokeChain`, `revokeAllUserSessions`, `cleanupExpiredSessions` — can use Prisma `updateMany` or raw SQL.
5. Make `SessionModule` global.
6. Refactor `AuthService` to use `SessionService.createSession` if applicable.
7. Register in `AppModule`.

## Acceptance Criteria
1. `findByAccessTokenHash` returns session with user for valid hash, null otherwise.
2. `findByRefreshTokenHash` returns session for valid hash.
3. `markAsUsed` atomically transitions ACTIVE session to USED, returns the session data. Returns null if not ACTIVE.
4. `revokeChain` revokes all ACTIVE sessions with matching sessionId.
5. `revokeAllUserSessions` revokes all ACTIVE sessions for a user.
6. `revokeSession` revokes a single session by ID.
7. `cleanupExpiredSessions` marks expired sessions.
8. `createSession` creates a valid session record.

## Verification Scenario
1. Create a session via the auth flow (Step 05 + 06).
2. Call `findByAccessTokenHash` with the hash → returns session with user.
3. Call `markAsUsed` → session status changes to USED.
4. Call `markAsUsed` again → returns null (already USED).

## Testing
Unit tests in Step 25.

## Notes
- `markAsUsed` MUST use raw SQL for atomicity. Prisma's `findFirst` + `update` creates a race condition window.
- The `revokeChain` method uses `sessionId` (the chain grouper), NOT the session `id` (primary key).
- Making the module `@Global()` follows the same pattern as the old `SessionModule`.
