# Step 05: Fix channel mismatch — trigger alertness mode

## Goal

When a token arrives via the wrong delivery channel (e.g. a WEB session token arrives as `Authorization: Bearer` instead of a cookie, or an EXPO session token arrives as a cookie instead of Bearer), trigger the alertness mode (the same `isolation / quarantine / lockdown` logic used for refresh token reuse detection), then reject the request with `401`.

## Motivation

`AUTH_DESIGN.md` (and `docs/auth/tokens.md` after step 01) specifies that channel delivery mismatch is a security anomaly that must trigger the alertness mode. The current code simply throws `UnauthorizedException` without running any alertness logic. This means a stolen token delivered via an unexpected channel bypasses reuse detection entirely.

## Type

bugfix, backend

## Affected Area

- `apps/backend/src/session/session.service.ts` — add `handleChannelMismatch(session)` method; update `verifyClientType` private method to call it
- `apps/backend/src/session/session.guard.ts` — update `verifyClientType` to call `sessionService.handleChannelMismatch`
- `apps/prisma/schema/Session.prisma` — add `CHANNEL_MISMATCH` to `NoActiveReason` enum
- `apps/prisma/migrations/` — new migration for the enum change

## Dependencies

None.

## Current Behavior

In `apps/backend/src/session/session.guard.ts`, `verifyClientType` is a private synchronous method:
```ts
private verifyClientType(source: Source, clientType: 'WEB' | 'EXPO'): void {
  if (clientType === 'WEB' && source !== 'cookie') {
    throw new UnauthorizedException();
  }
  if (clientType === 'EXPO' && source !== 'bearer') {
    throw new UnauthorizedException();
  }
}
```
Called on line ~51 (after `this.verifyOrigin`) in `canActivate`.

In `apps/backend/src/session/session.service.ts`, `verifyClientType` is similarly a private synchronous method (line ~247):
```ts
private verifyClientType(source: TokenSource, clientType: ClientType): void {
  if (clientType === 'WEB' && source !== 'cookie') {
    throw new UnauthorizedException();
  }
  if (clientType === 'EXPO' && source !== 'bearer') {
    throw new UnauthorizedException();
  }
}
```
Called on line ~109 in `refreshSession`, before the atomic `markAsUsed` call.

Neither calls `handleReuseDetection` or any alertness logic.

The `NoActiveReason` enum in `apps/prisma/schema/Session.prisma`:
```prisma
enum NoActiveReason {
  LOGOUT_CURRENT
  LOGOUT_ALL
  REUSE_DETECTED
  MANUAL_REVOKE
  LOCKDOWN
  EXPIRED
}
```

## Expected Behavior

1. A new enum value `CHANNEL_MISMATCH` is added to `NoActiveReason` in the Prisma schema and a migration is generated.
2. A new public async method `handleChannelMismatch(session: Session)` is added to `SessionService`. It behaves exactly like `handleReuseDetection` (same switch over alertness modes) but with:
   - A different logger name/message: `Channel mismatch detected`
   - Uses `CHANNEL_MISMATCH` as the `noActiveReason` instead of `REUSE_DETECTED` for `isolation` and `quarantine` modes
   - For `lockdown` mode: uses `LOCKDOWN` as before
3. In `session.guard.ts`, `verifyClientType` becomes an `async` method and calls `await this.sessionService.handleChannelMismatch(session)` before throwing. The `session` object is now threaded through to the call site.
4. In `session.service.ts`, `verifyClientType` becomes an `async` method and calls `await this.handleChannelMismatch(existingSession)` before throwing.

## Specification

### 1. Prisma schema change

In `apps/prisma/schema/Session.prisma`, add `CHANNEL_MISMATCH` to the enum:

```prisma
enum NoActiveReason {
  LOGOUT_CURRENT
  LOGOUT_ALL
  REUSE_DETECTED
  CHANNEL_MISMATCH
  MANUAL_REVOKE
  LOCKDOWN
  EXPIRED
}
```

After editing the schema, generate a new migration:
```bash
docker compose -f infra/compose/dev.yml exec backend npx prisma migrate dev --name add-channel-mismatch-reason
```

This will update the generated Prisma client. Commit the new migration files.

### 2. `SessionService.handleChannelMismatch`

Add a new method to `SessionService` in `session.service.ts`, modelled on `handleReuseDetection`:

```ts
async handleChannelMismatch(session: Session): Promise<void> {
  const mode = getAlertMode();

  this.reuseDetectionLogger.warn(
    `Channel mismatch detected: sessionId=${session.sessionId}, userId=${session.userId}, clientType=${session.clientType}, mode=${mode}`,
  );

  switch (mode) {
    case 'debug':
      return;
    case 'isolation':
      await this.revokeChain(
        session.sessionId,
        session.userId,
        'CHANNEL_MISMATCH',
      );
      return;
    case 'quarantine':
      await this.revokeAllUserSessions(session.userId, 'CHANNEL_MISMATCH');
      return;
    case 'lockdown':
      await this.revokeAllUserSessions(session.userId, 'LOCKDOWN');
      return;
  }
}
```

Note: you may use the existing `reuseDetectionLogger` (rename it to something more general like `securityLogger` if desired) or add a new logger. Keep it consistent with the style in the file.

### 3. Update `SessionService.verifyClientType`

Change the private `verifyClientType` method from synchronous to async, calling `handleChannelMismatch`:

```ts
private async verifyClientType(
  source: TokenSource,
  clientType: ClientType,
  session: Session,
): Promise<void> {
  const mismatch =
    (clientType === 'WEB' && source !== 'cookie') ||
    (clientType === 'EXPO' && source !== 'bearer');

  if (mismatch) {
    await this.handleChannelMismatch(session);
    throw new UnauthorizedException();
  }
}
```

Update the call site in `refreshSession` to pass `existingSession`:
```ts
await this.verifyClientType(source, existingSession.clientType, existingSession);
```

### 4. Update `SessionGuard.verifyClientType`

The guard's `verifyClientType` is private and only has `source` and `clientType`. It needs access to the `session` object and to `sessionService`. Change it to be async and move the call to after session is resolved:

In `canActivate`, after the `this.verifyOrigin(request, session.fingerprint)` call, replace:
```ts
this.verifyClientType(source, session.clientType);
```
with:
```ts
await this.verifyClientType(source, session);
```

Change the private method signature:
```ts
private async verifyClientType(source: Source, session: SessionWithUser): Promise<void> {
  const mismatch =
    (session.clientType === 'WEB' && source !== 'cookie') ||
    (session.clientType === 'EXPO' && source !== 'bearer');

  if (mismatch) {
    await this.sessionService.handleChannelMismatch(session);
    throw new UnauthorizedException();
  }
}
```

Note: `session` here is the full `SessionWithUser` object (which satisfies `Session`) returned by `findByAccessTokenHash`. The guard already imports `SessionService` — no new injection needed.

### 5. Existing tests

- Update `session.guard.spec.ts` and `session.service.spec.ts` to account for the new async behavior.
- Add test cases for channel mismatch: verify that `handleChannelMismatch` is called when source/clientType mismatch, and that `UnauthorizedException` is still thrown after.
- Tests for `handleChannelMismatch` itself (unit): mirror the test structure of `handleReuseDetection` tests in `session.service.spec.ts`.

## Acceptance Criteria

1. `NoActiveReason` enum in Prisma schema includes `CHANNEL_MISMATCH`. A new migration exists.
2. `SessionService.handleChannelMismatch(session)` method exists and follows alertness mode switch.
3. When a WEB session token arrives via Bearer (or EXPO via cookie), `handleChannelMismatch` is called AND the request is rejected with `401`.
4. This check happens both in `SessionGuard.canActivate` (all protected endpoints) and in `SessionService.refreshSession`.
5. In `debug` mode, channel mismatch is logged but sessions are not revoked (existing sessions survive).
6. In `quarantine` mode, all user sessions are revoked with reason `CHANNEL_MISMATCH`.
7. All existing tests continue to pass.
8. New tests for channel mismatch behavior added to `session.guard.spec.ts` and `session.service.spec.ts`.

## Verification Scenario

1. Start the dev stack.
2. Log in as a web user (get an `accessToken` cookie).
3. Using curl or Postman, send a request to `/api/session/status` with `Authorization: Bearer <accessToken>` (instead of cookie).
4. Verify: response is `401`.
5. If `REUSE_DETECTION_MODE=quarantine`, verify in the DB that the session's `status` is `REVOKED` and `noActiveReason` is `CHANNEL_MISMATCH`.
6. If `REUSE_DETECTION_MODE=debug`, verify session is NOT revoked (only a log warning).

## Testing

- Vitest unit tests in `apps/backend/src/session/session.guard.spec.ts` and `session.service.spec.ts`.
- Integration tests in `session.guard.integration.spec.ts` and `session.controller.integration.spec.ts` — add a channel mismatch case.
- Backend tests run against Docker test containers (`infra/compose/test.yml`).

## Notes

- The `revokeChain` and `revokeAllUserSessions` methods accept `NoActiveReason` as their `reason` parameter — use `'CHANNEL_MISMATCH'` there.
- After adding the new enum value, re-run `npx prisma generate` (or the migration will handle this) so the generated TypeScript types include `CHANNEL_MISMATCH`.
- The `SessionWithUser` type (defined in `session.service.ts`) extends `Session & { user: User }` — it satisfies the `Session` type required by `handleChannelMismatch`.
