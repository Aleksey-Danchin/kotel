# Step 10: Reuse detection and alertness modes

## Goal
Enhance the refresh endpoint to detect reuse of already-consumed refresh tokens and respond according to the configured alertness mode (debug, isolation, quarantine, lockdown).

## Motivation
When a used refresh token is presented, it signals that either the token was stolen (attacker uses it after the legitimate client already rotated) or the legitimate client uses it after the attacker rotated. Either way, the chain is compromised. The alertness mode determines the severity of the server's response.

## Type
feature, backend, security

## Affected Area
- `apps/backend/src/session/session.service.ts` — add reuse detection logic
- `apps/backend/src/session/session.controller.ts` — update refresh endpoint to handle reuse
- `apps/backend/src/session/alertness.ts` — new file, alertness mode configuration

## Dependencies
Depends on Step 09 (refresh endpoint with happy path) and Step 07 (revokeChain, revokeAllUserSessions).

## Current Behavior
Step 09 returns a generic 401 when `markAsUsed` returns null. It does not distinguish between USED, EXPIRED, and REVOKED tokens.

## Expected Behavior

### Alertness mode configuration (`alertness.ts`)

```typescript
export type AlertnessMode = 'debug' | 'isolation' | 'quarantine' | 'lockdown';

export function getAlertMode(): AlertnessMode {
  const value = process.env.REUSE_DETECTION_MODE || 'quarantine';
  const valid: AlertnessMode[] = ['debug', 'isolation', 'quarantine', 'lockdown'];
  if (!valid.includes(value as AlertnessMode)) {
    throw new Error(`Invalid REUSE_DETECTION_MODE: ${value}`);
  }
  return value as AlertnessMode;
}
```

### Enhanced refresh failure handling

When `markAsUsed` returns null (token not ACTIVE), the refresh endpoint now:

1. Look up the session by `refreshTokenHash` regardless of status:
   ```typescript
   const session = await this.findByRefreshTokenHash(hash);
   ```

2. If not found → 401 (unknown token).

3. If `status === 'USED'` → **REUSE DETECTED**:
   - Log the incident.
   - Call `handleReuseDetection(session)`.
   - Return 401.

4. If `status === 'EXPIRED'` or `status === 'REVOKED'` → 401.

### Reuse detection handler

```typescript
async handleReuseDetection(session: Session): Promise<void> {
  const mode = getAlertMode();
  const logger = new Logger('ReuseDetection');

  logger.warn(
    `Reuse detected: sessionId=${session.sessionId}, userId=${session.userId}, mode=${mode}`
  );

  switch (mode) {
    case 'debug':
      // Log only, no action on sessions
      break;

    case 'isolation':
      await this.revokeChain(session.sessionId, session.userId, 'REUSE_DETECTED');
      break;

    case 'quarantine':
      await this.revokeAllUserSessions(session.userId, 'REUSE_DETECTED');
      break;

    case 'lockdown':
      await this.revokeAllUserSessions(session.userId, 'LOCKDOWN');
      // Future: block account, notify admin
      break;
  }
}
```

### Environment variable

- `REUSE_DETECTION_MODE` — values: `debug`, `isolation`, `quarantine`, `lockdown`.
- Default: `quarantine`.
- Validated at service initialization.
- Add to `infra/compose/dev.yml` backend service: `REUSE_DETECTION_MODE=quarantine`.

## Specification

1. Create `apps/backend/src/session/alertness.ts` with mode getter.
2. Update the refresh flow in `SessionService` or controller:
   - After `markAsUsed` returns null → look up by hash → check status → handle accordingly.
3. Implement `handleReuseDetection` in `SessionService`.
4. Add `REUSE_DETECTION_MODE` to dev compose env.

## Acceptance Criteria
1. Valid active refresh token → rotation (unchanged from Step 09).
2. Used refresh token (already rotated) → reuse detected.
3. **debug mode**: incident logged, sessions untouched, 401 returned.
4. **isolation mode**: only the compromised chain revoked, 401 returned.
5. **quarantine mode**: all user sessions revoked, 401 returned.
6. **lockdown mode**: all user sessions revoked (account blocking deferred), 401 returned.
7. Expired/revoked refresh token → 401 (no reuse detection triggered).
8. Unknown token → 401.
9. `REUSE_DETECTION_MODE` env variable respected.

## Verification Scenario
1. Login → get tokens.
2. Refresh → get new tokens. Old refresh token now USED.
3. Try old refresh token again → 401, reuse detected.
4. With `REUSE_DETECTION_MODE=quarantine`: check DB — all user sessions revoked.
5. With `REUSE_DETECTION_MODE=debug`: check DB — sessions unchanged, but log contains warning.

## Testing
Unit/integration tests in Step 25.

## Notes
- The distinction between Step 09 and Step 10: Step 09 handles the normal case (rotate or fail), Step 10 handles the security case (WHY did it fail? was it a stolen token?).
- `revokeChain` and `revokeAllUserSessions` are already implemented in Step 07.
- The `lockdown` mode's account blocking (password compromised flag, admin notification) is mentioned in AUTH_DESIGN.md but deferred to future work. For now, lockdown = quarantine + log.
